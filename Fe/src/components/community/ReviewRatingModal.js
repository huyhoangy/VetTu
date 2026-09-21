import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import reviewApi from '../../api/reviewApi';

const STAR_SENTIMENTS = {
  1: 'Rất không hài lòng',
  2: 'Chưa hài lòng',
  3: 'Tạm ổn',
  4: 'Rất hài lòng',
  5: 'Tuyệt vời & Rất uy tín!',
};

const SUGGESTED_TAGS = [
  'Thực phẩm tươi sạch',
  'Đúng như mô tả',
  'Đóng gói cẩn thận',
  'Rất nhiệt tình & tốt bụng',
  'Đến lấy đúng giờ',
  'Lịch sự & thân thiện',
  'Tôn trọng thực phẩm',
  'Giao tiếp nhanh chóng',
];

const ReviewRatingModal = ({
  visible,
  onClose,
  targetUser,
  foodShare,
  onSuccess,
  currentUserId,
}) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(['Thực phẩm tươi sạch', 'Rất nhiệt tình & tốt bụng']);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!targetUser || !targetUser._id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người nhận đánh giá');
      return;
    }

    try {
      setSubmitting(true);
      const res = await reviewApi.createReview({
        fromUserId: currentUserId,
        targetUserId: targetUser._id,
        foodShareId: foodShare?._id || null,
        rating,
        tags: selectedTags,
        comment: comment.trim(),
        role: foodShare?.createdBy === currentUserId ? 'GIVER' : 'RECEIVER',
      });

      if (res && res.success) {
        Alert.alert('Cảm ơn bạn! 🎉', 'Đánh giá của bạn đã được ghi nhận vào điểm uy tín cộng đồng.');
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Không thể gửi đánh giá.');
    } finally {
      setSubmitting(false);
    }
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
              <Text style={styles.modalTitle}>Đánh Giá Trải Nghiệm</Text>
              <Text style={styles.modalSubTitle}>
                Đóng góp vào điểm uy tín cho {targetUser?.name || 'người dùng'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Food Share context info if available */}
            {foodShare && (
              <View style={styles.itemBox}>
                <Ionicons name="gift-outline" size={18} color={Colors.primary} />
                <Text style={styles.itemTitle} numberOfLines={1}>
                  Món: {foodShare.title} ({foodShare.quantity || '1 phần'})
                </Text>
              </View>
            )}

            {/* Interactive 5 Stars */}
            <View style={styles.starSection}>
              <Text style={styles.starSectionLabel}>Bạn chấm trải nghiệm này mấy sao?</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isFilled = starVal <= rating;
                  return (
                    <TouchableOpacity
                      key={starVal}
                      style={styles.starBtn}
                      onPress={() => setRating(starVal)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isFilled ? 'star' : 'star-outline'}
                        size={36}
                        color={isFilled ? '#F59E0B' : '#CBD5E1'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.sentimentText}>{STAR_SENTIMENTS[rating]}</Text>
            </View>

            {/* Praise Tags */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Điểm nổi bật & Lời khen</Text>
              <View style={styles.tagsContainer}>
                {SUGGESTED_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'add'}
                        size={14}
                        color={isSelected ? Colors.primary : '#64748B'}
                      />
                      <Text
                        style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Comment Note */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Lời cảm ơn hoặc nhận xét (Tùy chọn)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Cảm ơn bạn rất nhiều, thực phẩm rất tươi và chuẩn hẹn..."
                placeholderTextColor="#94A3B8"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>
          </ScrollView>

          {/* Submit Action */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Gửi đánh giá ({rating} sao)</Text>
              )}
            </TouchableOpacity>
          </View>
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
    maxHeight: '88%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
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
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  itemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A3412',
    flex: 1,
  },
  starSection: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  starSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  starBtn: {
    padding: 4,
  },
  sentimentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagChipSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  tagChipText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '600',
  },
  tagChipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 14,
    color: '#0F172A',
    height: 85,
    textAlignVertical: 'top',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ReviewRatingModal;
