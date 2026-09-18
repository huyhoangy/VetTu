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
import recipeApi from '../../api/recipeApi';

const FILTER_TAGS = [
  { id: 'ALL', label: 'Tất cả 🌟' },
  { id: 'QUICK', label: 'Dưới 15 phút ⚡' },
  { id: 'EASY', label: 'Dễ làm 🍳' },
  { id: 'STOVE', label: 'Bếp nấu 🍲' },
  { id: 'AIR_FRYER', label: 'Nồi chiên ♨️' },
];

const FavoritesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  const currentUserId = user?._id || user?.id;

  const fetchFavorites = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await recipeApi.getFavorites(currentUserId);
      if (res.success && res.data) {
        setFavorites(res.data);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchFavorites(true);
    }, [fetchFavorites])
  );

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites(true);
  };

  const handleRemoveFavorite = (recipe) => {
    Alert.alert(
      'Bỏ yêu thích 💔',
      `Bạn có muốn xóa món "${recipe.title}" khỏi danh sách yêu thích không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistic UI update
              setFavorites((prev) => prev.filter((r) => r._id !== recipe._id));
              await recipeApi.toggleFavorite(recipe._id, currentUserId);
            } catch (err) {
              fetchFavorites(true);
            }
          },
        },
      ]
    );
  };

  // Filter & search logic
  const filteredFavorites = favorites.filter((recipe) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = recipe.title?.toLowerCase().includes(q);
      const matchDesc = recipe.description?.toLowerCase().includes(q);
      const matchKeywords = recipe.ingredientKeywords?.some((k) => k.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchKeywords) return false;
    }

    // Filter tags
    if (activeFilter === 'QUICK') {
      const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
      return totalTime <= 15;
    }
    if (activeFilter === 'EASY') {
      return recipe.difficulty === 'EASY';
    }
    if (activeFilter === 'STOVE') {
      return recipe.appliance === 'STOVE' || !recipe.appliance || recipe.appliance === 'ALL';
    }
    if (activeFilter === 'AIR_FRYER') {
      return recipe.appliance === 'AIR_FRYER' || recipe.appliance === 'AIRFRYER';
    }

    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Món ăn yêu thích ❤️</Text>
          <Text style={styles.headerSubtitle}>
            {favorites.length} món đã lưu vào sổ tay
          </Text>
        </View>

        <View style={styles.heartBadge}>
          <Ionicons name="heart" size={18} color="#EF4444" />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm trong món yêu thích..."
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
      </View>

      {/* Filter Tags Bar */}
      <View style={styles.filterSection}>
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
      </View>

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách món yêu thích...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 30 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredFavorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="heart-dislike-outline" size={48} color="#FCA5A5" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery || activeFilter !== 'ALL'
                  ? 'Không tìm thấy món ăn phù hợp'
                  : 'Chưa có món ăn yêu thích nào'}
              </Text>
              <Text style={styles.emptyDesc}>
                {searchQuery || activeFilter !== 'ALL'
                  ? 'Hãy thử thay đổi từ khóa hoặc bộ lọc phía trên nhé.'
                  : 'Khi xem các công thức nấu ăn, hãy bấm vào biểu tượng Trái tim để lưu lại những món bạn thích nhất vào đây!'}
              </Text>

              {(!searchQuery && activeFilter === 'ALL') && (
                <TouchableOpacity
                  style={styles.exploreBtn}
                  onPress={() => navigation.navigate('HomeTab')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="compass-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.exploreBtnText}>Khám phá công thức ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredFavorites.map((recipe) => {
              const totalTime =
                (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

              return (
                <TouchableOpacity
                  key={recipe._id}
                  style={styles.recipeCard}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate('RecipeDetail', {
                      recipeId: recipe._id,
                      recipe: recipe,
                    })
                  }
                >
                  {/* Thumbnail Image */}
                  <Image source={{ uri: recipe.imageUrl }} style={styles.recipeImage} />

                  {/* Heart Bookmark Action */}
                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => handleRemoveFavorite(recipe)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="heart" size={20} color="#EF4444" />
                  </TouchableOpacity>

                  {/* Body Content */}
                  <View style={styles.cardBody}>
                    <Text style={styles.recipeTitle} numberOfLines={2}>
                      {recipe.title}
                    </Text>

                    <Text style={styles.recipeDesc} numberOfLines={2}>
                      {recipe.description}
                    </Text>

                    {/* Metadata Badges */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color={Colors.primary} />
                        <Text style={styles.metaText}>{totalTime} phút</Text>
                      </View>

                      <View style={styles.metaDivider} />

                      <View style={styles.metaItem}>
                        <Ionicons name="people-outline" size={14} color="#10B981" />
                        <Text style={styles.metaText}>{recipe.servings || 2} người</Text>
                      </View>

                      <View style={styles.metaDivider} />

                      <View style={styles.difficultyBadge}>
                        <Text style={styles.difficultyText}>
                          {recipe.difficulty === 'EASY'
                            ? 'Dễ'
                            : recipe.difficulty === 'MEDIUM'
                            ? 'Vừa'
                            : 'Khó'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
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
  heartBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  recipeImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  cardBody: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  recipeDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 10,
  },
  difficultyBadge: {
    marginLeft: 'auto',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
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
    backgroundColor: '#FEF2F2',
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
});

export default FavoritesScreen;
