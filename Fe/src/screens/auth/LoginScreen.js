import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Colors } from '../../constants/colors';
import CustomInput from '../../components/common/CustomInput';
import CustomButton from '../../components/common/CustomButton';
import { useAuth } from '../../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }) => {
  const { login, loginWithFirebase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải từ 6 ký tự trở lên';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Đăng nhập thất bại', result.message || 'Email hoặc mật khẩu không chính xác');
    }
  };

  // Google OAuth configuration with PKCE complying with Google OAuth 2.0 security policy
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (response) {
      console.log('[Google Sign-In] Response received:', JSON.stringify(response, null, 2));

      if (response.type === 'success') {
        const token =
          response.params?.id_token ||
          response.authentication?.idToken ||
          response.params?.access_token ||
          response.authentication?.accessToken;

        console.log('[Google Sign-In] Token trích xuất:', token ? `${token.substring(0, 15)}...` : 'null');

        if (token) {
          (async () => {
            setSocialLoading(true);
            const authResult = await loginWithFirebase(token);
            setSocialLoading(false);

            if (!authResult.success) {
              Alert.alert('Đăng nhập Google thất bại', authResult.message || 'Không thể xác thực tài khoản Google');
            }
          })();
        } else {
          Alert.alert('Lỗi xác thực', 'Không tìm thấy id_token trong phản hồi Google.');
        }
      } else if (response.type === 'error') {
        console.error('[Google Sign-In Error]:', response.error);
        Alert.alert('Google Sign-In Lỗi', response.error?.message || 'Có lỗi xảy ra khi xác thực');
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
        console.log('[Google Sign-In] Người dùng đóng popup đăng nhập');
      }
    }
  }, [response]);

  const handleGoogleSignIn = async () => {
    if (promptAsync) {
      try {
        console.log('--- [Google Sign-In] Bắt đầu gọi promptAsync() ---');
        setSocialLoading(true);
        const res = await promptAsync();
        console.log('[Google Sign-In] Kết quả promptAsync:', JSON.stringify(res, null, 2));
      } catch (err) {
        console.error('[Google Sign-In Exception]:', err);
        Alert.alert('Google Sign-In Lỗi', err.message);
      } finally {
        setSocialLoading(false);
      }
    } else {
      Alert.alert('Google Sign-In', 'Đang khởi tạo dịch vụ xác thực Google, vui lòng thử lại...');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>🍳</Text>
          </View>
          <Text style={styles.title}>Vét Tủ</Text>
          <Text style={styles.subtitle}>
            Tìm món ngon từ đồ thừa & Chia sẻ nguyên liệu cùng hàng xóm
          </Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Đăng nhập</Text>

          <CustomInput
            label="Email"
            iconName="mail-outline"
            placeholder="nhapemail@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors({ ...errors, email: null });
            }}
            keyboardType="email-address"
            error={errors.email}
          />

          <CustomInput
            label="Mật khẩu"
            iconName="lock-closed-outline"
            placeholder="Nhập mật khẩu của bạn"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: null });
            }}
            secureTextEntry
            error={errors.password}
          />

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => Alert.alert('Thông báo', 'Tính năng quên mật khẩu đang được phát triển')}
          >
            <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <CustomButton
            title="Đăng nhập"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          {/* Social Logins */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Hoặc đăng nhập bằng</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtonsContainer}>
            {/* Google Login Button */}
            <TouchableOpacity
              style={[
                styles.socialButton,
                Platform.OS !== 'ios' && { width: '100%' },
              ]}
              onPress={handleGoogleSignIn}
              disabled={socialLoading}
            >
              {socialLoading ? (
                <ActivityIndicator size="small" color="#DB4437" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple Login Button (Only visible on iOS) */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => Alert.alert('Apple Login', 'Đăng nhập Apple yêu cầu tài khoản Apple Developer')}
              >
                <Ionicons name="logo-apple" size={20} color="#000000" />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Footer Link to Register */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE8DF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    marginBottom: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default LoginScreen;
