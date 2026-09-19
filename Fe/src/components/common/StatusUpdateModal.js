import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const STATUS_OPTIONS = [
  {
    key: 'AVAILABLE',
    title: 'Đang còn sẵn',
    description: 'Hiển thị trên bản tin để mọi người có thể nhắn tin xin nhận.',
    badgeText: 'Còn sẵn',
    badgeColor: '#10B981',
    badgeBg: '#ECFDF5',
  },
  {
    key: 'RESERVED',
    title: 'Đã hẹn người lấy',
    description: 'Đã có người hẹn lấy, tạm dừng nhận thêm yêu cầu mới.',
    badgeText: 'Đã hẹn',
    badgeColor: '#F59E0B',
    badgeBg: '#FFFBEB',
  },
  {
    key: 'COMPLETED',
    title: 'Đã tặng xong',
    description: 'Món đồ đã được trao tặng thành công, hoàn tất bài chia sẻ.',
    badgeText: 'Đã tặng',
    badgeColor: '#6B7280',
    badgeBg: '#F3F4F6',
  },
];

const StatusUpdateModal = ({
  visible,
  onClose,
  currentStatus,
  itemTitle,
  onSelectStatus,
  loading = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                { paddingBottom: Math.max(insets.bottom, 16) + 12 },
              ]}
            >
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Cập nhật trạng thái</Text>
                {itemTitle ? (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {itemTitle}
                  </Text>
                ) : (
                  <Text style={styles.subtitle}>
                    Chọn trạng thái mới phù hợp với bài chia sẻ của bạn
                  </Text>
                )}
              </View>

              {/* Options List */}
              <View style={styles.optionsList}>
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = currentStatus === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardSelected,
                      ]}
                      onPress={() => {
                        if (loading) return;
                        onSelectStatus(option.key);
                      }}
                      activeOpacity={0.7}
                      disabled={loading}
                    >
                      <View style={styles.optionContent}>
                        <View style={styles.optionHeaderRow}>
                          <Text
                            style={[
                              styles.optionTitle,
                              isSelected && styles.optionTitleSelected,
                            ]}
                          >
                            {option.title}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: option.badgeBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: option.badgeColor },
                              ]}
                            >
                              {option.badgeText}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.optionDescription}>
                          {option.description}
                        </Text>
                      </View>

                      <View style={styles.radioContainer}>
                        {isSelected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={Colors.primary}
                          />
                        ) : (
                          <View style={styles.radioCircleUnchecked} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Loading indicator if processing */}
              {loading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingText}>Đang cập nhật...</Text>
                </View>
              )}

              {/* Cancel / Close Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  optionsList: {
    gap: 12,
    marginBottom: 18,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF7ED',
  },
  optionContent: {
    flex: 1,
    paddingRight: 10,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  optionTitleSelected: {
    color: Colors.primaryDark,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  radioContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleUnchecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
});

export default StatusUpdateModal;
