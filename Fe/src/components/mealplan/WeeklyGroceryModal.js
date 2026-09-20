import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import mealPlanApi from '../../api/mealPlanApi';

const WeeklyGroceryModal = ({ visible, onClose, weekStartDate }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    neededToBuy: [],
    alreadyInPantry: [],
    totalMealsCount: 0,
    totalIngredients: 0,
  });
  const [activeTab, setActiveTab] = useState('NEEDED'); // 'NEEDED' | 'PANTRY'
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    if (visible) {
      fetchGroceryList();
    }
  }, [visible, weekStartDate]);

  const fetchGroceryList = async () => {
    try {
      setLoading(true);
      const res = await mealPlanApi.getGroceryList({ weekStart: weekStartDate });
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.log('Error fetching grocery list:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (name) => {
    setCheckedItems((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleShareList = async () => {
    if (!data.neededToBuy || data.neededToBuy.length === 0) {
      Alert.alert('Thông báo', 'Không có nguyên liệu nào cần mua thêm trong tuần này!');
      return;
    }

    const itemsText = data.neededToBuy
      .map((item, idx) => {
        const isChecked = checkedItems[item.name] ? '☑' : '☐';
        const qty = item.quantity ? ` (${item.quantity} ${item.unit || ''})` : '';
        const dishes = item.dishSources?.length > 0 ? ` [Dùng cho: ${item.dishSources.join(', ')}]` : '';
        return `${isChecked} ${idx + 1}. ${item.name}${qty}${dishes}`;
      })
      .join('\n');

    const messageText = `🛒 DANH SÁCH ĐI CHỢ TUẦN (${weekStartDate || 'Tuần này'})\n(Tổng cộng ${data.neededToBuy.length} nguyên liệu cần mua)\n\n${itemsText}\n\n-- Được tạo bởi Vét Tủ 🥦🍳`;

    try {
      await Share.share({
        message: messageText,
        title: 'Danh Sách Đi Chợ Tuần',
      });
    } catch (e) {
      Alert.alert('Thông báo', 'Không thể chia sẻ danh sách.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.modalTitle}>🛒 Danh Sách Đi Chợ Tuần</Text>
              <Text style={styles.modalSubTitle}>
                Tự động đối chiếu với thực phẩm có sẵn trong tủ
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Summary Banner */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryVal}>{data.totalMealsCount || 0}</Text>
              <Text style={styles.summaryLabel}>Bữa ăn đã lên lịch</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: '#EF4444' }]}>
                {data.neededToBuy?.length || 0}
              </Text>
              <Text style={styles.summaryLabel}>Cần mua thêm</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: '#10B981' }]}>
                {data.alreadyInPantry?.length || 0}
              </Text>
              <Text style={styles.summaryLabel}>Có sẵn trong tủ</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'NEEDED' && styles.tabItemActive]}
              onPress={() => setActiveTab('NEEDED')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cart"
                size={16}
                color={activeTab === 'NEEDED' ? '#EF4444' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'NEEDED' && { color: '#EF4444', fontWeight: '700' },
                ]}
              >
                Cần mua ({data.neededToBuy?.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'PANTRY' && styles.tabItemActive]}
              onPress={() => setActiveTab('PANTRY')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="snow"
                size={16}
                color={activeTab === 'PANTRY' ? '#10B981' : '#64748B'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'PANTRY' && { color: '#10B981', fontWeight: '700' },
                ]}
              >
                Đã có trong tủ ({data.alreadyInPantry?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Đang đối chiếu nguyên liệu với tủ lạnh...</Text>
            </View>
          ) : activeTab === 'NEEDED' ? (
            <FlatList
              data={data.neededToBuy || []}
              keyExtractor={(item, index) => `${item.name}-${index}`}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>🎉</Text>
                  <Text style={styles.emptyTitle}>Tủ lạnh đã có đủ nguyên liệu!</Text>
                  <Text style={styles.emptySubtitle}>
                    Không cần mua thêm món gì cho thực đơn tuần này.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isChecked = !!checkedItems[item.name];
                return (
                  <TouchableOpacity
                    style={[styles.itemCard, isChecked && styles.itemCardChecked]}
                    onPress={() => toggleCheck(item.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isChecked ? Colors.primary : '#94A3B8'}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, isChecked && styles.itemNameChecked]}>
                        {item.name}
                      </Text>
                      {item.dishSources && item.dishSources.length > 0 && (
                        <Text style={styles.itemDishes} numberOfLines={1}>
                          Dùng cho: {item.dishSources.join(', ')}
                        </Text>
                      )}
                    </View>
                    {item.quantity ? (
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyText}>
                          {item.quantity} {item.unit || ''}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <FlatList
              data={data.alreadyInPantry || []}
              keyExtractor={(item, index) => `${item.name}-${index}`}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>🧊</Text>
                  <Text style={styles.emptyTitle}>Chưa có nguyên liệu trùng khớp</Text>
                  <Text style={styles.emptySubtitle}>
                    Hãy bổ sung thực phẩm vào Tủ lạnh để tự động trừ bớt.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={[styles.itemCard, styles.itemPantryCard]}>
                  <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.dishSources && item.dishSources.length > 0 && (
                      <Text style={styles.itemDishes} numberOfLines={1}>
                        Dùng cho: {item.dishSources.join(', ')}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.qtyBadge, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.qtyText, { color: '#059669' }]}>
                      Trong tủ: {item.pantryQuantity || 'Có sẵn'}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}

          {/* Bottom Actions */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleShareList}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              <Text style={styles.copyBtnText}>Chia sẻ / Sao chép danh sách đi chợ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  itemCardChecked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  itemPantryCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  itemDishes: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  qtyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qtyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default WeeklyGroceryModal;
