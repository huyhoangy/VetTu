import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import cookingHistoryApi from '../../api/cookingHistoryApi';

const FILTER_TAGS = [
  { id: 'ALL', label: 'Tất cả 📋' },
  { id: '5_STAR', label: '5 sao tuyệt đỉnh ⭐' },
  { id: 'QUICK', label: 'Dưới 20 phút ⚡' },
  { id: 'RECENT', label: '7 ngày qua 🕒' },
];

const CookingHistoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [historyList, setHistoryList] = useState([]);
  const [stats, setStats] = useState({
    totalCooked: 0,
    totalMinutes: 0,
    averageRating: 5.0,
    mostCookedTitle: '',
    maxCookCount: 0,
    chefBadge: 'Đầu bếp tích cực 🥦',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const currentUserId = user?._id || user?.id;

  const fetchHistory = useCallback(
    async (silent = false) => {
      if (!currentUserId) return;
      try {
        if (!silent) setLoading(true);
        const res = await cookingHistoryApi.getHistory(currentUserId);
        if (res.success && res.data) {
          setHistoryList(res.data);
          if (res.stats) {
            setStats(res.stats);
          }
        }
      } catch (error) {
        console.error('Error fetching cooking history:', error);
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId]
  );

  useFocusEffect(
    useCallback(() => {
      fetchHistory(true);
    }, [fetchHistory])
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(true);
  };

  const handleDeleteEntry = (item) => {
    const dishTitle = item.recipeSnapshot?.title || item.recipe?.title || 'món này';
    Alert.alert(
      'Xóa lịch sử 🗑️',
      `Bạn có chắc chắn muốn xóa nhật ký nấu món "${dishTitle}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistic UI update
              setHistoryList((prev) => prev.filter((h) => h._id !== item._id));
              setStats((prev) => ({
                ...prev,
                totalCooked: Math.max(0, prev.totalCooked - 1),
              }));
              await cookingHistoryApi.deleteHistory(item._id, currentUserId);
            } catch (err) {
              fetchHistory(true);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  // Filtered history
  const filteredHistory = historyList.filter((item) => {
    const title = (item.recipeSnapshot?.title || item.recipe?.title || '').toLowerCase();
    const notes = (item.notes || '').toLowerCase();

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!title.includes(q) && !notes.includes(q)) return false;
    }

    // Filter tags
    if (activeFilter === '5_STAR') {
      return item.rating === 5;
    }
    if (activeFilter === 'QUICK') {
      const prep = item.recipeSnapshot?.prepTimeMinutes || item.recipe?.prepTimeMinutes || 0;
      const cook = item.recipeSnapshot?.cookTimeMinutes || item.recipe?.cookTimeMinutes || 0;
      return prep + cook <= 20;
    }
    if (activeFilter === 'RECENT') {
      const itemDate = new Date(item.cookedAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    }

    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Lịch sử nấu ăn 👨‍🍳</Text>
          <Text style={styles.headerSubtitle}>
            {stats.totalCooked} bữa ăn đã được hoàn thành
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 30 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Content Body */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải lịch sử nấu ăn...</Text>
          </View>
        ) : historyList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="restaurant-outline" size={48} color={Colors.primaryLight} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có món ăn nào được ghi nhận</Text>
            <Text style={styles.emptyDesc}>
              Sau khi bạn nấu xong bất kỳ món ăn nào từ công thức của Vét Tủ, hãy bấm "Hoàn thành nấu ăn" để ghi lại hành trình bếp núc của bạn nhé!
            </Text>

            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate('HomeTab')}
              activeOpacity={0.85}
            >
              <Ionicons name="compass-outline" size={20} color="#FFFFFF" />
              <Text style={styles.exploreBtnText}>Khám phá công thức ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Chef Achievement Banner */}
            <View style={styles.badgeBanner}>
              <View style={styles.badgeBannerLeft}>
                <View style={styles.badgeIconCircle}>
                  <Ionicons name="trophy" size={24} color="#F59E0B" />
                </View>
                <View style={styles.badgeTextCol}>
                  <Text style={styles.badgeLabel}>Danh hiệu đầu bếp</Text>
                  <Text style={styles.badgeValue}>{stats.chefBadge}</Text>
                </View>
              </View>
              <View style={styles.badgePill}>
                <Ionicons name="flame" size={14} color="#EA580C" />
                <Text style={styles.badgePillText}>{stats.totalCooked} món</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="restaurant" size={20} color="#3B82F6" />
                </View>
                <Text style={styles.statNum}>{stats.totalCooked}</Text>
                <Text style={styles.statDesc}>Món đã nấu</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="timer" size={20} color="#10B981" />
                </View>
                <Text style={styles.statNum}>{stats.totalMinutes}</Text>
                <Text style={styles.statDesc}>Phút vào bếp</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#FFFBEB' }]}>
                  <Ionicons name="star" size={20} color="#F59E0B" />
                </View>
                <Text style={styles.statNum}>{stats.averageRating}</Text>
                <Text style={styles.statDesc}>⭐ Đánh giá TB</Text>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm món đã nấu, ghi chú..."
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {FILTER_TAGS.map((tag) => {
                const isSelected = activeFilter === tag.id;
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => setActiveFilter(tag.id)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}
                    >
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filteredHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Không tìm thấy món phù hợp</Text>
                <Text style={styles.emptyDesc}>
                  Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc "Tất cả".
                </Text>
              </View>
            ) : (
              filteredHistory.map((item) => {
                const title = item.recipeSnapshot?.title || item.recipe?.title || 'Món ăn Vét Tủ';
                const imageUrl =
                  item.recipeSnapshot?.imageUrl ||
                  item.recipe?.imageUrl ||
                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800';
                const totalTime =
                  (item.recipeSnapshot?.prepTimeMinutes || item.recipe?.prepTimeMinutes || 0) +
                  (item.recipeSnapshot?.cookTimeMinutes || item.recipe?.cookTimeMinutes || 0);
                const difficulty =
                  item.recipeSnapshot?.difficulty || item.recipe?.difficulty || 'EASY';

                return (
                  <View key={item._id} style={styles.historyCard}>
                    {/* Top Card Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardDateRow}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.cardDate}>{formatDate(item.cookedAt)}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteEntry(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>

                    {/* Main Recipe Info Row */}
                    <TouchableOpacity
                      style={styles.recipeRow}
                      onPress={() => {
                        const targetRecipeId = item.recipe?._id || (typeof item.recipe === 'string' ? item.recipe : item._id);
                        const targetRecipe = item.recipe && typeof item.recipe === 'object' && item.recipe.title ? item.recipe : item.recipeSnapshot;
                        navigation.navigate('RecipeDetail', {
                          recipeId: targetRecipeId,
                          recipe: targetRecipe,
                        });
                      }}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: imageUrl }} style={styles.recipeThumbnail} />
                      <View style={styles.recipeDetails}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {title}
                        </Text>

                        {/* Star Rating Display */}
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={`star-${star}`}
                              name={star <= (item.rating || 5) ? 'star' : 'star-outline'}
                              size={15}
                              color="#F59E0B"
                            />
                          ))}
                          <Text style={styles.ratingLabel}>
                            {item.rating === 5
                              ? 'Tuyệt đỉnh'
                              : item.rating === 4
                              ? 'Rất ngon'
                              : item.rating === 3
                              ? 'Vừa miệng'
                              : 'Cần cải thiện'}
                          </Text>
                        </View>

                        {/* Metadata Badges */}
                        <View style={styles.metaRow}>
                          <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                            <Text style={styles.metaText}>{totalTime} phút</Text>
                          </View>
                          <View style={styles.metaDivider} />
                          <View style={styles.metaItem}>
                            <Ionicons name="people-outline" size={13} color={Colors.textSecondary} />
                            <Text style={styles.metaText}>{item.servingsCooked || 2} người</Text>
                          </View>
                          <View style={styles.metaDivider} />
                          <View style={styles.diffBadge}>
                            <Text style={styles.diffText}>
                              {difficulty === 'EASY'
                                ? 'Dễ'
                                : difficulty === 'MEDIUM'
                                ? 'Vừa'
                                : 'Khó'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Chef Notes / Review Bubble if exists */}
                    {Boolean(item.notes) && (
                      <View style={styles.noteBubble}>
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color="#D97706" />
                        <Text style={styles.noteText}>"{item.notes}"</Text>
                      </View>
                    )}

                    {/* Action CTA: Re-cook this dish */}
                    <TouchableOpacity
                      style={styles.recookBtn}
                      onPress={() => {
                        const targetRecipeId = item.recipe?._id || (typeof item.recipe === 'string' ? item.recipe : item._id);
                        const targetRecipe = item.recipe && typeof item.recipe === 'object' && item.recipe.title ? item.recipe : item.recipeSnapshot;
                        navigation.navigate('RecipeDetail', {
                          recipeId: targetRecipeId,
                          recipe: targetRecipe,
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="reload" size={14} color={Colors.primary} />
                      <Text style={styles.recookBtnText}>Nấu lại món này</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextCol: {},
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  badgeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
    marginTop: 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNum: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  statDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  filterScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  deleteBtn: {
    padding: 2,
  },
  recipeRow: {
    flexDirection: 'row',
    gap: 14,
  },
  recipeThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  recipeDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 20,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginVertical: 4,
  },
  ratingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  metaDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#E5E7EB',
  },
  diffBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  diffText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  noteBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontStyle: 'italic',
    color: '#92400E',
    lineHeight: 16,
  },
  recookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 12,
  },
  recookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default CookingHistoryScreen;
