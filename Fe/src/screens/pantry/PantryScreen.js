import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import recipeApi from '../../api/recipeApi';

// 1. Quick Presets
const QUICK_PRESETS = [
  {
    id: 'breakfast',
    title: '🍳 Bữa sáng',
    ingredients: ['Trứng gà', 'Xúc xích', 'Bánh mì', 'Hành lá', 'Phô mai'],
  },
  {
    id: 'eatclean',
    title: '🥗 Eat Clean',
    ingredients: ['Thịt gà', 'Trứng gà', 'Bông cải', 'Cà rốt', 'Nấm', 'Ớt chuông'],
  },
  {
    id: 'vegetarian',
    title: '🌿 Ăn chay',
    ingredients: ['Đậu phụ', 'Nấm', 'Cà chua', 'Rau cải', 'Bắp hạt'],
  },
  {
    id: 'family',
    title: '🍚 Cơm nhà',
    ingredients: ['Thịt heo', 'Trứng gà', 'Cà chua', 'Hành tím', 'Tỏi', 'Rau muống'],
  },
  {
    id: 'midnight',
    title: '🍜 Mì đêm & Ăn vặt',
    ingredients: ['Mì tôm', 'Trứng gà', 'Xúc xích', 'Kim chi', 'Phô mai'],
  },
  {
    id: 'soup_hotpot',
    title: '🍲 Nấu canh / Lẩu',
    ingredients: ['Thịt bò', 'Đậu phụ', 'Nấm', 'Rau cải', 'Cà chua', 'Gừng'],
  },
];

// 2. Cooking Appliances
const APPLIANCES = [
  { id: 'ALL', title: '🍳 Mọi dụng cụ' },
  { id: 'STOVE', title: '🥘 Chảo & Bếp' },
  { id: 'AIRFRYER', title: '🍟 Nồi chiên (Airfryer)' },
  { id: 'RICE_COOKER', title: '🍚 Nồi cơm điện' },
  { id: 'MICROWAVE', title: '♨️ Lò vi sóng' },
];

// 3. Smart Pairing Rules
const PAIRING_RULES = {
  'Thịt bò': ['Hành tây', 'Cần tây', 'Tỏi', 'Dầu hào', 'Tiêu'],
  'Trứng gà': ['Cà chua', 'Hành lá', 'Thịt băm', 'Nước mắm', 'Phô mai'],
  'Đậu phụ': ['Cà chua', 'Hành lá', 'Nấm', 'Kim chi', 'Nước tương'],
  'Thịt heo': ['Hành tím', 'Tỏi', 'Kim chi', 'Tiêu', 'Rau cải', 'Ớt'],
  'Thịt băm': ['Rau cải', 'Cà chua', 'Hành tím', 'Nấm', 'Trứng gà'],
  'Thịt gà': ['Nấm', 'Gừng', 'Hành lá', 'Cà rốt', 'Bông cải', 'Sả'],
  'Mì tôm': ['Trứng gà', 'Bắp cải', 'Xúc xích', 'Hành lá', 'Kim chi', 'Phô mai'],
  'Cơm nguội': ['Trứng gà', 'Xúc xích', 'Cà rốt', 'Hành lá', 'Tỏi'],
  'Kim chi': ['Đậu phụ', 'Thịt heo', 'Hành lá', 'Tỏi', 'Mì tôm'],
  'Sườn heo': ['Tỏi', 'Hành tím', 'Dầu hào', 'Nước mắm', 'Ớt'],
  'Khoai lang': ['Bơ', 'Phô mai'],
  'Rau muống': ['Tỏi', 'Nước mắm', 'Chanh'],
  'Bánh mì': ['Trứng gà', 'Xúc xích', 'Bơ', 'Chả lụa', 'Dưa leo'],
  'Tôm': ['Tỏi', 'Hành lá', 'Ớt', 'Gừng'],
  'Cá': ['Gừng', 'Hành tím', 'Hành lá', 'Ớt', 'Thì là', 'Cà chua'],
};

