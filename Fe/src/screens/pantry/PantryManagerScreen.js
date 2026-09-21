import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import pantryApi from '../../api/pantryApi';
import AddPantryItemModal from '../../components/pantry/AddPantryItemModal';
import AISmartScanModal from '../../components/pantry/AISmartScanModal';

const FILTER_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'EXPIRING_SOON', label: '⚠️ Sắp hết hạn' },
  { id: 'CHILLED', label: '❄️ Ngăn mát', location: 'CHILLED' },
  { id: 'FROZEN', label: '🧊 Ngăn đông', location: 'FROZEN' },
  { id: 'PANTRY', label: '🧺 Tủ khô', location: 'PANTRY' },
];

const CATEGORY_MAP = {
  VEGGIES: { label: 'Rau củ', icon: 'leaf-outline', color: '#10B981' },
  PROTEIN: { label: 'Thịt / Cá', icon: 'nutrition-outline', color: '#EF4444' },
  DAIRY: { label: 'Trứng / Sữa', icon: 'egg-outline', color: '#F59E0B' },
  COOKED: { label: 'Đồ nấu sẵn', icon: 'restaurant-outline', color: '#EC4899' },
  SPICES: { label: 'Gia vị', icon: 'color-palette-outline', color: '#8B5CF6' },
  CAN_DRY: { label: 'Đồ hộp / Khô', icon: 'cube-outline', color: '#6366F1' },
  OTHER: { label: 'Khác', icon: 'ellipsis-horizontal-circle-outline', color: '#6B7280' },
};

const LOCATION_MAP = {
  CHILLED: { label: 'Ngăn mát', color: '#0EA5E9', bg: '#F0F9FF' },
  FROZEN: { label: 'Ngăn đông', color: '#6366F1', bg: '#EEF2FF' },
  PANTRY: { label: 'Tủ khô', color: '#F59E0B', bg: '#FFFBEB' },
};

const PantryManagerScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    expiringSoon: 0,
    expired: 0,
    fresh: 0,
    chilled: 0,
    frozen: 0,
    pantry: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchPantry = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const selectedTab = FILTER_TABS.find((t) => t.id === activeTab);
      const params = {
        userId: currentUserId,
        search: searchQuery,
      };

      if (selectedTab?.location) {
        params.location = selectedTab.location;
      } else if (activeTab === 'EXPIRING_SOON') {
        params.status = 'EXPIRING_SOON';
      }

      const res = await pantryApi.getUserPantry(params);
      if (res.success && res.data) {
        setItems(res.data);
        if (res.stats) setStats(res.stats);
      }
    } catch (error) {
      console.error('Error fetching pantry:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId, activeTab, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchPantry();
    }, [fetchPantry])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPantry();
  };

  const handleSaveItem = async (payload) => {
    if (editingItem) {
      const res = await pantryApi.updatePantryItem(editingItem._id, payload);
      if (res.success) {
        fetchPantry();
      }
    } else {
      const res = await pantryApi.addPantryItem({
        ...payload,
        userId: currentUserId,
      });
      if (res.success) {
        fetchPantry();
      }
    }
    setEditingItem(null);
  };

  const handleSaveAIBatch = async (batchItems) => {
    if (!currentUserId || !Array.isArray(batchItems) || batchItems.length === 0) return;
    const res = await pantryApi.batchAddPantryItems({
      userId: currentUserId,
      items: batchItems,
    });
    if (res.success) {
      fetchPantry();
      Alert.alert('Thành công 🎉', `Đã cất ${res.count || batchItems.length} món vào tủ lạnh!`);
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Xoá thực phẩm',
      `Bạn muốn xoá "${item.name}" khỏi tủ lạnh?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Đã dùng xong / Xoá',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(item._id);
              const res = await pantryApi.deletePantryItem(item._id);
              setActionLoadingId(null);
              if (res.success) {
                setItems((prev) => prev.filter((i) => i._id !== item._id));
                fetchPantry();
              }
            } catch (err) {
              setActionLoadingId(null);
              Alert.alert('Lỗi', 'Không thể xoá thực phẩm');
            }
          },
        },
      ]
    );
  };

  // 1-Tap Cook Now: Navigate to Pantry screen with this item
  const handleCookItem = (item) => {
    navigation.navigate('Pantry', {
      preselectedIngredients: [item.name],
    });
  };

  // Cook all expiring items
  const handleCookAllExpiring = () => {
    const expiringNames = items
      .filter((i) => i.expiryStatus === 'EXPIRING_SOON' || i.daysRemaining === 0)
      .map((i) => i.name);

    if (expiringNames.length === 0) {
      Alert.alert('Thông báo', 'Hiện không có món nào sắp hết hạn');
      return;
    }

    navigation.navigate('Pantry', {
      preselectedIngredients: expiringNames,
    });
  };

  // 1-Tap Share to Community
  const handleShareItem = (item) => {
    navigation.navigate('CreateShare', {
      initialTitle: item.name,
      initialCategory: item.category,
      initialQuantity: item.quantity || '1 phần',
      initialDescription: `Món ${item.name} còn bảo quản tốt trong ${
        LOCATION_MAP[item.storageLocation]?.label || 'tủ lạnh'
      }, chia sẻ cho bạn nào cần nấu hôm nay nhé.`,
    });
  };

  const expiringCount = stats.expiringSoon + stats.expired;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 6 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Tủ lạnh của tôi 🧊</Text>
          <Text style={styles.headerSubtitle}>Quản lý & Nhắc nhở hạn sử dụng</Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.quickScanBtn}
            onPress={() => setAiModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.quickScanBtnText}>Quét hoá đơn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditingItem(null);
              setModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Expiring Alert Banner */}
        {expiringCount > 0 && (
          <View style={styles.alertBanner}>
            <View style={styles.alertTopRow}>
              <View style={styles.alertTitleRow}>
                <Ionicons name="warning" size={20} color="#DC2626" />
                <Text style={styles.alertTitle}>Ưu tiên dùng hôm nay</Text>
              </View>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{expiringCount} món</Text>
              </View>
            </View>
            <Text style={styles.alertDesc}>
              Bạn có thực phẩm sắp hết hạn trong 1-2 ngày tới. Hãy nấu ngay hoặc chia sẻ cho hàng xóm tránh lãng phí!
            </Text>
            <TouchableOpacity
              style={styles.cookNowBannerBtn}
              onPress={handleCookAllExpiring}
              activeOpacity={0.85}
            >
              <Ionicons name="restaurant" size={16} color="#FFFFFF" />
              <Text style={styles.cookNowBannerBtnText}>Vét Tủ nấu ngay ({expiringCount} món)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLabel}>Tổng món</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
            <Text style={[styles.statNum, { color: '#D97706' }]}>{stats.expiringSoon}</Text>
            <Text style={styles.statLabel}>Sắp hết hạn</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' }]}>
            <Text style={[styles.statNum, { color: '#0284C7' }]}>{stats.chilled}</Text>
            <Text style={styles.statLabel}>Ngăn mát</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }]}>
            <Text style={[styles.statNum, { color: '#4F46E5' }]}>{stats.frozen}</Text>
            <Text style={styles.statLabel}>Ngăn đông</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm nguyên liệu trong tủ..."
            placeholderTextColor={Colors.placeholder}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              fetchPantry();
            }}
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List of Pantry Items */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang kiểm tra tủ lạnh...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="snow-outline" size={54} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Chưa có thực phẩm nào</Text>
            <Text style={styles.emptyDesc}>
              {searchQuery
                ? 'Không tìm thấy thực phẩm phù hợp từ khóa'
                : 'Chụp hóa đơn siêu thị, nói bằng giọng nói hoặc thêm thủ công nhé!'}
            </Text>
            <View style={styles.emptyButtonsRow}>
              <TouchableOpacity
                style={styles.emptyAiBtn}
                onPress={() => setAiModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={styles.emptyAiBtnText}>✨ AI Quét hóa đơn / Giọng nói</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => {
                  setEditingItem(null);
                  setModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color={Colors.text} />
                <Text style={styles.emptyAddBtnText}>Thêm thủ công</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {items.map((item) => {
              const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.OTHER;
              const locInfo = LOCATION_MAP[item.storageLocation] || LOCATION_MAP.CHILLED;

              return (
                <View key={item._id} style={styles.itemCard}>
                  <View style={styles.itemMainRow}>
                    {/* Category Icon */}
                    <View style={[styles.catIconBox, { backgroundColor: `${catInfo.color}15` }]}>
                      <Ionicons name={catInfo.icon} size={22} color={catInfo.color} />
                    </View>

                    {/* Details */}
                    <View style={styles.itemDetails}>
                      <View style={styles.itemNameRow}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={[styles.locBadge, { backgroundColor: locInfo.bg }]}>
                          <Text style={[styles.locBadgeText, { color: locInfo.color }]}>
                            {locInfo.label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itemSubRow}>
                        <Text style={styles.itemQuantity}>{item.quantity || '1 phần'}</Text>
                        <View style={styles.dotSeparator} />
                        <View
                          style={[
                            styles.expiryBadge,
                            { backgroundColor: `${item.statusColor}15` },
                          ]}
                        >
                          <Ionicons name="time-outline" size={12} color={item.statusColor} />
                          <Text style={[styles.expiryText, { color: item.statusColor }]}>
                            {item.statusText}
                          </Text>
                        </View>
                      </View>

                      {Boolean(item.notes) && (
                        <Text style={styles.itemNotes} numberOfLines={1}>
                          📝 {item.notes}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Action Buttons Row */}
                  <View style={styles.itemActionsRow}>
                    <TouchableOpacity
                      style={styles.cookBtn}
                      onPress={() => handleCookItem(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="restaurant-outline" size={14} color={Colors.primary} />
                      <Text style={styles.cookBtnText}>Vét Tủ nấu</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => handleShareItem(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="heart-outline" size={14} color="#10B981" />
                      <Text style={styles.shareBtnText}>Tặng hàng xóm</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => {
                        setEditingItem(item);
                        setModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil-outline" size={15} color={Colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteItem(item)}
                      activeOpacity={0.7}
                      disabled={actionLoadingId === item._id}
                    >
                      {actionLoadingId === item._id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <AddPantryItemModal
        visible={modalVisible}
        initialItem={editingItem}
        onClose={() => {
          setModalVisible(false);
          setEditingItem(null);
        }}
        onAddSuccess={handleSaveItem}
      />

      {/* AI Smart Scan & Voice Modal */}
      <AISmartScanModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onSaveBatch={handleSaveAIBatch}
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickScanBtn: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickScanBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  alertBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  alertTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
  },
  alertBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alertDesc: {
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 18,
    marginBottom: 12,
  },
  cookNowBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 12,
  },
  cookNowBannerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  catIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  locBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  locBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemQuantity: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemNotes: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  itemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  cookBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingVertical: 8,
    borderRadius: 10,
  },
  cookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PantryManagerScreen;
