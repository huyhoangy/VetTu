import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  requestNotificationPermissions,
  initNotificationListeners,
  syncAndPushDeviceNotifications,
} from './src/services/notificationService';

function NotificationWatcher() {
  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?._id || user?.id;

  useEffect(() => {
    // 1. Request OS notification permissions
    requestNotificationPermissions();

    // 2. Attach notification response listener for device banners
    const sub = initNotificationListeners();

    return () => {
      if (sub && sub.remove) sub.remove();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      // Check immediately
      syncAndPushDeviceNotifications(currentUserId);

      // Check every 5 seconds for new background notifications to trigger device alerts
      const interval = setInterval(() => {
        syncAndPushDeviceNotifications(currentUserId);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, currentUserId]);

  return null;
}

import InAppNotificationBanner from './src/components/common/InAppNotificationBanner';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <NotificationWatcher />
        <InAppNotificationBanner />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
