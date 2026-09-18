import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import shareApi from '../../api/shareApi';
import chatApi from '../../api/chatApi';
import { useAuth } from '../../context/AuthContext';

const ShareDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { shareId } = route.params;

  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatStarting, setChatStarting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await shareApi.getShareById(shareId);
        if (res.success && res.data) {
          setShare(res.data);
        }
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể tải chi tiết bài chia sẻ');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [shareId]);

  const handleContactDonor = async () => {
    try {
      setChatStarting(true);
      const donorId = share?.createdBy?._id || share?.createdBy;
      const myId = user?._id || user?.id;

      const res = await chatApi.getOrCreateConversation(
        share._id,
        donorId,
        `Chào bạn! Mình thấy bạn đang chia sẻ món "${share.title}" (${share.quantity}), mình có thể xin nhận được không ạ?`,
        myId
      );

      setChatStarting(false);
      if (res.success && res.data) {
        const partner = res.data.participants?.find((p) => (p._id || p.id) !== myId) ||
          (typeof share.createdBy === 'object' ? share.createdBy : { name: 'Hàng xóm', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' });

        navigation.navigate('Chat', {
          conversationId: res.data._id,
          shareItem: res.data.shareId || share,
          donorUser: partner,
        });
      }
    } catch (err) {
      setChatStarting(false);
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc trò chuyện. Vui lòng thử lại!');
    }
  };

  const handleCall = () => {
    if (share?.contactPhone) {
      Linking.openURL(`tel:${share.contactPhone}`);
    } else {
      Alert.alert('Thông báo', 'Người tặng không công khai số điện thoại, vui lòng nhắn tin qua app');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang tải chi tiết...</Text>
      </View>
    );
  }

  if (!share) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>Không tìm thấy bài chia sẻ</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Floating Back Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => Alert.alert('Chia sẻ', 'Đã sao chép liên kết bài đăng!')}
          activeOpacity={0.8}
        >
          <Ionicons name="share-social-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Food Photo */}
        <Image
          source={{
            uri:
              share.images?.[0] ||
              'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800',
          }}
          style={styles.foodImage}
        />

        {/* Content Body */}
        <View style={styles.contentBody}>
          {/* Badge Row */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                share.type === 'GIFT' ? styles.badgeGift : styles.badgeExchange,
              ]}
            >
              <Text style={styles.typeBadgeText}>
                {share.type === 'GIFT' ? '🎁 Tặng miễn phí (0đ)' : '🔄 Đổi đồ'}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                share.status === 'COMPLETED' && { backgroundColor: '#F3F4F6' },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  share.status === 'COMPLETED' && { backgroundColor: '#9CA3AF' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  share.status === 'COMPLETED' && { color: '#6B7280' },
                ]}
              >
                {share.status === 'COMPLETED' ? 'Đã có người nhận' : 'Đang còn sẵn'}
              </Text>
            </View>
          </View>

          {/* Title & Quantity */}
          <Text style={styles.title}>{share.title}</Text>

          <View style={styles.quantityCard}>
            <View style={styles.quantityLeft}>
              <Ionicons name="cube" size={20} color={Colors.primary} />
              <Text style={styles.quantityLabel}>Số lượng chia sẻ:</Text>
            </View>
            <Text style={styles.quantityValue}>{share.quantity}</Text>
          </View>

          {/* Description */}
          <Text style={styles.sectionHeading}>Mô tả chi tiết</Text>
          <Text style={styles.description}>
            {share.description || 'Thực phẩm tươi sạch còn dư trong tủ lạnh, chia sẻ cho hàng xóm có nhu cầu sử dụng.'}
          </Text>

          {/* Location & Pickup Info */}
          <Text style={styles.sectionHeading}>Địa điểm & Thời gian nhận</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color={Colors.primary} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoTitle}>Khu vực nhận đồ</Text>
                <Text style={styles.infoDesc}>{share.addressName}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#F59E0B" />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoTitle}>Ghi chú nhận đồ</Text>
                <Text style={styles.infoDesc}>{share.contactNote}</Text>
              </View>
            </View>
          </View>

          {/* Donor Profile Card */}
          <Text style={styles.sectionHeading}>Thông tin người chia sẻ</Text>
          <View style={styles.donorCard}>
            <Image
              source={{
                uri:
                  share.createdBy?.avatar ||
                  'https://cdn-icons-png.flaticon.com/512/847/847969.png',
              }}
              style={styles.donorAvatar}
            />
            <View style={styles.donorDetails}>
              <Text style={styles.donorName}>{share.createdBy?.name || 'Hàng xóm thân thiện'}</Text>
              <View style={styles.donorMeta}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color="#F59E0B" />
                  <Text style={styles.ratingText}>{share.createdBy?.rating || '5.0'}</Text>
                </View>
                <Text style={styles.verifiedText}>• Đã chia sẻ 3 lần</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Dock */}
      <View
        style={[
          styles.bottomDock,
          { paddingBottom: Math.max(insets.bottom, 16) + 10 },
        ]}
      >
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
          <Ionicons name="call-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.claimMainBtn,
            share.status === 'COMPLETED' && { backgroundColor: '#9CA3AF' },
          ]}
          onPress={handleContactDonor}
          activeOpacity={0.85}
        >
          <Ionicons
            name={share.status === 'COMPLETED' ? 'checkmark-circle' : 'chatbubble-ellipses'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.claimMainText}>
            {share.status === 'COMPLETED' ? 'Món này đã hoàn tất nhận' : 'Nhắn tin nhận món này'}
          </Text>
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
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  foodImage: {
    width: '100%',
    height: 280,
    backgroundColor: '#E5E7EB',
  },
  contentBody: {
    backgroundColor: '#FAF9F6',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeGift: {
    backgroundColor: '#10B981',
  },
  badgeExchange: {
    backgroundColor: '#F59E0B',
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 28,
    marginBottom: 16,
  },
  quantityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  quantityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quantityValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoTextCol: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  donorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    gap: 14,
  },
  donorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  donorDetails: {
    flex: 1,
  },
  donorName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  donorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  verifiedText: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  callBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: 16,
    gap: 8,
  },
  claimMainText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default ShareDetailScreen;
