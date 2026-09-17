import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import CustomButton from '../../components/common/CustomButton';
import { useAuth } from '../../context/AuthContext';
import recipeApi from '../../api/recipeApi';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [recipeCount, setRecipeCount] = useState(8);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await recipeApi.getAllRecipes();
        if (res.success && res.count) {
          setRecipeCount(res.count);
        }
      } catch (err) {
        // Fallback default
      }
    };
    loadStats();
  }, []);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 16) + 12,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Profile Bar */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: user?.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.greeting}>Xin chào 👋</Text>
            <Text style={styles.userName}>{user?.name || 'Đầu bếp Vét Tủ'}</Text>
          </View>
        </View>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.ratingText}>{user?.rating || '5.0'}</Text>
        </View>
      </View>

      {/* Welcome Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroEmoji}>🥦🍳🥘</Text>
        <Text style={styles.heroTitle}>Tủ lạnh hôm nay còn gì?</Text>
        <Text style={styles.heroDesc}>
          Chọn nhanh các nguyên liệu bạn đang có để thuật toán gợi ý ngay món ăn phù hợp nhất!
        </Text>
        <CustomButton
          title="Bắt đầu Vét Tủ 🚀"
          onPress={() => navigation.navigate('Pantry')}
          style={styles.heroButton}
        />
      </View>

      {/* Quick Stats / Info */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="restaurant-outline" size={24} color={Colors.primary} />
          <Text style={styles.statValue}>{recipeCount}+</Text>
          <Text style={styles.statLabel}>Công thức</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="people-outline" size={24} color={Colors.secondary} />
          <Text style={styles.statValue}>45</Text>
          <Text style={styles.statLabel}>Hàng xóm chia sẻ</Text>
        </View>
      </View>

      {/* Logout Button */}
      <CustomButton
        title="Đăng xuất"
        variant="outline"
        onPress={handleLogout}
        style={styles.logoutButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  greeting: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  ratingText: {
    fontWeight: '700',
    fontSize: 13,
    color: '#92400E',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  heroButton: {
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    marginTop: 10,
  },
});

export default HomeScreen;
