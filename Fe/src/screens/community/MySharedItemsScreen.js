import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import shareApi from '../../api/shareApi';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'AVAILABLE', label: '🟢 Đang còn sẵn' },
  { id: 'RESERVED', label: '🤝 Đã hẹn lấy' },
  { id: 'COMPLETED', label: '✅ Đã tặng xong' },
];

const CATEGORY_MAP = {
  VEGGIES: { label: 'Rau củ quả', icon: 'leaf-outline', color: '#10B981' },
  PROTEIN: { label: 'Thịt / Cá', icon: 'nutrition-outline', color: '#EF4444' },
  SPICES: { label: 'Gia vị tươi', icon: 'color-palette-outline', color: '#F59E0B' },
  CAN_DRY: { label: 'Đồ hộp / Khô', icon: 'cube-outline', color: '#6366F1' },
  COOKED: { label: 'Đồ nấu sẵn', icon: 'restaurant-outline', color: '#EC4899' },
  OTHER: { label: 'Khác', icon: 'ellipsis-horizontal-circle-outline', color: '#6B7280' },
};

const MySharedItemsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [shares, setShares] = useState([]);
  const [stats, setStats] = useState({
    totalShares: 0,
    availableCount: 0,
    reservedCount: 0,
    completedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchMyShares = async () => {
    if (!currentUserId) return;
    try {
      const res = await shareApi.getMyShares({
        userId: currentUserId,
        status: activeFilter,
        search: searchQuery,
      });

      if (res.success && res.data) {
        setShares(res.data);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching my shares:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyShares();
    }, [currentUserId, activeFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyShares();
  };

  // Quick Status Change handler
  const handleChangeStatus = (item) => {
    Alert.alert(
      'Cập nhật trạng thái món',
      `Chọn trạng thái mới cho "${item.title}":`,
      [
        {
          text: '🟢 Đang còn sẵn (AVAILABLE)',
          onPress: () => updateStatus(item._id, 'AVAILABLE'),
        },
        {
          text: '🤝 Đã hẹn người lấy (RESERVED)',
          onPress: () => updateStatus(item._id, 'RESERVED'),
        },
        {
          text: '✅ Đã tặng xong (COMPLETED)',
          onPress: () => updateStatus(item._id, 'COMPLETED'),
        },
        {
          text: 'Huỷ',
          style: 'cancel',
        },
      ]
    );
  };

  const updateStatus = async (id, newStatus) => {
    try {
      setActionLoadingId(id);
      const res = await shareApi.updateShareStatus(id, newStatus);
      setActionLoadingId(null);
      if (res.success) {
        // Optimistically update local item
        setShares((prev) =>
          prev.map((s) => (s._id === id ? { ...s, status: newStatus } : s))
        );
        fetchMyShares();
      }
    } catch (err) {
      setActionLoadingId(null);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái bài chia sẻ');
    }
  };

  // Delete Share Handler
  const handleDeleteShare = (item) => {
    Alert.alert(
      'Xác nhận xoá bài',
      `Bạn có chắc chắn muốn xoá bài chia sẻ "${item.title}" không? Hành động này không thể khôi phục.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(item._id);
              const res = await shareApi.deleteShare(item._id, currentUserId);
              setActionLoadingId(null);
              if (res.success) {
                setShares((prev) => prev.filter((s) => s._id !== item._id));
                fetchMyShares();
                Alert.alert('Thành công', 'Đã xoá bài chia sẻ thành công');
              }
            } catch (err) {
              setActionLoadingId(null);
              Alert.alert('Lỗi', 'Không thể xoá bài chia sẻ, vui lòng thử lại');
            }
          },
        },
      ]
    );
  };

  // Format Date Helper
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} • ${day}/${month}/${d.getFullYear()}`;
  };

  // Filter list by search query client-side as well
  const filteredShares = shares.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (item.title || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const addr = (item.addressName || '').toLowerCase();
    return title.includes(q) || desc.includes(q) || addr.includes(q);
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
          <Text style={styles.headerTitle}>Thực phẩm đã chia sẻ 🎁</Text>
          <Text style={styles.headerSubtitle}>
            {stats.totalShares} bài đăng chia sẻ của bạn
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createHeaderBtn}
          onPress={() => navigation.navigate('CreateShare')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="gift" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.statNum}>{stats.totalShares}</Text>
            <Text style={styles.statDesc}>Tổng đăng</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="sparkles" size={18} color="#10B981" />
            </View>
            <Text style={[styles.statNum, { color: '#059669' }]}>{stats.availableCount}</Text>
            <Text style={styles.statDesc}>Đang sẵn</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="time" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.statNum, { color: '#D97706' }]}>{stats.reservedCount}</Text>
            <Text style={styles.statDesc}>Đã hẹn</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="checkmark-done" size={18} color="#6B7280" />
            </View>
            <Text style={[styles.statNum, { color: '#4B5563' }]}>{stats.completedCount}</Text>
            <Text style={styles.statDesc}>Đã tặng</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên thực phẩm, địa điểm..."
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

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => setActiveFilter(f.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* List Content */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách chia sẻ...</Text>
          </View>
        ) : filteredShares.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="gift-outline" size={48} color={Colors.primaryLight} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Không tìm thấy thực phẩm phù hợp' : 'Bạn chưa đăng chia sẻ thực phẩm nào'}
            </Text>
            <Text style={styles.emptyDesc}>
              {searchQuery
                ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc "Tất cả".'
                : 'Khi bạn có thực phẩm dư trong tủ lạnh, hãy chia sẻ cho cộng đồng hàng xóm để tránh lãng phí thực phẩm nhé!'}
            </Text>

            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('CreateShare')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Đăng chia sẻ món mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredShares.map((item) => {
            const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.OTHER;
            const imageUrl =
              item.images?.[0] ||
              'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800';

            const isAvailable = item.status === 'AVAILABLE';
            const isReserved = item.status === 'RESERVED';
            const isCompleted = item.status === 'COMPLETED';

            return (
              <View key={item._id} style={styles.shareCard}>
                {/* Card Top Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardDateRow}>
                    <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                  </View>

                  {/* Status Badge */}
                  <TouchableOpacity
                    style={[
                      styles.statusPill,
                      isAvailable
                        ? styles.statusPillAvailable
                        : isReserved
                        ? styles.statusPillReserved
                        : styles.statusPillCompleted,
                    ]}
                    onPress={() => handleChangeStatus(item)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: isAvailable
                            ? '#10B981'
                            : isReserved
                            ? '#F59E0B'
                            : '#6B7280',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: isAvailable
                            ? '#065F46'
                            : isReserved
                            ? '#92400E'
                            : '#374151',
                        },
                      ]}
                    >
                      {isAvailable
                        ? '🟢 Còn sẵn'
                        : isReserved
                        ? '🤝 Đã hẹn lấy'
                        : '✅ Đã tặng xong'}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={12}
                      color={
                        isAvailable
                          ? '#065F46'
                          : isReserved
                          ? '#92400E'
                          : '#374151'
                      }
                    />
                  </TouchableOpacity>
                </View>

                {/* Main Food Info */}
                <TouchableOpacity
                  style={styles.foodRow}
                  onPress={() => navigation.navigate('ShareDetail', { shareId: item._id })}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: imageUrl }} style={styles.foodThumbnail} />

                  <View style={styles.foodDetails}>
                    <Text style={styles.foodTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <View style={styles.badgesRow}>
                      <View
                        style={[
                          styles.typeBadge,
                          item.type === 'GIFT'
                            ? styles.badgeGift
                            : styles.badgeExchange,
                        ]}
                      >
                        <Text style={styles.typeBadgeText}>
                          {item.type === 'GIFT' ? '🎁 Tặng 0đ' : '🔄 Đổi đồ'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: `${catInfo.color}15` },
                        ]}
                      >
                        <Text
                          style={[styles.categoryBadgeText, { color: catInfo.color }]}
                        >
                          {catInfo.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.quantityRow}>
                      <Ionicons name="cube-outline" size={13} color={Colors.primary} />
                      <Text style={styles.quantityText}>
                        Số lượng: <Text style={styles.quantityBold}>{item.quantity}</Text>
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Address and Note Info */}
                <View style={styles.addressBox}>
                  <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {item.addressName || 'Khu vực gần bạn'}
                  </Text>
                </View>

                {Boolean(item.description) && (
                  <Text style={styles.descText} numberOfLines={2}>
                    "{item.description}"
                  </Text>
                )}

                {/* Bottom Card Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtnSecondary}
                    onPress={() => handleChangeStatus(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="sync-outline" size={14} color={Colors.primary} />
                    <Text style={styles.actionBtnSecondaryText}>Đổi trạng thái</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnPrimary}
                    onPress={() => navigation.navigate('ShareDetail', { shareId: item._id })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="eye-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.actionBtnPrimaryText}>Xem bài đăng</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteShare(item)}
                    activeOpacity={0.7}
                    disabled={actionLoadingId === item._id}
                  >
                    {actionLoadingId === item._id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
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
  createHeaderBtn: {
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
  statsGrid: {
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
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  statDesc: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 1,
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
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
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
  createBtn: {
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
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
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
    gap: 5,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusPillAvailable: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  statusPillReserved: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  statusPillCompleted: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  foodRow: {
    flexDirection: 'row',
    gap: 12,
  },
  foodThumbnail: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  foodDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  foodTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 19,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeGift: {
    backgroundColor: '#10B981',
  },
  badgeExchange: {
    backgroundColor: '#F59E0B',
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quantityText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quantityBold: {
    fontWeight: '800',
    color: Colors.text,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 10,
  },
  addressText: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  descText: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MySharedItemsScreen;
