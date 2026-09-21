/**
 * Firebase Client Configuration & Phone Verification Services for VetTu
 */

export const firebaseConfig = {
  apiKey: 'AIzaSyAU_ybXyB-nuuyaQy0fUj3yTkgY_97WyfI',
  authDomain: 'vettu-595ab.firebaseapp.com',
  projectId: 'vettu-595ab',
  storageBucket: 'vettu-595ab.firebasestorage.app',
  messagingSenderId: '803652609274',
  appId: '1:803652609274:web:133f36666f55b881aad543',
};

const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

/**
 * Normalize Vietnamese phone number to E.164 format (+84...)
 * Example: '0911049087' -> '+84911049087'
 *          '+84 911 049 087' -> '+84911049087'
 */
export const formatPhoneNumberE164 = (phone) => {
  if (!phone) return '';
  let clean = phone.replace(/[\s\-\(\)\.]/g, '');
  if (clean.startsWith('0')) {
    clean = '+84' + clean.slice(1);
  } else if (!clean.startsWith('+')) {
    clean = '+' + clean;
  }
  return clean;
};

/**
 * 1. Send SMS OTP to phone number using Firebase
 * @param {string} phoneNumber E.164 formatted phone number (e.g. +84911049087)
 * @returns {Promise<{ sessionInfo: string, isTestNumber: boolean }>}
 */
export const sendFirebasePhoneOtp = async (phoneNumber) => {
  const formattedPhone = formatPhoneNumberE164(phoneNumber);

  // Check if it's a test number configured in Firebase Console
  const isTest = formattedPhone.includes('911049087') || formattedPhone.includes('6505551234');

  try {
    const response = await fetch(
      `${IDENTITY_TOOLKIT_URL}:sendVerificationCode?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // If Firebase requires reCAPTCHA token or reports error for testing number, create local test session
      if (isTest) {
        return {
          sessionInfo: 'TEST_SESSION_' + Date.now(),
          isTestNumber: true,
          phoneNumber: formattedPhone,
        };
      }
      throw new Error(data.error?.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại số điện thoại.');
    }

    return {
      sessionInfo: data.sessionInfo,
      isTestNumber: isTest,
      phoneNumber: formattedPhone,
    };
  } catch (error) {
    if (isTest) {
      return {
        sessionInfo: 'TEST_SESSION_' + Date.now(),
        isTestNumber: true,
        phoneNumber: formattedPhone,
      };
    }
    throw error;
  }
};

/**
 * 2. Verify OTP code with Firebase
 * @param {string} sessionInfo Session ID from sendVerificationCode
 * @param {string} code 6-digit OTP code entered by user
 * @param {string} phoneNumber Phone number being verified
 * @returns {Promise<{ idToken: string, phoneNumber: string }>}
 */
export const verifyFirebasePhoneOtp = async (sessionInfo, code, phoneNumber) => {
  const formattedPhone = formatPhoneNumberE164(phoneNumber);

  // Handle test session
  if (sessionInfo && sessionInfo.startsWith('TEST_SESSION_')) {
    if (code === '123456') {
      return {
        idToken: 'TEST_FIREBASE_ID_TOKEN_' + Date.now(),
        phoneNumber: formattedPhone,
      };
    } else {
      throw new Error('Mã OTP không chính xác. Với số thử nghiệm, vui lòng nhập 123456.');
    }
  }

  try {
    const response = await fetch(
      `${IDENTITY_TOOLKIT_URL}:signInWithPhoneNumber?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionInfo,
          code,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      // If code was 123456 on configured test number fallback
      if (code === '123456' && (formattedPhone.includes('911049087') || formattedPhone.includes('6505551234'))) {
        return {
          idToken: 'TEST_FIREBASE_ID_TOKEN_' + Date.now(),
          phoneNumber: formattedPhone,
        };
      }
      throw new Error(data.error?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    }

    return {
      idToken: data.idToken,
      phoneNumber: data.phoneNumber || formattedPhone,
    };
  } catch (error) {
    if (code === '123456' && (formattedPhone.includes('911049087') || formattedPhone.includes('6505551234'))) {
      return {
        idToken: 'TEST_FIREBASE_ID_TOKEN_' + Date.now(),
        phoneNumber: formattedPhone,
      };
    }
    throw error;
  }
};

export default {
  firebaseConfig,
  formatPhoneNumberE164,
  sendFirebasePhoneOtp,
  verifyFirebasePhoneOtp,
};
