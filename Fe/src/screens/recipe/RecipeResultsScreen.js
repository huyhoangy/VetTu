import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const RecipeResultsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { matchedRecipes = [], selectedIngredients = [] } = route.params || {};
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', '100', 'QUICK'

  const filteredRecipes = useMemo(() => {
    if (activeFilter === '100') {
      return matchedRecipes.filter((r) => r.matchPercentage === 100);
    }
    if (activeFilter === 'QUICK') {
      return matchedRecipes.filter((r) => (r.prepTimeMinutes + r.cookTimeMinutes) <= 15);
    }
    return matchedRecipes;
  }, [matchedRecipes, activeFilter]);

  const count100 = useMemo(
    () => matchedRecipes.filter((r) => r.matchPercentage === 100).length,
    [matchedRecipes]
  );

  const renderRecipeCard = ({ item }) => {
    const is100 = item.matchPercentage === 100;
    const isHigh = item.matchPercentage >= 60;
    const totalTime = (item.prepTimeMinutes || 0) + (item.cookTimeMinutes || 0);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RecipeDetail', { recipeId: item._id, recipe: item })}
        activeOpacity={0.9}
      >
        {/* Recipe Image & Floating Badge */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.recipeImage} />
          <View
            style={[
              styles.matchBadge,
              is100 ? styles.badgeGreen : isHigh ? styles.badgeYellow : styles.badgeOrange,
            ]}
          >
            <Ionicons
              name={is100 ? 'checkmark-circle' : 'flash'}
              size={14}
              color={is100 ? '#065F46' : isHigh ? '#92400E' : '#9A3412'}
            />
            <Text
              style={[
                styles.matchText,
                is100 ? styles.textGreen : isHigh ? styles.textYellow : styles.textOrange,
              ]}
            >
              {is100 ? '100% Nấu ngay' : `${item.matchPercentage}% Khớp`}
            </Text>
          </View>
        </View>

        {/* Recipe Content */}
        <View style={styles.cardContent}>
          <Text style={styles.recipeTitle}>{item.title}</Text>
          <Text style={styles.recipeDesc} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Quick Meta */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{totalTime} phút</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{item.servings || 2} người</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="restaurant-outline" size={15} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{item.difficulty === 'EASY' ? 'Dễ nấu' : 'Trung bình'}</Text>
            </View>
          </View>

          {/* Ingredients Breakdown */}
          <View style={styles.ingredientsBreakdown}>
            {/* Matched tags */}
            {item.matchedIngredients?.slice(0, 3).map((ing, idx) => (
              <View key={`m-${idx}`} style={styles.ingChipMatched}>
                <Ionicons name="checkmark" size={12} color="#059669" />
                <Text style={styles.ingTextMatched}>{ing.name}</Text>
              </View>
            ))}

            {/* Missing tags */}
            {item.missingIngredients?.slice(0, 2).map((ing, idx) => (
              <View key={`x-${idx}`} style={styles.ingChipMissing}>
                <Text style={styles.ingTextMissing}>+ {ing.name}</Text>
              </View>
            ))}

            {(item.missingIngredients?.length || 0) > 2 && (
              <View style={styles.ingChipMissing}>
                <Text style={styles.ingTextMissing}>+{item.missingIngredients.length - 2} khác</Text>
              </View>
            )}
          </View>

          {/* Action CTA */}
          <View style={styles.cardFooter}>
            <Text style={styles.ctaText}>Xem hướng dẫn nấu</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Món ngon cho bạn 🍳</Text>
          <Text style={styles.headerSubtitle}>
            Tìm thấy {matchedRecipes.length} món từ {selectedIngredients.length} nguyên liệu
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={[styles.filterPill, activeFilter === 'ALL' && styles.filterPillActive]}
          onPress={() => setActiveFilter('ALL')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterText, activeFilter === 'ALL' && styles.filterTextActive]}>
            Tất cả ({matchedRecipes.length})
          </Text>
        </TouchableOpacity>

        {count100 > 0 && (
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === '100' && styles.filterPillActive]}
            onPress={() => setActiveFilter('100')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, activeFilter === '100' && styles.filterTextActive]}>
              🔥 Nấu ngay 100% ({count100})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.filterPill, activeFilter === 'QUICK' && styles.filterPillActive]}
          onPress={() => setActiveFilter('QUICK')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterText, activeFilter === 'QUICK' && styles.filterTextActive]}>
            ⏱️ Nấu nhanh (≤15p)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recipe Cards List */}
      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => item._id}
        renderItem={renderRecipeCard}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍳</Text>
            <Text style={styles.emptyTitle}>Chưa có món phù hợp với bộ lọc này</Text>
            <Text style={styles.emptyDesc}>Hãy thử chọn thêm nguyên liệu trong tủ lạnh của bạn nhé!</Text>
            <TouchableOpacity
              style={styles.reselectBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.reselectText}>Chọn thêm nguyên liệu</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    paddingHorizontal: 20,
    paddingBottom: 14,
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
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 170,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  matchBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeGreen: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeYellow: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeOrange: {
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  matchText: {
    fontSize: 12,
    fontWeight: '800',
  },
  textGreen: {
    color: '#065F46',
  },
  textYellow: {
    color: '#92400E',
  },
  textOrange: {
    color: '#9A3412',
  },
  cardContent: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  recipeDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  ingredientsBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  ingChipMatched: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  ingTextMatched: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  ingChipMissing: {
    backgroundColor: '#FFF7ED',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  ingTextMissing: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EA580C',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  reselectBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  reselectText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default RecipeResultsScreen;
