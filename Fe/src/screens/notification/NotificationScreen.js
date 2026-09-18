import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import notificationApi from '../../api/notificationApi';

const FILTER_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'MESSAGE', label: 'Tin nhắn 💬' },
  { id: 'NEW_SHARE', label: 'Món tặng 🎁' },
  { id: 'CLAIM_CONFIRMED', label: 'Giao dịch 🎉' },
];

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Vừa xong';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const NotificationScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const currentUserId = user?._id || user?.id;

  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await notificationApi.getNotifications(currentUserId);
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications(true);
    }, [fetchNotifications])
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead(currentUserId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.log('Error markAllAsRead:', error);
    }
  };

  const handleNotificationPress = async (item) => {
    // 1. Mark as read
    if (!item.isRead) {
      try {
        notificationApi.markAsRead(item._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
      } catch (e) {}
    }

    // 2. Navigate to relevant target
    if (item.type === 'MESSAGE' && item.data?.conversationId) {
      navigation.navigate('Chat', {
        conversationId: item.data.conversationId,
        donorUser: item.sender || { name: 'Hàng xóm', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' },
      });
    } else if (item.type === 'NEW_SHARE' && item.data?.shareId) {
      navigation.navigate('ShareDetail', {
        shareId: item.data.shareId?._id || item.data.shareId,
      });
    } else if (item.type === 'CLAIM_CONFIRMED' && item.data?.conversationId) {
      navigation.navigate('Chat', {
        conversationId: item.data.conversationId,
        donorUser: item.sender || { name: 'Hàng xóm', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' },
      });
    }
  };

  const handleDeleteNotification = (item) => {
    Alert.alert('Xóa thông báo', 'Bạn có muốn xóa thông báo này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await notificationApi.deleteNotification(item._id);
            setNotifications((prev) => prev.filter((n) => n._id !== item._id));
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể xóa thông báo');
          }
        },
      },
    ]);
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'ALL') return true;
    return item.type === activeFilter;
  });

  const getIconConfig = (type) => {
    switch (type) {
      case 'MESSAGE':
        return { name: 'chatbubble-ellipses', color: '#0284C7', bg: '#E0F2FE' };
      case 'NEW_SHARE':
        return { name: 'gift', color: '#16A34A', bg: '#DCFCE7' };
      case 'CLAIM_CONFIRMED':
        return { name: 'checkmark-circle', color: '#D97706', bg: '#FEF3C7' };
      default:
        return { name: 'notifications', color: Colors.primary, bg: '#FFF7ED' };
    }
  };

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

        <Text style={styles.headerTitle}>Thông báo 🔔</Text>

        <TouchableOpacity
          style={styles.readAllBtn}
          onPress={handleMarkAllAsRead}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
          <Text style={styles.readAllText}>Đã đọc</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 30 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>Chưa có thông báo mới</Text>
              <Text style={styles.emptyDesc}>
                Khi có tin nhắn mới hoặc hàng xóm chia sẻ thực phẩm gần bạn, thông báo sẽ hiển thị tại đây!
              </Text>
            </View>
          ) : (
            filteredNotifications.map((item) => {
              const iconCfg = getIconConfig(item.type);
              return (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
                  onPress={() => handleNotificationPress(item)}
                  activeOpacity={0.8}
                >
                  {/* Icon Avatar */}
                  <View style={[styles.iconWrapper, { backgroundColor: iconCfg.bg }]}>
                    <Ionicons name={iconCfg.name} size={22} color={iconCfg.color} />
                  </View>

                  {/* Body Content */}
                  <View style={styles.cardContent}>
                    <View style={styles.topRow}>
                      <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </View>

                    <Text style={styles.cardMessage} numberOfLines={2}>
                      {item.message}
                    </Text>

                    <View style={styles.bottomRow}>
                      <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
                    </View>
                  </View>

                  {/* Delete Button */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteNotification(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  readAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  filterTabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterTabsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  scrollList: {
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 70,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  notifCardUnread: {
    backgroundColor: '#FFFDF9',
    borderColor: '#FED7AA',
    borderWidth: 1.5,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  cardTitleUnread: {
    fontWeight: '800',
    color: Colors.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 6,
  },
  cardMessage: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 6,
  },
});

export default NotificationScreen;
