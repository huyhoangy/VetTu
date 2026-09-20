import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import mealPlanApi from '../../api/mealPlanApi';
import SelectRecipeModal from '../../components/mealplan/SelectRecipeModal';
import WeeklyGroceryModal from '../../components/mealplan/WeeklyGroceryModal';

const DAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const SHORT_DAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const MEAL_SLOTS = [
  {
    key: 'breakfast',
    title: 'Bữa Sáng',
    emoji: '🍳',
    icon: 'sunny-outline',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  {
    key: 'lunch',
    title: 'Bữa Trưa',
    emoji: '🍱',
    icon: 'restaurant-outline',
    color: '#0EA5E9',
    bgColor: '#F0F9FF',
  },
  {
    key: 'dinner',
    title: 'Bữa Tối',
    emoji: '🍲',
    icon: 'moon-outline',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
  },
];

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const formatDateYMD = (date) => {
  return date.toISOString().split('T')[0];
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

const MealPlannerScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [currentMonday, setCurrentMonday] = useState(getMonday(new Date()));
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1; // 0 = Mon -> 6 = Sun
  });

  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Modals state
  const [selectModalVisible, setSelectModalVisible] = useState(false);
  const [targetSlot, setTargetSlot] = useState(null);
  const [groceryModalVisible, setGroceryModalVisible] = useState(false);

  const weekStartStr = formatDateYMD(currentMonday);

  // Compute end of week date
  const sundayDate = new Date(currentMonday);
  sundayDate.setDate(currentMonday.getDate() + 6);
  const weekEndDisplay = `${formatDisplayDate(weekStartStr)} - ${formatDisplayDate(formatDateYMD(sundayDate))}`;

  const fetchMealPlan = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await mealPlanApi.getWeeklyPlan({ weekStart: weekStartStr });
      if (res && res.data) {
        setPlanData(res.data);
      }
    } catch (err) {
      console.log('Error loading meal plan:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekStartStr]);

  useEffect(() => {
    fetchMealPlan();
  }, [fetchMealPlan]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMealPlan(true);
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const handleResetToCurrentWeek = () => {
    const thisMon = getMonday(new Date());
    setCurrentMonday(thisMon);
    const today = new Date().getDay();
    setSelectedDayIndex(today === 0 ? 6 : today - 1);
  };

  // Open recipe selection modal for a specific slot
  const handleOpenAddMeal = (slotKey, slotTitle) => {
    setTargetSlot({ slot: slotKey, title: slotTitle });
    setSelectModalVisible(true);
  };

  // Select recipe from DB
  const handleSelectRecipe = async (recipe) => {
    if (!targetSlot) return;
    try {
      setLoading(true);
      const res = await mealPlanApi.updateMealSlot({
        weekStartDate: weekStartStr,
        dayIndex: selectedDayIndex,
        slot: targetSlot.slot,
        recipeId: recipe._id,
        customDishName: recipe.title,
        dishImage: recipe.imageUrl,
        note: `Thời gian nấu: ${(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} phút`,
      });
      if (res && res.data) {
        setPlanData(res.data);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật bữa ăn. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  // Custom dish input
  const handleSelectCustomDish = async ({ customDishName, note }) => {
    if (!targetSlot) return;
    try {
      setLoading(true);
      const res = await mealPlanApi.updateMealSlot({
        weekStartDate: weekStartStr,
        dayIndex: selectedDayIndex,
        slot: targetSlot.slot,
        customDishName,
        note,
      });
      if (res && res.data) {
        setPlanData(res.data);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể thêm món. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  // Delete meal from slot
  const handleDeleteMeal = (meal) => {
    Alert.alert(
      'Xóa món',
      `Bạn có chắc chắn muốn xóa "${meal.customDishName || 'món này'}" khỏi thực đơn?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await mealPlanApi.removeMealSlot({
                weekStartDate: weekStartStr,
                dayIndex: selectedDayIndex,
                mealId: meal._id,
              });
              if (res && res.data) {
                setPlanData(res.data);
              }
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể xóa món ăn.');
            }
          },
        },
      ]
    );
  };

  // Toggle completed
  const handleToggleComplete = async (meal) => {
    try {
      const res = await mealPlanApi.toggleMealSlot({
        weekStartDate: weekStartStr,
        dayIndex: selectedDayIndex,
        mealId: meal._id,
      });
      if (res && res.data) {
        setPlanData(res.data);
      }
    } catch (err) {
      // quiet fail
    }
  };

  // AI Suggest 7-day Meal Plan
  const handleAiSuggest = () => {
    Alert.alert(
      '✨ AI Gợi ý thực đơn tuần',
      'Gemini AI sẽ tự động phân tích thực phẩm trong tủ lạnh của bạn và lên thực đơn trọn vẹn 7 ngày (Sáng, Trưa, Tối) cân bằng dinh dưỡng và tiết kiệm nhất. Bạn có muốn tạo mới không?',
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: 'Tạo thực đơn ngay',
          onPress: async () => {
            try {
              setAiGenerating(true);
              const res = await mealPlanApi.aiSuggestWeeklyPlan({
                weekStartDate: weekStartStr,
              });
              if (res && res.data) {
                setPlanData(res.data);
                Alert.alert('Thành công! 🎉', 'AI đã hoàn thiện thực đơn tuần cho bạn.');
              }
            } catch (err) {
              Alert.alert('Lỗi AI', err.message || 'Không thể tạo thực đơn tuần từ AI.');
            } finally {
              setAiGenerating(false);
            }
          },
        },
      ]
    );
  };

  // Get active day meals
  const selectedDayObj = planData?.days?.find((d) => d.dayIndex === selectedDayIndex);
  const selectedDayMeals = selectedDayObj?.meals || [];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#1E293B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>📅 Lên Thực Đơn Tuần</Text>
            <Text style={styles.headerSubtitle}>Ăn ngon, đủ chất, tiết kiệm</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtnAi}
            onPress={handleAiSuggest}
            disabled={aiGenerating}
            activeOpacity={0.8}
          >
            {aiGenerating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnAiText}>AI gợi ý</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnCart}
            onPress={() => setGroceryModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cart-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Week Switcher Bar */}
        <View style={styles.weekSwitcher}>
          <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevWeek} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color="#334155" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.weekTitleBox}
            onPress={handleResetToCurrentWeek}
            activeOpacity={0.7}
          >
            <Text style={styles.weekText}>{weekEndDisplay}</Text>
            <Text style={styles.thisWeekLabel}>
              {weekStartStr === formatDateYMD(getMonday(new Date()))
                ? '• Tuần này'
                : '• Bấm về tuần này'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.arrowBtn} onPress={handleNextWeek} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={20} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* 7-Day Horizontal Selector */}
        <View style={styles.daysRow}>
          {SHORT_DAY_NAMES.map((shortName, idx) => {
            const isSelected = selectedDayIndex === idx;
            const dayObj = planData?.days?.find((d) => d.dayIndex === idx);
            const mealsCount = dayObj?.meals?.length || 0;

            const dayDate = new Date(currentMonday);
            dayDate.setDate(currentMonday.getDate() + idx);
            const dateNum = dayDate.getDate();

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.dayTab, isSelected && styles.dayTabSelected]}
                onPress={() => setSelectedDayIndex(idx)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayNameText, isSelected && styles.dayNameTextSelected]}>
                  {shortName}
                </Text>
                <Text style={[styles.dayDateText, isSelected && styles.dayDateTextSelected]}>
                  {dateNum}
                </Text>

                {mealsCount > 0 && (
                  <View
                    style={[
                      styles.mealCountDot,
                      isSelected && { backgroundColor: '#FFFFFF' },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Info Title */}
        <View style={styles.selectedDayHeader}>
          <Text style={styles.selectedDayTitle}>
            {DAY_NAMES[selectedDayIndex]}, {selectedDayObj?.date ? formatDisplayDate(selectedDayObj.date) : ''}
          </Text>
          <Text style={styles.selectedDayCount}>
            {selectedDayMeals.length}/3 bữa đã lên lịch
          </Text>
        </View>

        {/* Meal Slots List */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải thực đơn...</Text>
          </View>
        ) : (
          <View style={styles.slotsList}>
            {MEAL_SLOTS.map((slotInfo) => {
              const assignedMeal = selectedDayMeals.find((m) => m.slot === slotInfo.key);

              return (
                <View key={slotInfo.key} style={styles.slotCard}>
                  {/* Slot Header */}
                  <View style={styles.slotHeader}>
                    <View style={styles.slotHeaderLeft}>
                      <View style={[styles.slotBadge, { backgroundColor: slotInfo.bgColor }]}>
                        <Ionicons name={slotInfo.icon} size={16} color={slotInfo.color} />
                      </View>
                      <Text style={styles.slotTitle}>
                        {slotInfo.emoji} {slotInfo.title}
                      </Text>
                    </View>

                    {!assignedMeal ? (
                      <TouchableOpacity
                        style={styles.addSlotBtn}
                        onPress={() => handleOpenAddMeal(slotInfo.key, slotInfo.title)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={18} color={Colors.primary} />
                        <Text style={styles.addSlotBtnText}>Thêm món</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.changeSlotBtn}
                        onPress={() => handleOpenAddMeal(slotInfo.key, slotInfo.title)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="swap-horizontal" size={16} color="#64748B" />
                        <Text style={styles.changeSlotText}>Đổi món</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Meal Content */}
                  {assignedMeal ? (
                    <View
                      style={[
                        styles.mealContent,
                        assignedMeal.completed && styles.mealContentCompleted,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.mealCheckBtn}
                        onPress={() => handleToggleComplete(assignedMeal)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={assignedMeal.completed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={24}
                          color={assignedMeal.completed ? '#10B981' : '#CBD5E1'}
                        />
                      </TouchableOpacity>

                      {assignedMeal.dishImage ? (
                        <Image
                          source={{ uri: assignedMeal.dishImage }}
                          style={styles.dishImage}
                        />
                      ) : (
                        <View style={styles.dishImageFallback}>
                          <Text style={{ fontSize: 24 }}>{slotInfo.emoji}</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.dishDetails}
                        onPress={() => {
                          if (assignedMeal.recipe) {
                            navigation.navigate('RecipeDetail', {
                              recipeId: assignedMeal.recipe._id || assignedMeal.recipe,
                            });
                          }
                        }}
                        activeOpacity={assignedMeal.recipe ? 0.7 : 1}
                      >
                        <Text
                          style={[
                            styles.dishName,
                            assignedMeal.completed && styles.dishNameCompleted,
                          ]}
                          numberOfLines={1}
                        >
                          {assignedMeal.customDishName || 'Món ngon'}
                        </Text>
                        {assignedMeal.note ? (
                          <Text style={styles.dishNote} numberOfLines={1}>
                            {assignedMeal.note}
                          </Text>
                        ) : null}
                        {assignedMeal.recipe && (
                          <View style={styles.recipeTag}>
                            <Ionicons name="book-outline" size={12} color={Colors.primary} />
                            <Text style={styles.recipeTagText}>Xem công thức</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteMealBtn}
                        onPress={() => handleDeleteMeal(assignedMeal)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.emptySlotBox}
                      onPress={() => handleOpenAddMeal(slotInfo.key, slotInfo.title)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={24} color="#94A3B8" />
                      <Text style={styles.emptySlotText}>Chưa lên món cho {slotInfo.title}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Shopping Banner Callout */}
        <TouchableOpacity
          style={styles.groceryCallout}
          onPress={() => setGroceryModalVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.groceryCalloutLeft}>
            <View style={styles.groceryCalloutIcon}>
              <Ionicons name="cart" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.groceryCalloutInfo}>
              <Text style={styles.groceryCalloutTitle}>Danh sách đi chợ tuần</Text>
              <Text style={styles.groceryCalloutDesc}>
                Tự động gom nguyên liệu cần mua và so sánh với đồ trong tủ lạnh
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#0F172A" />
        </TouchableOpacity>
      </ScrollView>

      {/* Recipe Selection Modal */}
      <SelectRecipeModal
        visible={selectModalVisible}
        onClose={() => setSelectModalVisible(false)}
        slotTitle={targetSlot?.title || 'Bữa ăn'}
        onSelectRecipe={handleSelectRecipe}
        onSelectCustomDish={handleSelectCustomDish}
      />

      {/* Weekly Grocery Checklist Modal */}
      <WeeklyGroceryModal
        visible={groceryModalVisible}
        onClose={() => setGroceryModalVisible(false)}
        weekStartDate={weekStartStr}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnAi: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 5,
  },
  actionBtnAiText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnCart: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  weekSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  arrowBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  weekTitleBox: {
    alignItems: 'center',
  },
  weekText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  thisWeekLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6,
  },
  dayTab: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  dayTabSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  dayNameTextSelected: {
    color: '#FFFFFF',
  },
  dayDateText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  dayDateTextSelected: {
    color: '#FFFFFF',
  },
  mealCountDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectedDayCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  slotsList: {
    gap: 12,
    marginBottom: 18,
  },
  slotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  slotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotBadge: {
    padding: 6,
    borderRadius: 8,
  },
  slotTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addSlotBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  changeSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  changeSlotText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  mealContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  mealContentCompleted: {
    backgroundColor: '#F0FDF4',
  },
  mealCheckBtn: {
    padding: 2,
  },
  dishImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  dishImageFallback: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dishDetails: {
    flex: 1,
  },
  dishName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  dishNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  dishNote: {
    fontSize: 12,
    color: '#64748B',
  },
  recipeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  recipeTagText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  deleteMealBtn: {
    padding: 6,
  },
  emptySlotBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 18,
    gap: 6,
    backgroundColor: '#F8FAFC',
  },
  emptySlotText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  groceryCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  groceryCalloutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 8,
  },
  groceryCalloutIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groceryCalloutInfo: {
    flex: 1,
  },
  groceryCalloutTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  groceryCalloutDesc: {
    fontSize: 12,
    color: '#64748B',
  },
});

export default MealPlannerScreen;
