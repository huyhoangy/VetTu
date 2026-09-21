import React, { useState, useEffect, useCallback } from 'react';
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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors } from '../../constants/colors';
import shareApi from '../../api/shareApi';
import notificationApi from '../../api/notificationApi';
import { useAuth } from '../../context/AuthContext';
import PhoneVerificationModal from '../../components/profile/PhoneVerificationModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = [
  { id: 'ALL', title: 'Tất cả 🌟' },
  { id: 'VEGGIES', title: '🥦 Rau củ' },
  { id: 'PROTEIN', title: '🥩 Đạm/Thịt' },
  { id: 'SPICES', title: '🧄 Gia vị' },
  { id: 'CAN_DRY', title: '🥫 Đồ khô' },
  { id: 'COOKED', title: '🍲 Đồ nấu sẵn' },
];

const TYPE_FILTERS = [
  { id: 'ALL', title: 'Tất cả hình thức' },
  { id: 'GIFT', title: '🎁 Tặng 0đ' },
  { id: 'EXCHANGE', title: '🔄 Đổi đồ' },
];

const CommunityScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user, updateUserProfile } = useAuth();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(route?.params?.initialCategory || 'ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(route?.params?.initialSearch || '');
  const [userLocation, setUserLocation] = useState({
    lng: 105.782,
    lat: 21.031,
    address: 'Đang xác định vị trí...',
  });
  const [locationLoading, setLocationLoading] = useState(false);

  const currentUserId = user?._id || user?.id;

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount(currentUserId);
      if (res.success && res.unreadCount !== undefined) {
        setUnreadNotifs(res.unreadCount);
      }
    } catch (e) {}
  }, [currentUserId]);

  // Request GPS permission, get coordinates and reverse-geocode real address
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { longitude, latitude } = loc.coords;

        let addressText = 'Vị trí hiện tại của bạn';
        try {
          const geocodes = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geocodes && geocodes.length > 0) {
            const g = geocodes[0];
            const parts = [
              g.street,
              g.district || g.subregion,
              g.city || g.region,
            ].filter(Boolean);
            if (parts.length > 0) {
              addressText = parts.slice(0, 2).join(', ');
            }
          }
        } catch (geoErr) {
          console.log('Reverse geocode error, using default name');
        }

        setUserLocation({
          lng: longitude,
          lat: latitude,
          address: addressText,
        });
      } else {
        setUserLocation((prev) => ({ ...prev, address: 'Vị trí mặc định' }));
      }
    } catch (err) {
      console.log('Location permission skipped or error');
      setUserLocation((prev) => ({ ...prev, address: 'Vị trí của bạn' }));
    } finally {
      setLocationLoading(false);
    }
  };

  const fetchShares = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await shareApi.getNearbyShares({
        lng: userLocation.lng,
        lat: userLocation.lat,
        category: selectedCategory,
        type: selectedType,
        search: searchQuery,
      });

      if (res.success && res.data) {
        // Strictly filter out any items that are already COMPLETED
        const availableOnly = res.data.filter((item) => item.status !== 'COMPLETED');
        setShares((prev) => {
          const prevIds = prev.map((s) => s._id).join(',');
          const nextIds = availableOnly.map((s) => s._id).join(',');
          if (prevIds !== nextIds && prev.length > 0) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          }
          return availableOnly;
        });
      }
    } catch (error) {
      console.log('Notice fetching shares:', error?.message || error);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation, selectedCategory, selectedType, searchQuery]);

  // Real-time automatic polling every 3 seconds while focused on Community tab
  useFocusEffect(
    useCallback(() => {
      fetchShares(true);
      fetchUnreadCount();
      const timer = setInterval(() => {
        fetchShares(true);
        fetchUnreadCount();
      }, 3000);

      return () => clearInterval(timer);
    }, [fetchShares, fetchUnreadCount])
  );

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShares(true);
    fetchUnreadCount();
  };

  const handleCreateSharePress = () => {
    if (!user?.isVerified) {
      Alert.alert(
        '🛡️ Cần xác thực tài khoản',
        'Để đảm bảo uy tín và phòng chống bùng hẹn trong cộng đồng, bạn cần xác thực số điện thoại chính chủ trước khi đăng bài chia sẻ thực phẩm.',
        [
          { text: 'Để sau', style: 'cancel' },
          {
            text: 'Xác thực ngay',
            onPress: () => setVerificationModalVisible(true),
          },
        ]
      );
      return;
    }
    navigation.navigate('CreateShare');
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Cộng đồng Vét Tủ 🏡</Text>
          <TouchableOpacity
            style={styles.locationBadge}
            onPress={getCurrentLocation}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={14} color={Colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLoading ? 'Đang định vị GPS...' : userLocation.address}
            </Text>
            <Ionicons name="chevron-down" size={12} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.mySharesBtn}
            onPress={() => navigation.navigate('MySharedItems')}
            activeOpacity={0.7}
          >
            <Ionicons name="gift-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            {unreadNotifs > 0 && <View style={styles.bellBadge} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm rau củ, gia vị, món ăn hàng xóm tặng..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={fetchShares}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}
                >
                  {cat.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Type Filter Sub-row (Tất cả, Tặng 0đ, Đổi đồ) */}
      <View style={styles.typeFilterRow}>
        {TYPE_FILTERS.map((t) => {
          const isSelected = selectedType === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.typePill, isSelected && styles.typePillActive]}
              onPress={() => setSelectedType(t.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.typePillText, isSelected && styles.typePillTextActive]}>
                {t.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Feed Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang quét thực phẩm lân cận...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {shares.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🥬</Text>
              <Text style={styles.emptyTitle}>Chưa có bài chia sẻ nào quanh đây</Text>
              <Text style={styles.emptyDesc}>
                Hãy là người đầu tiên lan tỏa tinh thần chống lãng phí bằng cách đăng tặng thực phẩm dư nhé!
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={handleCreateSharePress}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.emptyAddText}>Đăng chia sẻ ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            shares.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.shareCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ShareDetail', { shareId: item._id })}
              >
                {/* Food Image */}
                <Image
                  source={{
                    uri: item.images?.[0] || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800',
                  }}
                  style={styles.cardImage}
                />

                {/* Badge Type (0đ / Đổi đồ) */}
                <View
                  style={[
                    styles.typeBadge,
                    item.type === 'GIFT' ? styles.badgeGift : styles.badgeExchange,
                  ]}
                >
                  <Text style={styles.typeBadgeText}>
                    {item.type === 'GIFT' ? '🎁 Tặng 0đ' : '🔄 Đổi đồ'}
                  </Text>
                </View>

                {/* Distance Badge */}
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate-circle" size={14} color="#FFFFFF" />
                  <Text style={styles.distanceBadgeText}>{item.distanceText || 'Gần bạn'}</Text>
                </View>

                {/* Info Block */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={styles.cardMetaRow}>
                    <View style={styles.metaQuantity}>
                      <Ionicons name="cube-outline" size={14} color={Colors.primary} />
                      <Text style={styles.metaQuantityText}>{item.quantity}</Text>
                    </View>
                    <Text style={styles.metaAddress} numberOfLines={1}>
                      📍 {item.addressName}
                    </Text>
                  </View>

                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>

                  {/* Donor Profile Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.donorInfo}>
                      <Image
                        source={{
                          uri:
                            item.author?.avatar ||
                            'https://cdn-icons-png.flaticon.com/512/847/847969.png',
                        }}
                        style={styles.donorAvatar}
                      />
                      <View>
                        <Text style={styles.donorName}>{item.author?.name || 'Hàng xóm'}</Text>
                        <View style={styles.donorRating}>
                          <Ionicons name="star" size={11} color="#F59E0B" />
                          <Text style={styles.donorRatingText}>
                            {item.author?.rating || '5.0'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {item.author?._id?.toString() === currentUserId?.toString() ||
                    item.createdBy?.toString() === currentUserId?.toString() ? (
                      <TouchableOpacity
                        style={[styles.claimButton, { backgroundColor: '#6B7280' }]}
                        onPress={() => navigation.navigate('ShareDetail', { shareId: item._id })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.claimButtonText}>Bài của bạn</Text>
                        <Ionicons name="eye-outline" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.claimButton}
                        onPress={() => navigation.navigate('ShareDetail', { shareId: item._id })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.claimButtonText}>Nhận đồ</Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Floating Action Button (FAB) to create share */}
      <TouchableOpacity
        style={[
          styles.fabButton,
          { bottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        onPress={handleCreateSharePress}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.fabText}>Chia sẻ món</Text>
      </TouchableOpacity>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        visible={verificationModalVisible}
        onClose={() => setVerificationModalVisible(false)}
        currentUser={user}
        onSuccess={(updatedUser) => {
          updateUserProfile(updatedUser);
          setVerificationModalVisible(false);
          navigation.navigate('CreateShare');
        }}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    maxWidth: 200,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mySharesBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
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
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  typeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typePillActive: {
    borderColor: Colors.secondary,
    backgroundColor: '#FFF7ED',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typePillTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  shareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGift: {
    backgroundColor: '#10B981',
  },
  badgeExchange: {
    backgroundColor: '#F59E0B',
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  distanceBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 22,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  metaQuantityText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  metaAddress: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  cardDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  donorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  donorName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  donorRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  donorRatingText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
  },
  emptyAddText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default CommunityScreen;
