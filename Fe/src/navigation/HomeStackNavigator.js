import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import PantryScreen from '../screens/pantry/PantryScreen';
import RecipeResultsScreen from '../screens/recipe/RecipeResultsScreen';
import RecipeDetailScreen from '../screens/recipe/RecipeDetailScreen';
import NotificationScreen from '../screens/notification/NotificationScreen';
import FavoritesScreen from '../screens/recipe/FavoritesScreen';

const Stack = createNativeStackNavigator();

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="HomeDashboard" component={HomeScreen} />
      <Stack.Screen name="Pantry" component={PantryScreen} />
      <Stack.Screen name="RecipeResults" component={RecipeResultsScreen} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
