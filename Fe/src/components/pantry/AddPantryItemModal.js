import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const STORAGE_LOCATIONS = [
  { id: 'CHILLED', label: 'Ngăn mát', icon: 'snow-outline', color: '#0EA5E9' },
  { id: 'FROZEN', label: 'Ngăn đông', icon: 'cube-outline', color: '#6366F1' },
  { id: 'PANTRY', label: 'Tủ khô', icon: 'file-tray-full-outline', color: '#F59E0B' },
];

const CATEGORIES = [
  { id: 'VEGGIES', label: 'Rau củ', icon: 'leaf-outline', defaultDays: { CHILLED: 4, FROZEN: 14, PANTRY: 3 } },
  { id: 'PROTEIN', label: 'Thịt / Cá', icon: 'nutrition-outline', defaultDays: { CHILLED: 2, FROZEN: 30, PANTRY: 1 } },
  { id: 'DAIRY', label: 'Trứng / Sữa', icon: 'egg-outline', defaultDays: { CHILLED: 10, FROZEN: 30, PANTRY: 5 } },
  { id: 'COOKED', label: 'Đồ nấu sẵn', icon: 'restaurant-outline', defaultDays: { CHILLED: 2, FROZEN: 14, PANTRY: 1 } },
  { id: 'SPICES', label: 'Gia vị', icon: 'color-palette-outline', defaultDays: { CHILLED: 10, FROZEN: 30, PANTRY: 30 } },
  { id: 'CAN_DRY', label: 'Đồ hộp / Khô', icon: 'cube-outline', defaultDays: { CHILLED: 30, FROZEN: 90, PANTRY: 90 } },
  { id: 'OTHER', label: 'Khác', icon: 'ellipsis-horizontal-circle-outline', defaultDays: { CHILLED: 5, FROZEN: 30, PANTRY: 7 } },
];

const COMMON_PRESETS = [
  { name: 'Thịt bò', category: 'PROTEIN', unit: '300g' },
  { name: 'Thịt heo', category: 'PROTEIN', unit: '500g' },
  { name: 'Trứng gà', category: 'DAIRY', unit: '10 quả' },
  { name: 'Rau muống', category: 'VEGGIES', unit: '1 bó' },
  { name: 'Cà chua', category: 'VEGGIES', unit: '4 quả' },
  { name: 'Đậu phụ', category: 'VEGGIES', unit: '2 bìa' },
  { name: 'Hành lá', category: 'SPICES', unit: '1 bó' },
  { name: 'Sữa tươi', category: 'DAIRY', unit: '1 hộp' },
  { name: 'Cá hồi', category: 'PROTEIN', unit: '200g' },
  { name: 'Mì tôm', category: 'CAN_DRY', unit: '3 gói' },
];

