import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import aiApi from '../../api/aiApi';

const SAMPLE_PROMPTS = [
  'Hôm nay mua 500g thịt bò thăn, 1 bó rau muống và 10 quả trứng gà',
  'Mua 300g thịt ba chỉ, 2 bìa đậu phụ, 4 quả cà chua và hành lá',
  'Vừa mua 1 hộp sữa tươi, 2 quả táo, 1 cây bắp cải và 3 gói mì tôm',
  'Có nửa cân tôm sú, 1 con cá hồi và 1 củ gừng tươi',
];

const LOCATION_OPTIONS = [
  { id: 'CHILLED', label: 'Ngăn mát', icon: 'snow-outline', color: '#0EA5E9' },
  { id: 'FROZEN', label: 'Ngăn đông', icon: 'cube-outline', color: '#6366F1' },
  { id: 'PANTRY', label: 'Tủ khô', icon: 'file-tray-full-outline', color: '#F59E0B' },
];

const AISmartScanModal = ({ visible, onClose, onSaveBatch }) => {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('IMAGE'); // 'IMAGE' or 'VOICE_TEXT'
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep] = useState('INPUT'); // 'INPUT' or 'REVIEW'
  const [extractedItems, setExtractedItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const resetAll = () => {
    setSelectedImage(null);
    setImageBase64(null);
    setTextInput('');
    setAnalyzing(false);
    setStep('INPUT');
    setExtractedItems([]);
    setSaving(false);
  };

  const handleClose = () => {
    if (analyzing || saving) return;
    resetAll();
    onClose();
  };

  // Pick image from camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cho phép quyền sử dụng camera để chụp hóa đơn/thực phẩm');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setImageBase64(result.assets[0].base64);
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể mở máy ảnh');
    }
  };

  // Pick image from gallery
  const handlePickLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Vui lòng cho phép quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
        setImageBase64(result.assets[0].base64);
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện');
    }
  };

  // Process AI Image Analysis
  const handleAnalyzeImage = async () => {
    if (!imageBase64) {
      Alert.alert('Chưa có ảnh', 'Vui lòng chụp ảnh hoặc chọn ảnh hóa đơn / thực phẩm');
      return;
    }

    try {
      setAnalyzing(true);
      const res = await aiApi.scanImage(imageBase64, 'image/jpeg');
      setAnalyzing(false);

      if (res.success && res.data && res.data.length > 0) {
        setExtractedItems(
          res.data.map((item, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            selected: true,
            name: item.name || 'Thực phẩm',
            category: item.category || 'OTHER',
            quantity: item.quantity || '1 phần',
            storageLocation: item.storageLocation || 'CHILLED',
            days: Number(item.suggestedDays) || 4,
          }))
        );
        setStep('REVIEW');
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy thực phẩm trong ảnh, vui lòng thử chụp góc rõ nét hơn');
      }
    } catch (error) {
      setAnalyzing(false);
      Alert.alert('Lỗi phân tích AI', error.message || 'Không thể quét ảnh bằng AI. Vui lòng thử lại!');
    }
  };

  // Process AI Text / Voice Prompt Analysis
  const handleAnalyzeText = async () => {
    if (!textInput.trim()) {
      Alert.alert('Chưa nhập thông tin', 'Vui lòng nhập hoặc nói câu mô tả thực phẩm bạn vừa mua');
      return;
    }

    try {
      setAnalyzing(true);
      const res = await aiApi.parseVoiceText(textInput.trim());
      setAnalyzing(false);

      if (res.success && res.data && res.data.length > 0) {
        setExtractedItems(
          res.data.map((item, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            selected: true,
            name: item.name || 'Thực phẩm',
            category: item.category || 'OTHER',
            quantity: item.quantity || '1 phần',
            storageLocation: item.storageLocation || 'CHILLED',
            days: Number(item.suggestedDays) || 4,
          }))
        );
        setStep('REVIEW');
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy tên thực phẩm trong câu nói, vui lòng thử lại');
      }
    } catch (error) {
      setAnalyzing(false);
      Alert.alert('Lỗi phân tích AI', error.message || 'Không thể phân tích bằng AI. Vui lòng thử lại!');
    }
  };

  // Toggle item selection
  const toggleItemSelect = (id) => {
    setExtractedItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  // Update item field
  const updateItemField = (id, field, value) => {
    setExtractedItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  // Delete item from review list
  const removeItem = (id) => {
    setExtractedItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Submit and save selected items to pantry
  const handleConfirmSave = async () => {
    const selectedList = extractedItems.filter((i) => i.selected && i.name.trim());
    if (selectedList.length === 0) {
      Alert.alert('Chưa chọn món', 'Vui lòng chọn ít nhất 1 thực phẩm để cất vào tủ lạnh');
      return;
    }

    try {
      setSaving(true);
      const payload = selectedList.map((i) => {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + Number(i.days));

        return {
          name: i.name.trim(),
          category: i.category,
          quantity: i.quantity.trim() || '1 phần',
          storageLocation: i.storageLocation,
          expiryDate,
        };
      });

      await onSaveBatch(payload);
      setSaving(false);
      resetAll();
      onClose();
    } catch (error) {
      setSaving(false);
      Alert.alert('Lỗi', error.message || 'Không thể lưu thực phẩm vào tủ lạnh');
    }
  };

  const selectedCount = extractedItems.filter((i) => i.selected).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* Top Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.title}>
                  {step === 'INPUT' ? 'AI Quét Thông Minh' : 'Duyệt kết quả AI'}
                </Text>
                <Text style={styles.subtitle}>
                  {step === 'INPUT'
                    ? 'Nhận diện hóa đơn hoặc giọng nói tự động'
                    : `Tìm thấy ${extractedItems.length} thực phẩm, đã chọn ${selectedCount}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* STEP 1: INPUT MODE */}
          {step === 'INPUT' ? (
            <View style={styles.bodyContainer}>
              {/* Tab Selector */}
              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'IMAGE' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('IMAGE')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="camera-outline"
                    size={16}
                    color={activeTab === 'IMAGE' ? '#FFFFFF' : Colors.textSecondary}
                  />
                  <Text
                    style={[styles.tabBtnText, activeTab === 'IMAGE' && styles.tabBtnTextActive]}
                  >
                    Quét ảnh / Hóa đơn
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'VOICE_TEXT' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('VOICE_TEXT')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="mic-outline"
                    size={16}
                    color={activeTab === 'VOICE_TEXT' ? '#FFFFFF' : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      activeTab === 'VOICE_TEXT' && styles.tabBtnTextActive,
                    ]}
                  >
                    Giọng nói / Nhập câu
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TAB 1: IMAGE SCANNER */}
              {activeTab === 'IMAGE' ? (
                <View style={styles.tabContent}>
                  {selectedImage ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                      <View style={styles.imageChangeRow}>
                        <TouchableOpacity
                          style={styles.repickBtn}
                          onPress={handleTakePhoto}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="camera" size={14} color={Colors.primary} />
                          <Text style={styles.repickText}>Chụp lại</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.repickBtn}
                          onPress={handlePickLibrary}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="image" size={14} color={Colors.primary} />
                          <Text style={styles.repickText}>Chọn ảnh khác</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholderBox}>
                      <View style={styles.uploadIconCircle}>
                        <Ionicons name="receipt-outline" size={32} color={Colors.primary} />
                      </View>
                      <Text style={styles.uploadTitle}>Chụp hóa đơn hoặc giỏ thực phẩm</Text>
                      <Text style={styles.uploadDesc}>
                        Hóa đơn WinMart, Co.op, chợ hoặc ảnh rau củ mua về
                      </Text>

                      <View style={styles.pickButtonsRow}>
                        <TouchableOpacity
                          style={styles.cameraActionBtn}
                          onPress={handleTakePhoto}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="camera" size={18} color="#FFFFFF" />
                          <Text style={styles.cameraActionBtnText}>Chụp ảnh</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.galleryActionBtn}
                          onPress={handlePickLibrary}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="images-outline" size={18} color={Colors.text} />
                          <Text style={styles.galleryActionBtnText}>Chọn ảnh</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {Boolean(selectedImage) && (
                    <TouchableOpacity
                      style={styles.aiAnalyzeBtn}
                      onPress={handleAnalyzeImage}
                      disabled={analyzing}
                      activeOpacity={0.85}
                    >
                      {analyzing ? (
                        <>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.aiAnalyzeBtnText}>AI đang đọc hóa đơn & thực phẩm...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                          <Text style={styles.aiAnalyzeBtnText}>✨ AI Phân tích hình ảnh ngay</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* TAB 2: VOICE & NATURAL TEXT ENTRY */
                <View style={styles.tabContent}>
                  <Text style={styles.inputLabel}>Nói hoặc gõ những gì bạn vừa mua:</Text>
                  <TextInput
                    style={styles.voiceTextInput}
                    placeholder="VD: Hôm nay mua 500g thịt bò, 1 bó rau muống, 4 quả trứng gà..."
                    placeholderTextColor={Colors.placeholder}
                    value={textInput}
                    onChangeText={setTextInput}
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={styles.sampleHeader}>💡 Hoặc chạm thử câu mẫu:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.samplesScroll}
                  >
                    {SAMPLE_PROMPTS.map((sample, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.sampleChip}
                        onPress={() => setTextInput(sample)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={12} color={Colors.primary} />
                        <Text style={styles.sampleChipText} numberOfLines={1}>
                          {sample}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity
                    style={[
                      styles.aiAnalyzeBtn,
                      !textInput.trim() && { opacity: 0.6 },
                    ]}
                    onPress={handleAnalyzeText}
                    disabled={analyzing || !textInput.trim()}
                    activeOpacity={0.85}
                  >
                    {analyzing ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.aiAnalyzeBtnText}>AI đang bóc tách danh sách...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                        <Text style={styles.aiAnalyzeBtnText}>✨ AI Tách danh sách thực phẩm</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            /* STEP 2: REVIEW & BATCH CONFIRM */
            <View style={styles.reviewContainer}>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.reviewList}>
                {extractedItems.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.reviewCard,
                      !item.selected && styles.reviewCardUnselected,
                    ]}
                  >
                    <View style={styles.reviewCardTop}>
                      {/* Checkbox */}
                      <TouchableOpacity
                        style={styles.checkboxTouch}
                        onPress={() => toggleItemSelect(item.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={item.selected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={item.selected ? Colors.primary : '#CBD5E1'}
                        />
                      </TouchableOpacity>

                      {/* Name & Quantity Inputs */}
                      <View style={styles.nameInputsCol}>
                        <TextInput
                          style={styles.itemNameInput}
                          value={item.name}
                          onChangeText={(val) => updateItemField(item.id, 'name', val)}
                          placeholder="Tên món"
                        />
                        <TextInput
                          style={styles.itemQtyInput}
                          value={item.quantity}
                          onChangeText={(val) => updateItemField(item.id, 'quantity', val)}
                          placeholder="Số lượng (500g, 1 bó...)"
                        />
                      </View>

                      {/* Delete */}
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeItem(item.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    {/* Location & Days Selector */}
                    <View style={styles.reviewCardBottom}>
                      {/* Storage Location */}
                      <View style={styles.miniLocationsRow}>
                        {LOCATION_OPTIONS.map((loc) => {
                          const isLoc = item.storageLocation === loc.id;
                          return (
                            <TouchableOpacity
                              key={loc.id}
                              style={[
                                styles.miniLocBtn,
                                isLoc && { backgroundColor: `${loc.color}20`, borderColor: loc.color },
                              ]}
                              onPress={() => updateItemField(item.id, 'storageLocation', loc.id)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.miniLocText, isLoc && { color: loc.color, fontWeight: '700' }]}>
                                {loc.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Expiry Days */}
                      <View style={styles.miniDaysRow}>
                        {[2, 3, 5, 10, 30].map((d) => {
                          const isDay = item.days === d;
                          return (
                            <TouchableOpacity
                              key={d}
                              style={[
                                styles.miniDayChip,
                                isDay && styles.miniDayChipActive,
                              ]}
                              onPress={() => updateItemField(item.id, 'days', d)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.miniDayText, isDay && styles.miniDayTextActive]}>
                                +{d}d
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.reviewActionRow}>
                <TouchableOpacity
                  style={styles.rescanBtn}
                  onPress={() => setStep('INPUT')}
                  activeOpacity={0.7}
                  disabled={saving}
                >
                  <Ionicons name="refresh" size={16} color={Colors.textSecondary} />
                  <Text style={styles.rescanBtnText}>Quét lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBatchBtn, selectedCount === 0 && { opacity: 0.6 }]}
                  onPress={handleConfirmSave}
                  disabled={saving || selectedCount === 0}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.saveBatchBtnText}>
                        Cất vào Tủ ({selectedCount} món)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  handleBar: {
    width: 40,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  aiBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyContainer: {
    marginBottom: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabContent: {
    marginBottom: 8,
  },
  uploadPlaceholderBox: {
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    borderStyle: 'dashed',
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  uploadDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  pickButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cameraActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    borderRadius: 12,
  },
  cameraActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  galleryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 11,
    borderRadius: 12,
  },
  galleryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  imagePreviewContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 10,
  },
  imageChangeRow: {
    flexDirection: 'row',
    gap: 14,
  },
  repickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  repickText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  aiAnalyzeBtn: {
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
  aiAnalyzeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  voiceTextInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  sampleHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  samplesScroll: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    maxWidth: 240,
  },
  sampleChipText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  reviewContainer: {
    maxHeight: 480,
  },
  reviewList: {
    maxHeight: 380,
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  reviewCardUnselected: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
  },
  reviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  checkboxTouch: {
    padding: 2,
  },
  nameInputsCol: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  itemNameInput: {
    flex: 1.4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  itemQtyInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  removeBtn: {
    padding: 6,
  },
  reviewCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 8,
  },
  miniLocationsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  miniLocBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  miniLocText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  miniDaysRow: {
    flexDirection: 'row',
    gap: 4,
  },
  miniDayChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  miniDayChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  miniDayText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  miniDayTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reviewActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  rescanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingVertical: 13,
    borderRadius: 14,
  },
  rescanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  saveBatchBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  saveBatchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AISmartScanModal;
