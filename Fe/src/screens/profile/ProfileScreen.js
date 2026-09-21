import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import recipeApi from '../../api/recipeApi';
import cookingHistoryApi from '../../api/cookingHistoryApi';
import shareApi from '../../api/shareApi';
import pantryApi from '../../api/pantryApi';

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [favoritesCount, setFavoritesCount] = useState(user?.favorites?.length || 0);
  const [cookedCount, setCookedCount] = useState(0);
  const [mySharesCount, setMySharesCount] = useState(0);
  const [pantryStats, setPantryStats] = useState({ total: 0, expiringSoon: 0 });

  const currentUserId = user?._id || user?.id;

  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        // Fetch favorites count
        recipeApi.getFavorites(currentUserId).then((res) => {
          if (res.success && res.data) {
            setFavoritesCount(res.data.length);
          }
        }).catch(() => {});

        // Fetch cooking history count
        cookingHistoryApi.getHistory(currentUserId).then((res) => {
          if (res.success && res.stats) {
            setCookedCount(res.stats.totalCooked || res.count || 0);
          }
        }).catch(() => {});

        // Fetch my shared items count
        shareApi.getMyShares({ userId: currentUserId }).then((res) => {
          if (res.success) {
            setMySharesCount(res.stats?.totalShares || res.count || 0);
          }
        }).catch(() => {});

        // Fetch pantry stats
        pantryApi.getUserPantry({ userId: currentUserId }).then((res) => {
          if (res.success && res.stats) {
            setPantryStats(res.stats);
          }
        }).catch(() => {});
      }
    }, [currentUserId])
  );

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const menuSections = [
    {
      title: 'Hoạt động của bạn',
      items: [
        { id: 'meal_planner', title: 'Thực đơn tuần & Đi chợ', icon: 'calendar-outline', color: Colors.primary },
        { id: 'pantry_inventory', title: 'Tủ lạnh & Hạn thực phẩm', icon: 'snow-outline', badge: pantryStats.expiringSoon > 0 ? `${pantryStats.expiringSoon} món cần dùng` : (pantryStats.total > 0 ? `${pantryStats.total} món` : null), color: '#0EA5E9' },
        { id: 'messages', title: 'Tin nhắn & Lịch sử nhận món', icon: 'chatbubble-ellipses-outline', badge: 'Mới', color: '#3B82F6' },
        { id: 'favorites', title: 'Món ăn yêu thích', icon: 'heart', badge: favoritesCount > 0 ? `${favoritesCount}` : null, color: '#EF4444' },
        { id: 'cooked', title: 'Lịch sử nấu ăn', icon: 'restaurant-outline', badge: cookedCount > 0 ? `${cookedCount}` : null, color: Colors.primary },
        { id: 'my_shares', title: 'Thực phẩm tôi đã chia sẻ', icon: 'gift-outline', badge: mySharesCount > 0 ? `${mySharesCount}` : null, color: '#10B981' },
      ],
    },
    {
      title: 'Cài đặt & Trợ giúp',
      items: [
        { id: 'notifications', title: 'Thông báo', icon: 'notifications-outline', color: '#6366F1' },
        { id: 'support', title: 'Hỗ trợ & Góp ý', icon: 'help-circle-outline', color: '#6B7280' },
        { id: 'about', title: 'Về ứng dụng Vét Tủ (v1.0.0)', icon: 'information-circle-outline', color: '#6B7280' },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: user?.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user?.name || 'Đầu bếp Vét Tủ'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@vettu.app'}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={styles.trustBadgeText}>Đã xác thực</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingBadgeText}>{user?.rating || '5.0'} Uy tín</Text>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{cookedCount}</Text>
              <Text style={styles.statLabel}>Món đã nấu</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mySharesCount}</Text>
              <Text style={styles.statLabel}>Đã chia sẻ</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>5.0</Text>
              <Text style={styles.statLabel}>Đánh giá</Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, idx) => (
          <View key={`sec-${idx}`} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuContainer}>
              {section.items.map((item, itemIdx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    itemIdx < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (item.id === 'meal_planner') {
                      navigation.navigate('MealPlanner');
                    } else if (item.id === 'pantry_inventory') {
                      navigation.navigate('PantryManager');
                    } else if (item.id === 'messages') {
                      navigation.navigate('ConversationsList');
                    } else if (item.id === 'notifications') {
                      navigation.navigate('Notifications');
                    } else if (item.id === 'favorites') {
                      navigation.navigate('Favorites');
                    } else if (item.id === 'cooked') {
                      navigation.navigate('CookingHistory');
                    } else if (item.id === 'my_shares') {
                      navigation.navigate('MySharedItems');
                    } else {
                      Alert.alert(item.title, 'Tính năng đang phát triển trong các bản cập nhật tới!');
                    }
                  }}
                >
                  <View style={[styles.menuIconBox, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  {item.badge && (
                    <View style={styles.itemBadge}>
                      <Text style={styles.itemBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Phiên bản 1.0.0 • Vét Tủ - ChefMatch</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
    marginBottom: 12,
  },
  userName: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  statsBar: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  itemBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  itemBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
});

export default ProfileScreen;
