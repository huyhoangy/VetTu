import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authApi from '../api/authApi';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved session on app launch
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('user_token');
        const storedUser = await AsyncStorage.getItem('user_profile');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await authApi.login({ email, password });
      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data;
        setUser(userData);
        setToken(userToken);
        await AsyncStorage.setItem('user_token', userToken);
        await AsyncStorage.setItem('user_profile', JSON.stringify(userData));
        return { success: true };
      }
      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // Login with Firebase ID Token
  const loginWithFirebase = async (idToken) => {
    try {
      const response = await authApi.firebaseLogin(idToken);
      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data;
        setUser(userData);
        setToken(userToken);
        await AsyncStorage.setItem('user_token', userToken);
        await AsyncStorage.setItem('user_profile', JSON.stringify(userData));
        return { success: true };
      }
      return { success: false, message: response.message || 'Firebase login failed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // Register handler
  const register = async (name, email, password, phone) => {
    try {
      const response = await authApi.register({ name, email, password, phone });
      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data;
        setUser(userData);
        setToken(userToken);
        await AsyncStorage.setItem('user_token', userToken);
        await AsyncStorage.setItem('user_profile', JSON.stringify(userData));
        return { success: true };
      }
      return { success: false, message: response.message || 'Registration failed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem('user_token');
      await AsyncStorage.removeItem('user_profile');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        loginWithFirebase,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
