import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { sendFirebasePhoneOtp, verifyFirebasePhoneOtp, formatPhoneNumberE164 } from '../../config/firebase';
import authApi from '../../api/authApi';

const PhoneVerificationModal = ({
  visible,
  onClose,
  currentUser,
  onSuccess,
}) => {
  const [step, setStep] = useState(1); // 1: Input phone, 2: Input OTP, 3: Success
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isTestNumber, setIsTestNumber] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setOtpCode('');
      setSessionInfo(null);
      setLoading(false);
      setCountdown(60);
      setCanResend(false);
      // Pre-fill user's existing phone if available
      if (currentUser?.phone) {
        setPhone(currentUser.phone);
      }
    }
  }, [visible, currentUser]);

  useEffect(() => {
    let timer = null;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    const rawPhone = phone.trim();
    if (!rawPhone || rawPhone.length < 9) {
      Alert.alert('Thông báo', 'Vui lòng nhập số điện thoại hợp lệ');
      return;
    }

    try {
      setLoading(true);
      const res = await sendFirebasePhoneOtp(rawPhone);
      setSessionInfo(res.sessionInfo);
      setIsTestNumber(res.isTestNumber);
      setStep(2);
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      Alert.alert('Lỗi gửi mã OTP', err.message || 'Không thể gửi mã xác nhận. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and save to Backend
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Thông báo', 'Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    try {
      setLoading(true);
      // 1. Verify with Firebase
      const firebaseRes = await verifyFirebasePhoneOtp(sessionInfo, otpCode, phone);

      // 2. Send token to Backend to issue verified badge
      const userId = currentUser?._id || currentUser?.id;
      const backendRes = await authApi.verifyPhone({
        idToken: firebaseRes.idToken,
        phoneNumber: firebaseRes.phoneNumber || phone,
        userId,
      });

      if (backendRes.success && backendRes.data?.user) {
        setStep(3);
        if (onSuccess) {
          onSuccess(backendRes.data.user);
        }
      } else {
        throw new Error(backendRes.message || 'Xác thực tài khoản thất bại');
      }
    } catch (err) {
      Alert.alert('Lỗi xác thực', err.response?.data?.message || err.message || 'Mã OTP không đúng hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.shieldIconBox}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              </View>
              <Text style={styles.headerTitle}>Xác Thực Tài Khoản</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Body Content by Step */}
          {step === 1 && (
            <View style={styles.stepBody}>
              <Text style={styles.descText}>
                Xác thực số điện thoại chính chủ để nhận ngay <Text style={styles.boldText}>Huy hiệu Tích Xanh Uy Tín ⭐</Text>, gia tăng độ tin cậy khi chia sẻ và nhận thực phẩm trong khu dân cư.
              </Text>

              <Text style={styles.inputLabel}>Số điện thoại của bạn</Text>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.flagEmoji}>🇻🇳</Text>
                  <Text style={styles.countryCodeText}>+84</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="0911 049 087"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  autoFocus
                />
              </View>

              <View style={styles.noteBox}>
                <Ionicons name="information-circle-outline" size={16} color="#0EA5E9" />
                <Text style={styles.noteText}>
                  Mã OTP 6 số sẽ được gửi bảo mật qua hệ thống Firebase Authentication.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (!phone || loading) && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={!phone || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Tiếp tục & Nhận mã OTP</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepBody}>
              <Text style={styles.descText}>
                Mã xác nhận 6 số đã được gửi đến số{' '}
                <Text style={styles.boldText}>{formatPhoneNumberE164(phone)}</Text>.
              </Text>

              {isTestNumber && (
                <View style={styles.testBadgeBox}>
                  <Ionicons name="bulb-outline" size={15} color="#D97706" />
                  <Text style={styles.testBadgeText}>
                    Số thử nghiệm Firebase: Nhập mã <Text style={{ fontWeight: '800' }}>123456</Text> để tiếp tục.
                  </Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Nhập mã OTP (6 chữ số)</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="• • • • • •"
                placeholderTextColor="#CBD5E1"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={setOtpCode}
                autoFocus
              />

              <View style={styles.resendRow}>
                {countdown > 0 ? (
                  <Text style={styles.countdownText}>
                    Gửi lại mã sau <Text style={{ color: Colors.primary, fontWeight: '700' }}>{countdown}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                    <Text style={styles.resendBtnText}>Gửi lại mã OTP</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={() => setStep(1)}>
                  <Text style={styles.changePhoneText}>Đổi số điện thoại</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, (otpCode.length !== 6 || loading) && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={otpCode.length !== 6 || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Xác Nhận & Cấp Tích Xanh</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && (
            <View style={styles.successBody}>
              <View style={styles.successIconBox}>
                <Ionicons name="shield-checkmark" size={48} color="#10B981" />
              </View>

              <Text style={styles.successTitle}>Xác Thực Thành Công! 🎉</Text>
              <Text style={styles.successDesc}>
                Số điện thoại <Text style={styles.boldText}>{formatPhoneNumberE164(phone)}</Text> đã được liên kết chính chủ. Tài khoản của bạn đã có Huy hiệu Tích Xanh bảo chứng uy tín trong cộng đồng Vét Tủ.
              </Text>

              <View style={styles.verifiedPreviewBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                <Text style={styles.verifiedPreviewText}>Đã xác thực chính chủ</Text>
              </View>

              <TouchableOpacity
                style={styles.successBtn}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.successBtnText}>Hoàn tất</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shieldIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBody: {
    marginTop: 4,
  },
  descText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    marginBottom: 14,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    gap: 6,
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  testBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  testBadgeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    color: Colors.primary,
    marginBottom: 16,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  countdownText: {
    fontSize: 13,
    color: '#64748B',
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  changePhoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textDecorationLine: 'underline',
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successBody: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  verifiedPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 24,
  },
  verifiedPreviewText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  successBtn: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  successBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default PhoneVerificationModal;
