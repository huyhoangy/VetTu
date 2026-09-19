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

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [allRecipes, setAllRecipes] = useState([]);
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [recipeCount, setRecipeCount] = useState(39);
  const [loading, setLoading] = useState(true);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const currentUserId = user?._id || user?.id;

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

  const [refreshing, setRefreshing] = useState(false);

  const fetchRecipes = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await recipeApi.getAllRecipes();
      if (res.success && res.data && res.data.length > 0) {
        setAllRecipes(res.data);
        setFeaturedRecipes(pickRandomRecipes(res.data, 6));
        if (res.count) setRecipeCount(res.count);
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
      if (allRecipes.length === 0) {
        fetchRecipes();
      }
    }, [fetchUnreadCount, fetchRecipes, allRecipes.length])
  );

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecipes(true);
    fetchUnreadCount();
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

        {/* Quick Stats Bar */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="restaurant" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.statValue}>{recipeCount}+</Text>
              <Text style={styles.statLabel}>Công thức</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="people" size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.statValue}>45</Text>
              <Text style={styles.statLabel}>Hàng xóm chia sẻ</Text>
            </View>
          </View>
        </View>

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
        ) : (
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
