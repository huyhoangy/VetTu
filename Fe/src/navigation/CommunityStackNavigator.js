import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CommunityScreen from '../screens/community/CommunityScreen';
import CreateShareScreen from '../screens/community/CreateShareScreen';
import ShareDetailScreen from '../screens/community/ShareDetailScreen';

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
    </Stack.Navigator>
  );
};

export default CommunityStackNavigator;
