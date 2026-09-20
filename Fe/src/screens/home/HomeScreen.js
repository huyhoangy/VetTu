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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import recipeApi from '../../api/recipeApi';
import notificationApi from '../../api/notificationApi';
import pantryApi from '../../api/pantryApi';

const KITCHEN_TIPS = [
  'Bọc giấy báo hoặc màng bọc quanh cuống chuối sẽ giúp chuối tươi lâu hơn 4-5 ngày.',
  'Rau thơm hoặc rau xà lách bị héo? Ngâm vào tô nước đá lạnh 10 phút, rau sẽ giòn tươi trở lại!',
  'Cà chua bảo quản ở nhiệt độ phòng cuống hướng xuống sẽ giữ vị ngọt và mọng nước lâu hơn trong tủ lạnh.',
  'Cơm nguội trước khi rang, trộn đều 1 quả trứng sống vào sẽ giúp hạt cơm tơi xốp và vàng óng ả.',
  'Muốn khoai tây không bị mọc mầm, hãy để chung 1 quả táo vào rổ khoai tây.',
  'Nấu canh quá mặn? Thả vài lát khoai tây sống vào đun 5 phút, khoai sẽ hút bớt lượng muối thừa.',
  'Bảo quản hành lá cắt nhỏ trong chai nhựa hoặc hộp kín để ngăn đá, dùng cả tháng vẫn thơm ngon.',
  'Để khử mùi tanh của cá và sườn, hãy ngâm qua nước vo gạo hoặc nước gừng đập dập 10 phút trước khi nấu.',
];

