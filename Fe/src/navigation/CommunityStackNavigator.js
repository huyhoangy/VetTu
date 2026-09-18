import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CommunityScreen from '../screens/community/CommunityScreen';
import CreateShareScreen from '../screens/community/CreateShareScreen';
import ShareDetailScreen from '../screens/community/ShareDetailScreen';
import MySharedItemsScreen from '../screens/community/MySharedItemsScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import NotificationScreen from '../screens/notification/NotificationScreen';

const Stack = createNativeStackNavigator();

const CommunityStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="CommunityMain" component={CommunityScreen} />
      <Stack.Screen name="CreateShare" component={CreateShareScreen} />
      <Stack.Screen name="ShareDetail" component={ShareDetailScreen} />
      <Stack.Screen name="MySharedItems" component={MySharedItemsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
    </Stack.Navigator>
  );
};

export default CommunityStackNavigator;
