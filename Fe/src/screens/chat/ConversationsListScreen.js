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
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import chatApi from '../../api/chatApi';

const ConversationsListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentUserId = user?._id || user?.id;

  const fetchConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await chatApi.getUserConversations(currentUserId);
      if (res.success && res.data) {
        setConversations(res.data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations(true);
    }, [fetchConversations])
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations(true);
  };

  const handleDeleteConversation = (convId, partnerName) => {
    Alert.alert(
      'Xóa đoạn chat 🗑️',
      `Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện với "${partnerName || 'hàng xóm'}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await chatApi.deleteConversation(convId, currentUserId);
              if (res.success) {
                setConversations((prev) => prev.filter((c) => c._id !== convId));
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa đoạn hội thoại');
            }
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>Tin nhắn & Nhận món 💬</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main List Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải lịch sử tin nhắn...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>Chưa có đoạn chat nào</Text>
              <Text style={styles.emptyDesc}>
                Khi bạn bấm "Nhắn tin nhận món" ở Tab Cộng đồng, lịch sử trò chuyện với hàng xóm sẽ xuất hiện tại đây!
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Community' })}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreBtnText}>Khám phá cộng đồng ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            conversations.map((conv) => {
              const partner = conv.participants?.find(
                (p) => (p._id || p.id) !== currentUserId
              ) || conv.participants?.[0];

              const shareItem = conv.shareId;

              return (
                <TouchableOpacity
                  key={conv._id}
                  style={styles.convCard}
                  activeOpacity={0.75}
                  onPress={() =>
                    navigation.navigate('Chat', {
                      conversationId: conv._id,
                      shareItem: conv.shareId,
                      donorUser: partner,
                    })
                  }
                  onLongPress={() => handleDeleteConversation(conv._id, partner?.name)}
                >
                  {/* Item / Partner Photo */}
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={{
                        uri:
                          partner?.avatar ||
                          'https://cdn-icons-png.flaticon.com/512/847/847969.png',
                      }}
                      style={styles.donorAvatar}
                    />
                    {shareItem?.images?.[0] && (
                      <Image
                        source={{ uri: shareItem.images[0] }}
                        style={styles.itemMiniThumb}
                      />
                    )}
                  </View>

                  {/* Message Info */}
                  <View style={styles.convInfo}>
                    <View style={styles.convTopRow}>
                      <Text style={styles.partnerName} numberOfLines={1}>
                        {partner?.name || 'Hàng xóm'}
                      </Text>
                      <Text style={styles.timeText}>
                        {new Date(conv.updatedAt || conv.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    {shareItem && (
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        Món: {shareItem.title} ({shareItem.quantity})
                      </Text>
                    )}

                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {conv.lastMessage?.text || 'Bắt đầu cuộc trò chuyện...'}
                    </Text>
                  </View>

                  {/* Status & Delete action */}
                  <View style={styles.convActionsRight}>
                    {conv.status === 'COMPLETED' ? (
                      <View style={styles.doneTag}>
                        <Ionicons name="checkmark-done" size={12} color="#065F46" />
                        <Text style={styles.doneTagText}>Đã nhận</Text>
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    )}

                    <TouchableOpacity
                      style={styles.deleteBtnMini}
                      onPress={() => handleDeleteConversation(conv._id, partner?.name)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
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
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  donorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  itemMiniThumb: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  convInfo: {
    flex: 1,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 3,
  },
  lastMessage: {
    fontSize: 13,
    color: '#4B5563',
  },
  convActionsRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 8,
    gap: 8,
  },
  deleteBtnMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  doneTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 50,
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
    marginBottom: 24,
  },
  exploreBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ConversationsListScreen;
