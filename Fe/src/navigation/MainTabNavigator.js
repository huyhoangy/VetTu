import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import HomeStackNavigator from './HomeStackNavigator';
import { Colors } from '../constants/colors';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 10;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          height: 60 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'restaurant-outline';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'fast-food' : 'fast-food-outline';
          } else if (route.name === 'Community') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ tabBarLabel: 'Vét Tủ' }}
      />
      <Tab.Screen
        name="Community"
        component={HomeScreen}
        options={{ tabBarLabel: 'Cộng đồng' }}
      />
      <Tab.Screen
        name="Profile"
        component={HomeScreen}
        options={{ tabBarLabel: 'Cá nhân' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
