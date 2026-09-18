import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import chatApi from '../../api/chatApi';
import notificationApi from '../../api/notificationApi';

const QUICK_ACTIONS = [
  '⏰ Hẹn bạn 18h tối nay nhé',
  '📍 Cho mình xin địa chỉ cụ thể nhé',
  '🛵 Mình đang qua lấy đồ rồi ạ',
  '❤️ Cảm ơn bạn rất nhiều!',
];

const ChatScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversationId, shareItem, donorUser } = route.params;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationStatus, setConversationStatus] = useState(shareItem?.status || 'AVAILABLE');
  const scrollViewRef = useRef();

  const currentUserId = user?._id || user?.id;

  const fetchMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await chatApi.getMessages(conversationId, currentUserId);
      if (res.success && res.data) {
        setMessages(res.data);
        if (res.conversationStatus) {
          setConversationStatus(res.conversationStatus);
        }
      }
    } catch (error) {
      // Fallback
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Mark all notifications for this conversation as read
    if (conversationId && currentUserId) {
      notificationApi.markReadByConversation(conversationId, currentUserId).catch(() => {});
    }
    // Poll for new messages and status updates every 2.5 seconds
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [conversationId, currentUserId]);

  const handleSend = async (customText) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || sending) return;

    try {
      setSending(true);
      setInputText('');

      const res = await chatApi.sendMessage(conversationId, textToSend, currentUserId);
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data]);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleConfirmReceived = () => {
    Alert.alert(
      'Xác nhận đã nhận thực phẩm 🎉',
      'Bạn đã nhận được món ăn này và muốn đánh dấu hoàn tất giao dịch? Trạng thái sẽ được cập nhật đồng bộ cho cả hai bên.',
      [
        { text: 'Chưa', style: 'cancel' },
        {
          text: 'Xác nhận hoàn tất',
          onPress: async () => {
            try {
              const res = await chatApi.confirmClaim(conversationId);
              if (res.success) {
                setConversationStatus('COMPLETED');
                fetchMessages(true);
                Alert.alert('Tuyệt vời! 🌟', 'Cảm ơn bạn đã đồng hành cùng cộng đồng Vét Tủ chống lãng phí thực phẩm!');
              }
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
            }
          },
        },
      ]
    );
  };

  const handleDeleteConversation = () => {
    Alert.alert(
      'Xóa đoạn chat 🗑️',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử tin nhắn của cuộc trò chuyện này ở phía bạn không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await chatApi.deleteConversation(conversationId, currentUserId);
              if (res.success) {
                Alert.alert('Đã xóa', 'Lịch sử đoạn chat đã được xóa thành công khỏi máy của bạn.');
                navigation.goBack();
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa cuộc trò chuyện lúc này');
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        <Image
          source={{
            uri:
              donorUser?.avatar ||
              'https://cdn-icons-png.flaticon.com/512/847/847969.png',
          }}
          style={styles.headerAvatar}
        />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {donorUser?.name || 'Hàng xóm'}
          </Text>
          <View style={styles.headerStatusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerStatusText}>Đang trực tuyến</Text>
          </View>
        </View>

        {/* Action buttons: Completed / Received Status & Delete */}
        <View style={styles.headerRightActions}>
          {conversationStatus === 'COMPLETED' ? (
            <View style={styles.completedHeaderBadge}>
              <Ionicons name="checkmark-done-circle" size={15} color="#059669" />
              <Text style={styles.completedHeaderBadgeText}>Đã nhận</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={handleConfirmReceived}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
              <Text style={styles.completeBtnText}>Đã nhận</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.deleteHeaderBtn}
            onPress={handleDeleteConversation}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Item Summary Card Pin */}
      {shareItem && (
        <View style={styles.itemPinCard}>
          <Image
            source={{
              uri:
                shareItem.images?.[0] ||
                'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800',
            }}
            style={styles.itemPinImg}
          />
          <View style={styles.itemPinInfo}>
            <Text style={styles.itemPinTitle} numberOfLines={1}>
              {shareItem.title}
            </Text>
            <Text style={styles.itemPinSub}>
              {shareItem.quantity} • {shareItem.type === 'GIFT' ? '🎁 Tặng 0đ' : '🔄 Đổi đồ'}
            </Text>
          </View>
          <View
            style={[
              styles.itemPinBadge,
              conversationStatus === 'COMPLETED' && styles.itemPinBadgeDone,
            ]}
          >
            <Text
              style={[
                styles.itemPinBadgeText,
                conversationStatus === 'COMPLETED' && styles.itemPinBadgeTextDone,
              ]}
            >
              {conversationStatus === 'COMPLETED' ? 'Đã nhận xong' : 'Đang hẹn lấy'}
            </Text>
          </View>
        </View>
      )}

      {/* Messages Scroll Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Đang tải đoạn chat...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: 16 },
          ]}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, idx) => {
            const isMe =
              msg.sender?._id === currentUserId ||
              msg.sender === currentUserId ||
              msg.sender?.id === currentUserId;

            if (msg.type === 'SYSTEM') {
              return (
                <View key={msg._id || `sys-${idx}`} style={styles.systemMsgBox}>
                  <Text style={styles.systemMsgText}>{msg.text}</Text>
                </View>
              );
            }

            return (
              <View
                key={msg._id || `msg-${idx}`}
                style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
              >
                {!isMe && (
                  <Image
                    source={{
                      uri:
                        msg.sender?.avatar ||
                        donorUser?.avatar ||
                        'https://cdn-icons-png.flaticon.com/512/847/847969.png',
                    }}
                    style={styles.msgAvatar}
                  />
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.bubbleMe : styles.bubbleOther,
                  ]}
                >
                  <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>
                    {msg.text}
                  </Text>
                  <Text style={[styles.messageTime, isMe ? styles.timeMe : styles.timeOther]}>
                    {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Quick Action Chips */}
      <View style={styles.quickChipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsRow}>
          {QUICK_ACTIONS.map((action, idx) => (
            <TouchableOpacity
              key={`action-${idx}`}
              style={styles.quickChip}
              onPress={() => handleSend(action)}
              activeOpacity={0.75}
            >
              <Text style={styles.quickChipText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bottom Chat Input Bar */}
      <View
        style={[
          styles.inputContainer,
          { paddingBottom: Math.max(insets.bottom, 12) + 8 },
        ]}
      >
        <TextInput
          style={styles.textInput}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={Colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  headerStatusText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  completeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  completedHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  completedHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  deleteHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  itemPinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  itemPinImg: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  itemPinInfo: {
    flex: 1,
  },
  itemPinTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  itemPinSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemPinBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemPinBadgeDone: {
    backgroundColor: '#ECFDF5',
  },
  itemPinBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  itemPinBadgeTextDone: {
    color: '#059669',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textMe: {
    color: '#FFFFFF',
  },
  textOther: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeMe: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  timeOther: {
    color: Colors.textSecondary,
  },
  systemMsgBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 12,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  systemMsgText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
  quickChipsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickChipText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    color: Colors.text,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

export default ChatScreen;
