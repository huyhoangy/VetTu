import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Vibration,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { navigate } from '../../navigation/navigationRef';
import { setInAppNotificationCallback } from '../../services/notificationService';

const InAppNotificationBanner = () => {
  const insets = useSafeAreaInsets();
  const [notification, setNotification] = useState(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const timeoutRef = useRef(null);

  const dismiss = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setNotification(null);
    });
  };

  const show = (notif) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setNotification(notif);

    // Subtle vibration on notification arrive
    try {
      Vibration.vibrate(80);
    } catch (e) {}

    Animated.spring(translateY, {
      toValue: 0,
      tension: 60,
      friction: 9,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after 4.5 seconds
    timeoutRef.current = setTimeout(() => {
      dismiss();
    }, 4500);
  };

  useEffect(() => {
    setInAppNotificationCallback(show);
  }, []);

  const handlePress = () => {
    if (!notification) return;
    const { data, type } = notification;
    dismiss();

    if (type === 'MESSAGE' && data?.conversationId) {
      navigate('Chat', {
        conversationId: data.conversationId,
        donorUser: data.sender || { name: 'Hàng xóm', avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png' },
      });
    } else if (type === 'NEW_SHARE' && data?.shareId) {
      navigate('ShareDetail', {
        shareId: data.shareId,
      });
    } else if (type === 'CLAIM_CONFIRMED' && data?.conversationId) {
      navigate('Chat', {
        conversationId: data.conversationId,
      });
    }
  };

  if (!notification) return null;

  const getIcon = (type) => {
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

  const iconCfg = getIcon(notification.type);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 16) + 4,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        activeOpacity={0.9}
        onPress={handlePress}
      >
        <View style={[styles.iconBox, { backgroundColor: iconCfg.bg }]}>
          <Ionicons name={iconCfg.name} size={20} color={iconCfg.color} />
        </View>

        <View style={styles.textBox}>
          <View style={styles.topRow}>
            <Text style={styles.appTag}>VÉT TỦ • Vừa xong</Text>
            <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message || notification.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textBox: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  appTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
});

export default InAppNotificationBanner;
