import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import recipeApi from '../../api/recipeApi';

const SelectRecipeModal = ({ visible, onClose, onSelectRecipe, onSelectCustomDish, slotTitle = 'Bữa ăn' }) => {
  const [activeTab, setActiveTab] = useState('RECIPES'); // 'RECIPES' | 'CUSTOM'
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Custom Dish State
  const [customName, setCustomName] = useState('');
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    if (visible) {
      fetchRecipes();
      fetchFavorites();
    }
  }, [visible]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const res = await recipeApi.getAllRecipes();
      if (res && (res.data || Array.isArray(res))) {
        setRecipes(res.data || res);
      }
    } catch (err) {
      console.log('Error fetching recipes for meal plan modal:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await recipeApi.getFavorites();
      if (res && res.data) {
        setFavorites(res.data);
      }
    } catch (err) {
      // quiet fail
    }
  };

  const filteredRecipes = recipes.filter((r) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchTitle = r.title?.toLowerCase().includes(query);
    const matchDesc = r.description?.toLowerCase().includes(query);
    return matchTitle || matchDesc;
  });

  const handleChooseRecipe = (recipe) => {
    onSelectRecipe(recipe);
    onClose();
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    onSelectCustomDish({
      customDishName: customName.trim(),
      note: customNote.trim(),
    });
    setCustomName('');
    setCustomNote('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.modalTitle}>Chọn món cho {slotTitle}</Text>
              <Text style={styles.modalSubTitle}>Lên lịch món ăn ngon miệng và khoa học</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'RECIPES' && styles.tabItemActive]}
              onPress={() => setActiveTab('RECIPES')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="book-outline"
                size={16}
                color={activeTab === 'RECIPES' ? Colors.primary : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'RECIPES' && styles.tabTextActive]}>
                Kho công thức ({recipes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'CUSTOM' && styles.tabItemActive]}
              onPress={() => setActiveTab('CUSTOM')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={activeTab === 'CUSTOM' ? Colors.primary : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'CUSTOM' && styles.tabTextActive]}>
                Tự nhập món ngoài
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'RECIPES' ? (
            <View style={styles.tabContent}>
              {/* Search input */}
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm món ngon, tên công thức..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Đang tải công thức...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredRecipes}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyEmoji}>🍳</Text>
                      <Text style={styles.emptyText}>Không tìm thấy công thức phù hợp</Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const isFav = favorites.some((f) => f._id === item._id);
                    return (
                      <TouchableOpacity
                        style={styles.recipeCard}
                        onPress={() => handleChooseRecipe(item)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={{
                            uri:
                              item.imageUrl ||
                              'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=800',
                          }}
                          style={styles.recipeImg}
                        />
                        <View style={styles.recipeInfo}>
                          <View style={styles.recipeTitleRow}>
                            <Text style={styles.recipeTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            {isFav && <Ionicons name="heart" size={16} color="#EF4444" />}
                          </View>

                          <Text style={styles.recipeDesc} numberOfLines={1}>
                            {item.description || `${item.ingredients?.length || 0} nguyên liệu`}
                          </Text>

                          <View style={styles.recipeMetaRow}>
                            <View style={styles.metaBadge}>
                              <Ionicons name="time-outline" size={12} color="#64748B" />
                              <Text style={styles.metaText}>
                                {(item.prepTimeMinutes || 0) + (item.cookTimeMinutes || 0)} phút
                              </Text>
                            </View>
                            <View style={styles.metaBadge}>
                              <Ionicons name="people-outline" size={12} color="#64748B" />
                              <Text style={styles.metaText}>{item.servings || 2} người</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.selectArrow}>
                          <Ionicons name="add-circle" size={26} color={Colors.primary} />
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          ) : (
            <View style={styles.customContainer}>
              <Text style={styles.customLabel}>Tên món ăn / Đồ ăn</Text>
              <TextInput
                style={styles.customInput}
                placeholder="VD: Phở bò tái lăn, Cơm tấm sườn bì, Ăn tiệc..."
                placeholderTextColor="#94A3B8"
                value={customName}
                onChangeText={setCustomName}
              />

              <Text style={styles.customLabel}>Ghi chú (Tùy chọn)</Text>
              <TextInput
                style={[styles.customInput, styles.customTextArea]}
                placeholder="VD: Ăn ngoài quán / Nấu ít dầu mỡ / Cho 2 người..."
                placeholderTextColor="#94A3B8"
                value={customNote}
                onChangeText={setCustomNote}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.submitBtn, !customName.trim() && styles.submitBtnDisabled]}
                onPress={handleAddCustom}
                disabled={!customName.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Xác nhận thêm món</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  listContent: {
    paddingBottom: 30,
    gap: 10,
  },
  recipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  recipeImg: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  recipeInfo: {
    flex: 1,
  },
  recipeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 6,
  },
  recipeDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
  },
  selectArrow: {
    paddingLeft: 4,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  customContainer: {
    padding: 20,
  },
  customLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  customInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#0F172A',
  },
  customTextArea: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default SelectRecipeModal;