const pickRandomRecipes = (recipes, count = 6) => {
  if (!Array.isArray(recipes) || recipes.length === 0) return [];
  const shuffled = [...recipes].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [allRecipes, setAllRecipes] = useState([]);
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [recipeCount, setRecipeCount] = useState(39);
  const [loading, setLoading] = useState(true);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [pantryStats, setPantryStats] = useState({ total: 0, expiringSoon: 0, expired: 0 });

  const currentUserId = user?._id || user?.id;

  const fetchPantryStats = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await pantryApi.getUserPantry({ userId: currentUserId });
      if (res.success && res.stats) {
        setPantryStats(res.stats);
      }
    } catch (e) {}
  }, [currentUserId]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount(currentUserId);
      if (res.success && res.unreadCount !== undefined) {
        setUnreadNotifs(res.unreadCount);
      }
    } catch (e) {}
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // Daily tip calculation based on day of the year
  const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const [tipIndex, setTipIndex] = useState(() => getDayOfYear() % KITCHEN_TIPS.length);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecipes = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await recipeApi.getAllRecipes();
      const recipeList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (recipeList.length > 0) {
        setAllRecipes(recipeList);
        setFeaturedRecipes(pickRandomRecipes(recipeList, 6));
        if (res?.count) setRecipeCount(res.count);
      }
    } catch (error) {
      console.log('Notice fetching recipes in HomeScreen:', error?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      fetchPantryStats();
      if (allRecipes.length === 0) {
        fetchRecipes();
      }
    }, [fetchUnreadCount, fetchPantryStats, fetchRecipes, allRecipes.length])
  );

  useEffect(() => {
    fetchRecipes();
    fetchPantryStats();
  }, [fetchRecipes, fetchPantryStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecipes(true);
    fetchUnreadCount();
    fetchPantryStats();
  };

  const handleRefreshFeatured = () => {
    if (allRecipes.length > 0) {
      setFeaturedRecipes(pickRandomRecipes(allRecipes, 6));
    } else {
      fetchRecipes();
    }
  };

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % KITCHEN_TIPS.length);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Top User Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: user?.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.greeting}>Xin chào 👋</Text>
              <Text style={styles.userName}>{user?.name || 'Đầu bếp Vét Tủ'}</Text>
            </View>
          </View>

          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => navigation.navigate('Favorites')}
              activeOpacity={0.7}
            >
              <Ionicons name="heart-outline" size={22} color="#EF4444" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={22} color={Colors.text} />
              {unreadNotifs > 0 && <View style={styles.bellBadge} />}
            </TouchableOpacity>

            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={15} color="#F59E0B" />
              <Text style={styles.ratingText}>{user?.rating || '5.0'}</Text>
            </View>
          </View>
        </View>

        {/* Main Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.heroEmoji}>🥦🍳🥘</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>AI Gợi ý chuẩn vị</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Tủ lạnh hôm nay còn gì?</Text>
          <Text style={styles.heroDesc}>
            Chọn nhanh các nguyên liệu bạn đang có để thuật toán gợi ý ngay món ăn phù hợp nhất!
          </Text>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => navigation.navigate('Pantry')}
            activeOpacity={0.85}
          >
            <Text style={styles.heroButtonText}>Bắt đầu Vét Tủ</Text>
            <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Expiring Soon Food Reminder Alert Banner */}
        {(pantryStats.expiringSoon > 0 || pantryStats.expired > 0) && (
          <TouchableOpacity
            style={styles.expiryAlertCard}
            onPress={() => navigation.navigate('PantryManager')}
            activeOpacity={0.85}
          >
            <View style={styles.expiryAlertLeft}>
              <View style={styles.expiryAlertIconBox}>
                <Ionicons name="alarm" size={22} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.expiryAlertTitleRow}>
                  <Text style={styles.expiryAlertTitle}>
                    Tủ lạnh có {pantryStats.expiringSoon + pantryStats.expired} món cần ưu tiên dùng!
                  </Text>
                  <View style={styles.expiryAlertBadge}>
                    <Text style={styles.expiryAlertBadgeText}>Hạn gấp</Text>
                  </View>
                </View>
                <Text style={styles.expiryAlertDesc} numberOfLines={1}>
                  Sắp hết hạn trong 1-2 ngày. Bấm để xem và Vét Tủ nấu ngay!
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
          </TouchableOpacity>
        )}

        {/* Quick Stats Bar */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statBox}
            onPress={() => navigation.navigate('Pantry')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="restaurant" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.statValue}>{recipeCount}+</Text>
              <Text style={styles.statLabel}>Công thức</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statBox}
            onPress={() => navigation.navigate('PantryManager')}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#F0F9FF' }]}>
              <Ionicons name="snow" size={20} color="#0EA5E9" />
            </View>
            <View>
              <Text style={styles.statValue}>{pantryStats.total}</Text>
              <Text style={styles.statLabel}>Món trong tủ</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Weekly Meal Planner Shortcut Card */}
        <TouchableOpacity
          style={styles.mealPlannerBanner}
          onPress={() => navigation.navigate('MealPlanner')}
          activeOpacity={0.85}
        >
          <View style={styles.mealPlannerLeft}>
            <View style={styles.mealPlannerIconBox}>
              <Ionicons name="calendar" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.mealPlannerInfo}>
              <View style={styles.mealPlannerTitleRow}>
                <Text style={styles.mealPlannerTitle}>Lên Thực Đơn Tuần & Đi Chợ</Text>
                <View style={styles.aiTag}>
                  <Ionicons name="sparkles" size={10} color="#FFFFFF" />
                  <Text style={styles.aiTagText}>AI</Text>
                </View>
              </View>
              <Text style={styles.mealPlannerDesc}>
                Lên lịch 7 ngày, gom nguyên liệu đi chợ thông minh
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8B5CF6" />
        </TouchableOpacity>

        {/* Featured / Daily Recipes Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 Gợi ý món ngon hôm nay</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshFeatured}
            activeOpacity={0.7}
          >
            <Ionicons name="shuffle" size={14} color={Colors.primary} />
            <Text style={styles.refreshText}>Đổi món</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : featuredRecipes.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recipeSlider}
          >
            {featuredRecipes.map((recipe) => (
              <TouchableOpacity
                key={recipe._id}
                style={styles.recipeCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('RecipeDetail', {
                    recipe,
                    matchedIngredients: (recipe.ingredients || []).map((i) =>
                      typeof i === 'string' ? i : i.name
                    ),
                    missingIngredients: [],
                  })
                }
              >
                <Image
                  source={{ uri: recipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800' }}
                  style={styles.recipeImg}
                />
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeTitle} numberOfLines={1}>
                    {recipe.title}
                  </Text>
                  <View style={styles.recipeMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} phút
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="flame-outline" size={13} color="#F59E0B" />
                      <Text style={styles.metaText}>{recipe.difficulty === 'EASY' ? 'Dễ' : 'Vừa'}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <TouchableOpacity
            style={styles.emptyFeaturedBox}
            onPress={() => fetchRecipes()}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.emptyFeaturedText}>Chưa tải được gợi ý món. Nhấn để tải lại</Text>
          </TouchableOpacity>
        )}

        {/* Daily Food-Saving Tip Card */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <View style={styles.tipTitleRow}>
              <Ionicons name="bulb" size={18} color="#D97706" />
              <Text style={styles.tipTitle}>Mẹo nhà bếp hôm nay</Text>
            </View>
            <TouchableOpacity onPress={handleNextTip} style={styles.nextTipBtn} activeOpacity={0.7}>
              <Ionicons name="refresh" size={14} color="#B45309" />
              <Text style={styles.nextTipText}>Mẹo khác</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.tipContent}>{KITCHEN_TIPS[tipIndex]}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  greeting: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  ratingText: {
    fontWeight: '700',
    fontSize: 13,
    color: '#92400E',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroEmoji: {
    fontSize: 32,
  },
  heroBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  expiryAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
  },
  expiryAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  expiryAlertIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiryAlertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  expiryAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
    flex: 1,
  },
  expiryAlertBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  expiryAlertBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  expiryAlertDesc: {
    fontSize: 11,
    color: '#B91C1C',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  mealPlannerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EDE9FE',
    borderRadius: 18,
    padding: 14,
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mealPlannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  mealPlannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealPlannerInfo: {
    flex: 1,
  },
  mealPlannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  mealPlannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    gap: 2,
  },
  aiTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  mealPlannerDesc: {
    fontSize: 11.5,
    color: '#6B7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  dailyBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dailyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  recipeSlider: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  recipeCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recipeImg: {
    width: '100%',
    height: 100,
    backgroundColor: '#F3F4F6',
  },
  recipeInfo: {
    padding: 10,
  },
  recipeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyFeaturedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 20,
    gap: 8,
  },
  emptyFeaturedText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tipCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  nextTipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  nextTipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  tipContent: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
});

export default HomeScreen;