const AddPantryItemModal = ({ visible, onClose, onAddSuccess, initialItem = null }) => {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('VEGGIES');
  const [quantity, setQuantity] = useState('1 phần');
  const [storageLocation, setStorageLocation] = useState('CHILLED');
  const [daysToAdd, setDaysToAdd] = useState(4);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || '');
      setCategory(initialItem.category || 'OTHER');
      setQuantity(initialItem.quantity || '1 phần');
      setStorageLocation(initialItem.storageLocation || 'CHILLED');
      setNotes(initialItem.notes || '');
      if (initialItem.expiryDate) {
        const diff = Math.max(
          1,
          Math.ceil((new Date(initialItem.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
        );
        setDaysToAdd(diff);
      }
    } else {
      resetForm();
    }
  }, [initialItem, visible]);

  const resetForm = () => {
    setName('');
    setCategory('VEGGIES');
    setQuantity('1 phần');
    setStorageLocation('CHILLED');
    setDaysToAdd(4);
    setNotes('');
  };

  const handleSelectPreset = (preset) => {
    setName(preset.name);
    setCategory(preset.category);
    setQuantity(preset.unit);

    const catInfo = CATEGORIES.find((c) => c.id === preset.category) || CATEGORIES[0];
    const defaultD = catInfo.defaultDays[storageLocation] || 4;
    setDaysToAdd(defaultD);
  };

  const handleLocationChange = (loc) => {
    setStorageLocation(loc);
    const catInfo = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
    const defaultD = catInfo.defaultDays[loc] || 4;
    setDaysToAdd(defaultD);
  };

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    const catInfo = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
    const defaultD = catInfo.defaultDays[storageLocation] || 4;
    setDaysToAdd(defaultD);
  };

  const getCalculatedExpiryDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + Number(daysToAdd));
    return d;
  };

  const formatExpiryDisplay = () => {
    const d = getCalculatedExpiryDate();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year} (Còn ${daysToAdd} ngày)`;
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên thực phẩm');
      return;
    }

    try {
      setSubmitting(true);
      const expiryDate = getCalculatedExpiryDate();

      const payload = {
        name: name.trim(),
        category,
        quantity: quantity.trim() || '1 phần',
        storageLocation,
        expiryDate,
        notes: notes.trim(),
      };

      await onAddSuccess(payload);
      setSubmitting(false);
      resetForm();
      onClose();
    } catch (error) {
      setSubmitting(false);
      Alert.alert('Lỗi', error.message || 'Không thể lưu thực phẩm vào tủ lạnh');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
          {/* Top Drag Bar */}
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>
                {initialItem ? 'Chỉnh sửa thực phẩm' : 'Thêm vào Tủ lạnh'}
              </Text>
              <Text style={styles.sheetSub}>Gợi ý hạn bảo quản tự động theo vị trí</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
            {/* Quick Presets Carousel */}
            {!initialItem && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>⚡ Chọn nhanh món phổ biến</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
                  {COMMON_PRESETS.map((p, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.presetChip, name === p.name && styles.presetChipActive]}
                      onPress={() => handleSelectPreset(p)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetChipText, name === p.name && styles.presetChipTextActive]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Input Name */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tên thực phẩm *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Thịt bò bắp, Rau xà lách, Sữa chua..."
                placeholderTextColor={Colors.placeholder}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Storage Location */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Vị trí bảo quản trong tủ</Text>
              <View style={styles.locationsRow}>
                {STORAGE_LOCATIONS.map((loc) => {
                  const isSelected = storageLocation === loc.id;
                  return (
                    <TouchableOpacity
                      key={loc.id}
                      style={[
                        styles.locationBtn,
                        isSelected && { borderColor: loc.color, backgroundColor: `${loc.color}15` },
                      ]}
                      onPress={() => handleLocationChange(loc.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={loc.icon}
                        size={18}
                        color={isSelected ? loc.color : Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.locationBtnText,
                          isSelected && { color: loc.color, fontWeight: '700' },
                        ]}
                      >
                        {loc.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Phân loại</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.catChip, isSelected && styles.catChipActive]}
                      onPress={() => handleCategoryChange(cat.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={14}
                        color={isSelected ? '#FFFFFF' : Colors.textSecondary}
                      />
                      <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Expiry Selection */}
            <View style={styles.section}>
              <View style={styles.expiryHeaderRow}>
                <Text style={styles.sectionLabel}>Hạn sử dụng</Text>
                <Text style={styles.expiryDisplay}>{formatExpiryDisplay()}</Text>
              </View>

              <View style={styles.quickDaysRow}>
                {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.daysChip, daysToAdd === d && styles.daysChipActive]}
                    onPress={() => setDaysToAdd(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.daysChipText, daysToAdd === d && styles.daysChipTextActive]}>
                      +{d} {d >= 30 ? 'tháng' : 'ngày'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantity & Notes Row */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.sectionLabel}>Số lượng</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: 500g, 1 bó..."
                  placeholderTextColor={Colors.placeholder}
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>

              <View style={[styles.section, { flex: 1.2, marginLeft: 8 }]}>
                <Text style={styles.sectionLabel}>Ghi chú (tùy chọn)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: Mới mua ở siêu thị"
                  placeholderTextColor={Colors.placeholder}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>
          </ScrollView>

          {/* Submit Action */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {initialItem ? 'Lưu thay đổi' : 'Cất vào Tủ lạnh'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  sheetSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  presetChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.text,
  },
  locationsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  locationBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  expiryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expiryDisplay: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  quickDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  daysChip: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  daysChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: Colors.primary,
  },
  daysChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  daysChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AddPantryItemModal;
