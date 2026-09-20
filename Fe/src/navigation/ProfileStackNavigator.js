import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ConversationsListScreen from '../screens/chat/ConversationsListScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import NotificationScreen from '../screens/notification/NotificationScreen';
import FavoritesScreen from '../screens/recipe/FavoritesScreen';
import RecipeDetailScreen from '../screens/recipe/RecipeDetailScreen';
import CookingHistoryScreen from '../screens/cooking/CookingHistoryScreen';
import MySharedItemsScreen from '../screens/community/MySharedItemsScreen';
import ShareDetailScreen from '../screens/community/ShareDetailScreen';
import CreateShareScreen from '../screens/community/CreateShareScreen';
import PantryManagerScreen from '../screens/pantry/PantryManagerScreen';
import PantryScreen from '../screens/pantry/PantryScreen';
import RecipeResultsScreen from '../screens/recipe/RecipeResultsScreen';
import MealPlannerScreen from '../screens/mealplan/MealPlannerScreen';

const Stack = createNativeStackNavigator();

const ProfileStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="PantryManager" component={PantryManagerScreen} />
      <Stack.Screen name="Pantry" component={PantryScreen} />
      <Stack.Screen name="RecipeResults" component={RecipeResultsScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="CookingHistory" component={CookingHistoryScreen} />
      <Stack.Screen name="MySharedItems" component={MySharedItemsScreen} />
      <Stack.Screen name="ShareDetail" component={ShareDetailScreen} />
      <Stack.Screen name="CreateShare" component={CreateShareScreen} />
      <Stack.Screen name="MealPlanner" component={MealPlannerScreen} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <Stack.Screen name="ConversationsList" component={ConversationsListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
    </Stack.Navigator>
  );
};

export default ProfileStackNavigator;
