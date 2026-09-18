import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import recipeApi from '../../api/recipeApi';

const QUICK_THEMES = [
  {
    id: 'breakfast',
    title: 'Bữa sáng 5 phút',
    emoji: '🍳',
    color: '#FEF3C7',
    textColor: '#92400E',
    desc: 'Trứng, xúc xích, bánh mì',
  },
  {
    id: 'eatclean',
    title: 'Eat Clean Giữ Dáng',
    emoji: '🥗',
    color: '#ECFDF5',
    textColor: '#065F46',
    desc: 'Ức gà, bông cải, rau củ',
  },
  {
    id: 'midnight',
    title: 'Mì đêm cú đêm',
    emoji: '🍜',
    color: '#FEE2E2',
    textColor: '#991B1B',
    desc: 'Mì tôm kim chi phô mai',
  },
  {
    id: 'vegetarian',
    title: 'Món Chay Thanh Tịnh',
    emoji: '🌿',
    color: '#F3E8FF',
    textColor: '#6B21A8',
    desc: 'Đậu hũ, nấm xì dầu',
  },
];

const DAILY_TIPS = [
  'Bọc giấy báo hoặc màng bọc quanh cuống chuối sẽ giúp chuối tươi lâu hơn 4-5 ngày.',
  'Rau xà lách hoặc rau thơm bị héo? Ngâm vào tô nước đá 10 phút, rau sẽ giòn tươi trở lại ngay!',
  'Cà chua bảo quản ở nhiệt độ phòng cuống hướng xuống sẽ giữ được vị ngọt và thơm lâu hơn trong tủ lạnh.',
  'Cơm nguội trước khi rang, trộn đều 1 quả trứng sống vào sẽ giúp hạt cơm tơi vàng óng ả.',
];

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [recipeCount, setRecipeCount] = useState(39);
  const [loading, setLoading] = useState(true);

  // Pick a random tip
  const [dailyTip] = useState(() => DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const res = await recipeApi.getAllRecipes();
        if (res.success && res.data) {
          setFeaturedRecipes(res.data.slice(0, 6));
          if (res.count) setRecipeCount(res.count);
        }
      } catch (error) {
        // Silent fallback
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

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
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={15} color="#F59E0B" />
            <Text style={styles.ratingText}>{user?.rating || '5.0'}</Text>
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

        {/* Quick Cooking Themes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚡ Nấu nhanh theo chủ đề</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Pantry')}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.themesRow}
        >
          {QUICK_THEMES.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[styles.themeCard, { backgroundColor: theme.color }]}
              onPress={() => navigation.navigate('Pantry')}
              activeOpacity={0.8}
            >
              <Text style={styles.themeEmoji}>{theme.emoji}</Text>
              <Text style={[styles.themeTitle, { color: theme.textColor }]}>{theme.title}</Text>
              <Text style={styles.themeDesc} numberOfLines={1}>
                {theme.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured / Today's Recipes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔥 Gợi ý món ngon hôm nay</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Pantry')}>
            <Text style={styles.seeAllText}>Vét tủ ngay</Text>
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
                    matchedIngredients: recipe.ingredients.map((i) => i.name),
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

        {/* Daily Food-Saving Tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb" size={20} color="#D97706" />
            <Text style={styles.tipTitle}>Mẹo nhà bếp hôm nay</Text>
          </View>
          <Text style={styles.tipContent}>{dailyTip}</Text>
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  themesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  themeCard: {
    width: 140,
    padding: 14,
    borderRadius: 18,
  },
  themeEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  themeTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  themeDesc: {
    fontSize: 11,
    color: '#6B7280',
  },
  recipeSlider: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  tipContent: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
});

export default HomeScreen;
