import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import reviewApi from '../../api/reviewApi';
import { useAuth } from '../../context/AuthContext';

const formatDateRelative = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

  if (diffHours < 1) return 'Vừa xong';
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const UserReputationScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  
  const currentUserId = authUser?._id || authUser?.id;
  const targetUserId = route?.params?.userId || currentUserId;
  const isMe = targetUserId === currentUserId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reputationData, setReputationData] = useState(null);

  const fetchReputation = useCallback(async (isSilent = false) => {
    if (!targetUserId) return;
    try {
      if (!isSilent) setLoading(true);
      const res = await reviewApi.getUserReviews(targetUserId);
      if (res && res.data) {
        setReputationData(res.data);
      }
    } catch (err) {
      console.log('Error fetching user reputation:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchReputation();
  }, [fetchReputation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReputation(true);
  };

  const user = reputationData?.user || authUser;
  const stats = reputationData?.stats || { rating: 5.0, totalReviews: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  const badges = reputationData?.badges || [];
  const topTags = reputationData?.topTags || [];
  const reviews = reputationData?.reviews || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ Sơ Uy Tín</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 30 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Đang tải điểm uy tín...</Text>
          </View>
        ) : (
          <>
            {/* User Hero & Rating Score Card */}
            <View style={styles.scoreCard}>
              <View style={styles.userRow}>
                <Image
                  source={{
                    uri: user?.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
                  }}
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName}>{user?.name || 'Thành viên Vét Tủ'}</Text>
                    <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                  </View>
                  <Text style={styles.userRole}>
                    {isMe ? 'Hồ sơ của bạn' : 'Thành viên cộng đồng'}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreDivider} />

              {/* Big Score & Breakdown */}
              <View style={styles.scoreRow}>
                <View style={styles.bigScoreCol}>
                  <Text style={styles.bigScoreText}>{Number(stats.rating || 5.0).toFixed(1)}</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= Math.round(stats.rating || 5.0) ? 'star' : 'star-outline'}
                        size={16}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewCountText}>
                    {stats.totalReviews || 0} lượt đánh giá
                  </Text>
                </View>

                {/* Rating bars */}
                <View style={styles.breakdownCol}>
                  {[5, 4, 3, 2, 1].map((starNum) => {
                    const count = stats.breakdown?.[starNum] || 0;
                    const total = stats.totalReviews || 1;
                    const pct = Math.round((count / total) * 100);

                    return (
                      <View key={starNum} style={styles.barRow}>
                        <Text style={styles.barStarLabel}>{starNum}★</Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${pct}%`,
                                backgroundColor: starNum >= 4 ? '#F59E0B' : '#94A3B8',
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.barCountLabel}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Badges of Honor */}
            {badges.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Danh hiệu uy tín</Text>
                <View style={styles.badgesList}>
                  {badges.map((b) => (
                    <View key={b.id} style={styles.badgeItem}>
                      <View style={[styles.badgeIconCircle, { backgroundColor: `${b.color}15` }]}>
                        <Ionicons name={b.icon} size={20} color={b.color} />
                      </View>
                      <View style={styles.badgeTextInfo}>
                        <Text style={styles.badgeTitle}>{b.title}</Text>
                        <Text style={styles.badgeDesc}>{b.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Top Praise Tags */}
            {topTags.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Lời khen nổi bật</Text>
                <View style={styles.tagChipsWrap}>
                  {topTags.map((t, idx) => (
                    <View key={idx} style={styles.praiseChip}>
                      <Text style={styles.praiseChipText}>
                        {t.tag} <Text style={styles.praiseChipCount}>({t.count})</Text>
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Reviews List */}
            <View style={styles.sectionBlock}>
              <View style={styles.reviewsHeaderRow}>
                <Text style={styles.sectionTitle}>
                  Nhận xét từ cộng đồng ({reviews.length})
                </Text>
              </View>

              {reviews.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>🌟</Text>
                  <Text style={styles.emptyTitle}>Chưa có nhận xét nào</Text>
                  <Text style={styles.emptySubtitle}>
                    {isMe
                      ? 'Khi bạn chia sẻ thực phẩm và hoàn tất trao tặng, những lời cảm ơn của hàng xóm sẽ xuất hiện tại đây!'
                      : 'Người dùng này chưa có lượt đánh giá nào.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.reviewsList}>
                  {reviews.map((r) => (
                    <View key={r._id} style={styles.reviewCard}>
                      <View style={styles.reviewCardTop}>
                        <Image
                          source={{
                            uri:
                              r.fromUser?.avatar ||
                              'https://cdn-icons-png.flaticon.com/512/847/847969.png',
                          }}
                          style={styles.reviewerAvatar}
                        />
                        <View style={styles.reviewerInfo}>
                          <Text style={styles.reviewerName}>
                            {r.fromUser?.name || 'Hàng xóm Vét Tủ'}
                          </Text>
                          <Text style={styles.reviewDate}>
                            {formatDateRelative(r.createdAt)}
                          </Text>
                        </View>

                        <View style={styles.reviewStarsBadge}>
                          <Ionicons name="star" size={13} color="#F59E0B" />
                          <Text style={styles.reviewStarsText}>{r.rating}.0</Text>
                        </View>
                      </View>

                      {r.foodShare && (
                        <View style={styles.sharedItemTag}>
                          <Ionicons name="gift-outline" size={13} color="#9A3412" />
                          <Text style={styles.sharedItemText} numberOfLines={1}>
                            Món: {r.foodShare.title}
                          </Text>
                        </View>
                      )}

                      {r.tags && r.tags.length > 0 && (
                        <View style={styles.reviewTagsRow}>
                          {r.tags.map((tg, tgIdx) => (
                            <View key={tgIdx} style={styles.reviewTagItem}>
                              <Text style={styles.reviewTagItemText}>{tg}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {r.comment ? (
                        <Text style={styles.reviewComment}>"{r.comment}"</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  userRole: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  scoreDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bigScoreCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    minWidth: 100,
  },
  bigScoreText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 44,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  reviewCountText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  breakdownCol: {
    flex: 1,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barStarLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    width: 22,
  },
  barTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barCountLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    width: 18,
    textAlign: 'right',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
  },
  badgesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  badgeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextInfo: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 1,
  },
  badgeDesc: {
    fontSize: 11.5,
    color: '#64748B',
  },
  tagChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  praiseChip: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  praiseChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#9A3412',
  },
  praiseChipCount: {
    fontWeight: '800',
    color: Colors.primary,
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 30,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  reviewsList: {
    gap: 10,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  reviewStarsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  reviewStarsText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#B45309',
  },
  sharedItemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  sharedItemText: {
    fontSize: 11.5,
    color: '#9A3412',
    fontWeight: '600',
  },
  reviewTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  reviewTagItem: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reviewTagItemText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 2,
  },
});

export default UserReputationScreen;
