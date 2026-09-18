import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import recipeApi from '../../api/recipeApi';
import cookingHistoryApi from '../../api/cookingHistoryApi';

const RATING_LABELS = {
  1: 'Cần cải thiện 😐',
  2: 'Tạm được 🙂',
  3: 'Vừa miệng 😋',
  4: 'Rất ngon 😍',
  5: 'Tuyệt đỉnh 🌟👨‍🍳',
};

const RecipeDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { recipeId, recipe: initialRecipe } = route.params || {};

  const currentUserId = user?._id || user?.id;

  const isPartialRecipe =
    !initialRecipe ||
    !Array.isArray(initialRecipe.instructions) ||
    initialRecipe.instructions.length === 0 ||
    !Array.isArray(initialRecipe.ingredients) ||
    initialRecipe.ingredients.length === 0;

  const [recipe, setRecipe] = useState(initialRecipe || null);
  const [loading, setLoading] = useState(isPartialRecipe);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);

  // Cook Finish Modal State
  const [showCookModal, setShowCookModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [servingsCooked, setServingsCooked] = useState(initialRecipe?.servings || 2);
  const [savingHistory, setSavingHistory] = useState(false);

  // Check initial favorite status
  useEffect(() => {
    const targetId = recipe?._id || recipeId;
    if (user?.favorites && targetId) {
      const favorited = user.favorites.some(
        (fav) => (typeof fav === 'string' ? fav : fav?._id) === targetId
      );
      setIsFavorite(favorited);
    }
  }, [user?.favorites, recipe?._id, recipeId]);

  // Fetch user favorites list to ensure accurate favorite state
  useEffect(() => {
    if (currentUserId) {
      recipeApi.getFavorites(currentUserId).then((res) => {
        if (res.success && res.data) {
          const targetId = recipe?._id || recipeId;
          const favorited = res.data.some((fav) => fav._id === targetId);
          setIsFavorite(favorited);
        }
      }).catch(() => {});
    }
  }, [currentUserId, recipe?._id, recipeId]);

  // Always fetch full details if recipe object is missing ingredients or instructions
  useEffect(() => {
    const targetId = recipe?._id || initialRecipe?._id || recipeId;
    const targetTitle = recipe?.title || initialRecipe?.title;

    if (isPartialRecipe && (targetId || targetTitle)) {
      const fetchDetail = async () => {
        try {
          setLoading(true);
          const response = await recipeApi.getRecipeById(targetId || 'lookup', targetTitle || '');
          if (response.success && response.data) {
            setRecipe(response.data);
            if (response.data.servings && !servingsCooked) {
              setServingsCooked(response.data.servings);
            }
          }
        } catch (error) {
          Alert.alert('Lỗi', 'Không thể tải chi tiết món ăn');
        } finally {
          setLoading(false);
        }
      };

      fetchDetail();
    }
  }, [recipeId, initialRecipe, isPartialRecipe]);

  const handleToggleFavorite = async () => {
    const targetId = recipe?._id || recipeId;
    if (!targetId || !currentUserId) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để lưu món ăn yêu thích');
      return;
    }

    if (togglingFav) return;

    // Optimistic toggle
    const nextState = !isFavorite;
    setIsFavorite(nextState);
    setTogglingFav(true);

    try {
      const res = await recipeApi.toggleFavorite(targetId, currentUserId, recipe?.title);
      if (res.success) {
        if (recipe) {
          setRecipe((prev) => ({
            ...prev,
            _id: res.recipeId || prev._id,
            likesCount: res.likesCount !== undefined ? res.likesCount : prev.likesCount,
          }));
        }
      } else {
        // Revert on failure
        setIsFavorite(!nextState);
      }
    } catch (err) {
      setIsFavorite(!nextState);
      Alert.alert('Lỗi', 'Không thể cập nhật danh sách yêu thích');
    } finally {
      setTogglingFav(false);
    }
  };

  const handleSaveCookingHistory = async () => {
    const targetId = recipe?._id || recipeId;
    if (!currentUserId) {
      setShowCookModal(false);
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để ghi lại lịch sử nấu ăn');
      return;
    }

    try {
      setSavingHistory(true);
      const res = await cookingHistoryApi.recordCooked({
        userId: currentUserId,
        recipeId: targetId,
        title: recipe?.title,
        rating,
        notes,
        servingsCooked,
      });

      setShowCookModal(false);

      Alert.alert(
        'Tuyệt vời! 🎉👨‍🍳',
        `Món "${recipe?.title}" đã được lưu vào Lịch sử nấu ăn của bạn! Chúc bạn bữa ăn thật ngon miệng.`,
        [
          {
            text: 'Về trang chủ',
            onPress: () => navigation.navigate('HomeTab'),
          },
          {
            text: 'Xem Nhật ký 📖',
            onPress: () => navigation.navigate('CookingHistory'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu nhật ký nấu ăn. Vui lòng thử lại sau.');
    } finally {
      setSavingHistory(false);
    }
  };

  const toggleStep = (stepNumber) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNumber) ? prev.filter((s) => s !== stepNumber) : [...prev, stepNumber]
    );
  };

  const handleAskNeighbor = (ingredientName) => {
    Alert.alert(
      'Tìm quanh xóm 🏡',
      `Bạn đang thiếu "${ingredientName}"? Khám phá ngay xem có hàng xóm nào quanh bạn đang chia sẻ không nhé!`,
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: 'Tìm ngay',
          onPress: () => {
            navigation.navigate('MainTabs', {
              screen: 'Community',
              params: {
                screen: 'CommunityMain',
                params: { initialSearch: ingredientName },
              },
            });
          },
        },
      ]
    );
  };

  if (loading || !recipe) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang tải công thức...</Text>
      </View>
    );
  }

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 100 + Math.max(insets.bottom, 16) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image Section */}
        <View style={styles.heroSection}>
          <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} />
          <View style={[styles.navOverlay, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color="#1F2937" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.circleBtn, isFavorite && styles.circleBtnActive]}
              onPress={handleToggleFavorite}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? '#EF4444' : '#1F2937'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recipe Summary Info */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{recipe.title}</Text>
          <Text style={styles.description}>{recipe.description}</Text>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="timer-outline" size={22} color={Colors.primary} />
              <Text style={styles.statLabel}>Tổng thời gian</Text>
              <Text style={styles.statValue}>{totalTime} phút</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="restaurant-outline" size={22} color={Colors.secondary} />
              <Text style={styles.statLabel}>Độ khó</Text>
              <Text style={styles.statValue}>
                {recipe.difficulty === 'EASY' ? 'Dễ' : recipe.difficulty === 'MEDIUM' ? 'Vừa' : 'Khó'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={22} color="#10B981" />
              <Text style={styles.statLabel}>Khẩu phần</Text>
              <Text style={styles.statValue}>{recipe.servings || 2} người</Text>
            </View>
          </View>

          {/* Ingredients Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nguyên liệu cần có</Text>
            <Text style={styles.sectionSubtitle}>
              {recipe.ingredients?.length || 0} nguyên liệu
            </Text>
          </View>

          <View style={styles.ingredientsList}>
            {recipe.ingredients?.map((ing, idx) => {
              // Check if matched from route params
              const isMatched = recipe.matchedIngredients
                ? recipe.matchedIngredients.some((m) => m.name.toLowerCase() === ing.name.toLowerCase())
                : true;

              return (
                <View
                  key={`ing-${idx}`}
                  style={[
                    styles.ingredientRow,
                    isMatched ? styles.rowMatched : styles.rowMissing,
                  ]}
                >
                  <View style={styles.ingLeft}>
                    <Ionicons
                      name={isMatched ? 'checkmark-circle' : 'alert-circle'}
                      size={20}
                      color={isMatched ? '#059669' : '#EA580C'}
                    />
                    <View style={styles.ingTextCol}>
                      <Text style={styles.ingName}>{ing.name}</Text>
                      <Text style={styles.ingStatus}>
                        {isMatched ? 'Đã có trong tủ' : 'Còn thiếu trong tủ'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ingRight}>
                    <Text style={styles.ingQuantity}>
                      {ing.quantity} {ing.unit}
                    </Text>
                    {!isMatched && (
                      <TouchableOpacity
                        style={styles.askNeighborBtn}
                        onPress={() => handleAskNeighbor(ing.name)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="people" size={12} color="#FFFFFF" />
                        <Text style={styles.askNeighborText}>Xin xóm</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Instructions Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Các bước thực hiện</Text>
            <Text style={styles.sectionSubtitle}>
              {completedSteps.length}/{recipe.instructions?.length || 0} bước
            </Text>
          </View>

          <View style={styles.stepsList}>
            {recipe.instructions?.map((step) => {
              const isDone = completedSteps.includes(step.stepNumber);

              return (
                <TouchableOpacity
                  key={`step-${step.stepNumber}`}
                  style={[styles.stepCard, isDone && styles.stepCardDone]}
                  onPress={() => toggleStep(step.stepNumber)}
                  activeOpacity={0.85}
                >
                  <View style={styles.stepHeaderRow}>
                    <View style={[styles.stepNumberBadge, isDone && styles.stepBadgeDone]}>
                      {isDone ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                      )}
                    </View>
                    <Text style={[styles.stepInstruction, isDone && styles.stepInstructionDone]}>
                      {step.instruction}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Cook Action */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 12 },
        ]}
      >
        <TouchableOpacity
          style={styles.doneCookingBtn}
          onPress={() => setShowCookModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          <Text style={styles.doneCookingText}>Hoàn thành nấu ăn 🎉</Text>
        </TouchableOpacity>
      </View>

      {/* Cook Completion Modal Sheet */}
      <Modal
        visible={showCookModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCookModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Top Indicator */}
            <View style={styles.modalDragHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.celebrateEmojiBox}>
                <Text style={styles.celebrateEmoji}>👩‍🍳✨</Text>
              </View>
              <Text style={styles.modalTitle}>Món ăn đã sẵn sàng!</Text>
              <Text style={styles.modalSub}>{recipe.title}</Text>
            </View>

            {/* Star Rating Selector */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionLabel}>Bạn cảm thấy món ăn thế nào?</Text>
              <View style={styles.starPickerRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={`pick-star-${star}`}
                    onPress={() => setRating(star)}
                    activeOpacity={0.7}
                    style={styles.starTouch}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={32}
                      color="#F59E0B"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingLabelText}>{RATING_LABELS[rating]}</Text>
            </View>

            {/* Servings Counter */}
            <View style={styles.servingsPickerRow}>
              <Text style={styles.servingsPickerLabel}>Khẩu phần đã nấu:</Text>
              <View style={styles.counterControl}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setServingsCooked((p) => Math.max(1, p - 1))}
                >
                  <Ionicons name="remove" size={16} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{servingsCooked} người</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setServingsCooked((p) => p + 1)}
                >
                  <Ionicons name="add" size={16} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Cooking Notes Input */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionLabel}>Ghi chú / Mẹo nấu của bạn (tùy chọn):</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Ví dụ: Giảm bớt chút ớt, xào lửa to sẽ giòn ngon hơn..."
                placeholderTextColor={Colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveHistoryBtn}
                onPress={handleSaveCookingHistory}
                disabled={savingHistory}
                activeOpacity={0.85}
              >
                {savingHistory ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="bookmark" size={18} color="#FFFFFF" />
                    <Text style={styles.saveHistoryText}>Lưu vào Nhật ký nấu ăn</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => {
                  setShowCookModal(false);
                  navigation.navigate('HomeTab');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.skipBtnText}>Bỏ qua & Về trang chủ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF9F6',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 10,
  },
  heroSection: {
    width: '100%',
    height: 280,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  navOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FAF9F6',
    marginTop: -24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  ingredientsList: {
    gap: 10,
    marginBottom: 28,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rowMatched: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  rowMissing: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  ingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ingTextCol: {
    flex: 1,
  },
  ingName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  ingStatus: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ingRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  ingQuantity: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  askNeighborBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  askNeighborText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  stepsList: {
    gap: 12,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepCardDone: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.7,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepBadgeDone: {
    backgroundColor: '#10B981',
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  stepInstruction: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  stepInstructionDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  doneCookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  doneCookingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  celebrateEmojiBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  celebrateEmoji: {
    fontSize: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  modalSub: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 14,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  starPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  starTouch: {
    padding: 4,
  },
  ratingLabelText: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 4,
  },
  servingsPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  servingsPickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  counterControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 10,
  },
  counterBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    fontSize: 13,
    color: Colors.text,
    minHeight: 70,
  },
  modalActions: {
    gap: 10,
    marginTop: 6,
  },
  saveHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveHistoryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default RecipeDetailScreen;