// 4. Expanded Categories & Ingredients
const PANTRY_CATEGORIES = [
  {
    id: 'protein',
    title: '🥩 Đạm & Thịt',
    items: [
      { name: 'Trứng gà', emoji: '🥚' },
      { name: 'Thịt heo', emoji: '🥓' },
      { name: 'Thịt bò', emoji: '🥩' },
      { name: 'Thịt gà', emoji: '🍗' },
      { name: 'Thịt băm', emoji: '🍖' },
      { name: 'Sườn heo', emoji: '🥩' },
      { name: 'Đậu phụ', emoji: '🧈' },
      { name: 'Tôm', emoji: '🦐' },
      { name: 'Cá', emoji: '🐟' },
      { name: 'Mực', emoji: '🦑' },
      { name: 'Xúc xích', emoji: '🌭' },
      { name: 'Chả lụa', emoji: '🍥' },
      { name: 'Trứng vịt', emoji: '🥚' },
      { name: 'Lạp xưởng', emoji: '🌭' },
      { name: 'Cá viên', emoji: '🍡' },
      { name: 'Bò viên', emoji: '🍢' },
    ],
  },
  {
    id: 'veggies',
    title: '🥦 Rau củ quả',
    items: [
      { name: 'Cà chua', emoji: '🍅' },
      { name: 'Hành tây', emoji: '🧅' },
      { name: 'Bắp cải', emoji: '🥬' },
      { name: 'Rau cải', emoji: '🥗' },
      { name: 'Cà rốt', emoji: '🥕' },
      { name: 'Khoai tây', emoji: '🥔' },
      { name: 'Khoai lang', emoji: '🍠' },
      { name: 'Nấm', emoji: '🍄' },
      { name: 'Dưa leo', emoji: '🥒' },
      { name: 'Ớt chuông', emoji: '🫑' },
      { name: 'Bí đỏ', emoji: '🎃' },
      { name: 'Cần tây', emoji: '🌿' },
      { name: 'Giá đỗ', emoji: '🌱' },
      { name: 'Rau muống', emoji: '🥬' },
      { name: 'Bông cải', emoji: '🥦' },
      { name: 'Bắp hạt', emoji: '🌽' },
      { name: 'Khổ qua', emoji: '🥒' },
    ],
  },
  {
    id: 'canned_frozen',
    title: '🥫 Đồ hộp & Cấp đông',
    items: [
      { name: 'Kim chi', emoji: '🥬' },
      { name: 'Cá hộp', emoji: '🥫' },
      { name: 'Phô mai', emoji: '🧀' },
      { name: 'Chả giò', emoji: '🥟' },
      { name: 'Tôm khô', emoji: '🦐' },
      { name: 'Rong biển', emoji: '🍱' },
    ],
  },
  {
    id: 'spices_carbs',
    title: '🧄 Gia vị & Tinh bột',
    items: [
      { name: 'Hành lá', emoji: '🌿' },
      { name: 'Hành tím', emoji: '🧅' },
      { name: 'Tỏi', emoji: '🧄' },
      { name: 'Ớt', emoji: '🌶️' },
      { name: 'Gừng', emoji: '🫚' },
      { name: 'Sả', emoji: '🌾' },
      { name: 'Chanh', emoji: '🍋' },
      { name: 'Cơm nguội', emoji: '🍚' },
      { name: 'Mì tôm', emoji: '🍜' },
      { name: 'Bánh mì', emoji: '🥖' },
      { name: 'Bún tươi', emoji: '🍜' },
      { name: 'Miến', emoji: '🍜' },
      { name: 'Nước mắm', emoji: '🍶' },
      { name: 'Tiêu', emoji: '🧂' },
      { name: 'Dầu hào', emoji: '🥣' },
      { name: 'Nước tương', emoji: '🍶' },
      { name: 'Bơ', emoji: '🧈' },
      { name: 'Hạt nêm', emoji: '🧂' },
    ],
  },
];

const PantryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [selectedIngredients, setSelectedIngredients] = useState(['Trứng gà', 'Cà chua', 'Hành lá']);
  const [selectedAppliance, setSelectedAppliance] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Toggle ingredient selection
  const toggleIngredient = (name) => {
    setSelectedIngredients((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  // Quick Preset Click
  const handleApplyPreset = (presetIngredients) => {
    setSelectedIngredients((prev) => {
      const merged = new Set([...prev, ...presetIngredients]);
      return Array.from(merged);
    });
  };

  // Add custom ingredient
  const handleAddCustom = () => {
    const trimmed = searchQuery.trim();
    if (trimmed && !selectedIngredients.includes(trimmed)) {
      setSelectedIngredients((prev) => [...prev, trimmed]);
      setSearchQuery('');
    }
  };

  const clearAll = () => {
    setSelectedIngredients([]);
  };

  // Smart pairings suggestions based on currently selected ingredients
  const smartPairingSuggestions = useMemo(() => {
    const suggestions = new Set();
    selectedIngredients.forEach((item) => {
      if (PAIRING_RULES[item]) {
        PAIRING_RULES[item].forEach((paired) => {
          if (!selectedIngredients.includes(paired)) {
            suggestions.add(paired);
          }
        });
      }
    });
    return Array.from(suggestions).slice(0, 5);
  }, [selectedIngredients]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return PANTRY_CATEGORIES;

    const lower = searchQuery.toLowerCase();
    return PANTRY_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => item.name.toLowerCase().includes(lower)),
    })).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  // Match recipes API call
  const handleFindRecipes = async () => {
    if (selectedIngredients.length === 0) {
      Alert.alert('Chưa chọn nguyên liệu', 'Vui lòng chọn ít nhất 1 nguyên liệu có trong tủ lạnh của bạn!');
      return;
    }

    try {
      setLoading(true);
      const response = await recipeApi.matchRecipes(selectedIngredients, selectedAppliance);
      setLoading(false);

      if (response.success) {
        navigation.navigate('RecipeResults', {
          matchedRecipes: response.data,
          selectedIngredients,
          selectedAppliance,
        });
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Lỗi kết nối', 'Không thể tìm kiếm công thức, vui lòng thử lại!');
    }
  };

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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Vét Tủ Lạnh 🧊</Text>
          <Text style={styles.headerSubtitle}>Chọn đồ ăn bạn đang có trong nhà</Text>
        </View>
        {selectedIngredients.length > 0 && (
          <TouchableOpacity onPress={clearAll} style={styles.clearButton} activeOpacity={0.7}>
            <Text style={styles.clearText}>Xóa hết</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 110 + Math.max(insets.bottom, 12) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Quick Presets */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>⚡ Chọn nhanh theo nhu cầu:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
            {QUICK_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={styles.presetPill}
                onPress={() => handleApplyPreset(preset.ingredients)}
                activeOpacity={0.75}
              >
                <Text style={styles.presetText}>{preset.title}</Text>
                <Ionicons name="add-circle" size={16} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Section 2: Cooking Appliance Filter */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>🍳 Dụng cụ nấu có sẵn:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
            {APPLIANCES.map((app) => {
              const isSelected = selectedAppliance === app.id;
              return (
                <TouchableOpacity
                  key={app.id}
                  style={[styles.appliancePill, isSelected && styles.appliancePillActive]}
                  onPress={() => setSelectedAppliance(app.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.applianceText, isSelected && styles.applianceTextActive]}>
                    {app.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Search & Custom Input Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm hoặc gõ thêm nguyên liệu khác..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="done"
            onSubmitEditing={handleAddCustom}
          />
          {searchQuery.trim().length > 0 && (
            <TouchableOpacity onPress={handleAddCustom} style={styles.addButton} activeOpacity={0.8}>
              <Text style={styles.addButtonText}>Thêm</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Section 3: Smart Pairings Suggestions */}
        {smartPairingSuggestions.length > 0 && (
          <View style={styles.smartPairingBox}>
            <View style={styles.smartPairingHeader}>
              <Ionicons name="bulb" size={18} color="#F59E0B" />
              <Text style={styles.smartPairingTitle}>Gợi ý ghép đôi ngon cùng đồ bạn đã chọn:</Text>
            </View>
            <View style={styles.smartChipsRow}>
              {smartPairingSuggestions.map((item) => (
                <TouchableOpacity
                  key={`smart-${item}`}
                  style={styles.smartChip}
                  onPress={() => toggleIngredient(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={14} color="#B45309" />
                  <Text style={styles.smartChipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Section 4: Categorized Ingredients Chips */}
        {filteredCategories.map((category) => (
          <View key={category.id} style={styles.categoryBlock}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <View style={styles.chipsWrap}>
              {category.items.map((item) => {
                const isSelected = selectedIngredients.includes(item.name);
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleIngredient(item.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipEmoji}>{item.emoji}</Text>
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {filteredCategories.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤔</Text>
            <Text style={styles.emptyTitle}>Chưa có sẵn "{searchQuery}"</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddCustom} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddText}>Thêm "{searchQuery}" vào tủ</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Action Dock */}
      <View
        style={[
          styles.bottomDock,
          { paddingBottom: Math.max(insets.bottom, 12) + 12 },
        ]}
      >
        <View style={styles.dockInfo}>
          <Text style={styles.dockCount}>
            Đã chọn: <Text style={styles.dockHighlight}>{selectedIngredients.length}</Text> nguyên liệu
          </Text>
          <Text style={styles.dockDesc} numberOfLines={1}>
            {selectedIngredients.join(', ') || 'Chưa chọn nguyên liệu nào'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            selectedIngredients.length === 0 && styles.submitButtonDisabled,
          ]}
          onPress={handleFindRecipes}
          disabled={loading || selectedIngredients.length === 0}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Gợi ý món</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
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
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  appliancePill: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  appliancePillActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  applianceText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  applianceTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  smartPairingBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 22,
  },
  smartPairingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  smartPairingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  smartChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smartChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: 4,
  },
  smartChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350F',
  },
  categoryBlock: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  checkIcon: {
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 6,
  },
  emptyAddText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  dockInfo: {
    flex: 1,
    marginRight: 14,
  },
  dockCount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dockHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  dockDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PantryScreen;
