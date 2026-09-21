import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Colors } from '../../constants/colors';
import shareApi from '../../api/shareApi';
import { useAuth } from '../../context/AuthContext';
import { uploadImageToCloudinary } from '../../api/cloudinaryApi';
import PhoneVerificationModal from '../../components/profile/PhoneVerificationModal';

const CATEGORIES = [
  { id: 'VEGGIES', title: '🥦 Rau củ quả' },
  { id: 'PROTEIN', title: '🥩 Đạm / Thịt cá' },
  { id: 'SPICES', title: '🧄 Gia vị tươi' },
  { id: 'CAN_DRY', title: '🥫 Đồ hộp / Đồ khô' },
  { id: 'COOKED', title: '🍲 Đồ nấu sẵn' },
  { id: 'OTHER', title: '🍎 Khác' },
];

const CreateShareScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user, updateUserProfile } = useAuth();

  const [title, setTitle] = useState(route?.params?.initialTitle || '');
  const [description, setDescription] = useState(route?.params?.initialDescription || '');
  const [quantity, setQuantity] = useState(route?.params?.initialQuantity || '');
  const [category, setCategory] = useState(route?.params?.initialCategory || 'VEGGIES');
  const [type, setType] = useState('GIFT'); // GIFT or EXCHANGE
  const [addressName, setAddressName] = useState('Đang lấy vị trí...');
  const [coords, setCoords] = useState({ latitude: 21.031, longitude: 105.782 });
  const [contactPhone, setContactPhone] = useState('');
  const [contactNote, setContactNote] = useState('Có thể qua lấy vào buổi tối sau 18h');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingText, setUploadingText] = useState('Đăng bài chia sẻ');
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);

  // Auto-detect current address on mount
  React.useEffect(() => {
    const detectLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const { latitude, longitude } = loc.coords;
          setCoords({ latitude, longitude });

          const geocodes = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geocodes && geocodes.length > 0) {
            const g = geocodes[0];
            const parts = [
              g.street,
              g.district || g.subregion,
              g.city || g.region,
            ].filter(Boolean);
            if (parts.length > 0) {
              setAddressName(parts.slice(0, 3).join(', '));
            }
          }
        }
      } catch (err) {
        setAddressName('Khu vực của bạn');
      }
    };
    detectLocation();
  }, []);

  // Pick Image from device library
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền truy cập ảnh để tải lên thực phẩm');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
      if (result.assets[0].base64) {
        setSelectedImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    }
  };

  const handleSubmit = async () => {
    if (!user?.isVerified) {
      Alert.alert(
        '🛡️ Cần xác thực tài khoản',
        'Để đảm bảo uy tín và phòng chống bùng hẹn, bạn cần xác thực số điện thoại chính chủ trước khi đăng bài chia sẻ thực phẩm.',
        [
          { text: 'Huỷ', style: 'cancel' },
          {
            text: 'Xác thực ngay',
            onPress: () => setVerificationModalVisible(true),
          },
        ]
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên thực phẩm hoặc món ăn');
      return;
    }

    if (!quantity.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số lượng (VD: 2 bó, 500g, 3 quả)');
      return;
    }

    try {
      setLoading(true);
      let finalImageUrl = selectedImage;

      // Upload directly to Cloudinary using Base64 JSON (100% reliable across all devices)
      if (selectedImageBase64 || (selectedImage && selectedImage.startsWith('data:image/'))) {
        setUploadingText('Đang tải ảnh lên Cloudinary ☁️...');
        try {
          const payload = selectedImageBase64 || selectedImage;
          const cloudUrl = await uploadImageToCloudinary(payload);
          if (cloudUrl) {
            finalImageUrl = cloudUrl;
          }
        } catch (uploadErr) {
          console.error('Cloudinary upload failed:', uploadErr.message);
          setLoading(false);
          setUploadingText('Đăng bài chia sẻ');
          Alert.alert('Lỗi tải ảnh Cloudinary', uploadErr.message || 'Không thể tải ảnh lên');
          return;
        }
      }

      setUploadingText('Đang tạo bài viết...');
      const shareData = {
        title: title.trim(),
        description: description.trim(),
        quantity: quantity.trim(),
        category,
        type,
        addressName: addressName.trim(),
        contactPhone: contactPhone.trim(),
        contactNote: contactNote.trim(),
        images: finalImageUrl
          ? [finalImageUrl]
          : ['https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800'],
        latitude: coords.latitude,
        longitude: coords.longitude,
        userId: user?._id || user?.id,
      };

      const res = await shareApi.createShare(shareData);
      setLoading(false);
      setUploadingText('Đăng bài chia sẻ');

      if (res.success) {
        Alert.alert('Thành công 🎉', 'Bài chia sẻ thực phẩm và ảnh Cloudinary đã được đăng lên bản tin!', [
          {
            text: 'Xem ngay',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      setLoading(false);
      setUploadingText('Đăng bài chia sẻ');
      Alert.alert('Lỗi', 'Không thể tạo bài chia sẻ, vui lòng thử lại!');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng tặng thực phẩm 🎁</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Picker Box */}
        <Text style={styles.fieldLabel}>Hình ảnh thực phẩm 📸</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.8}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePickerPlaceholder}>
              <Ionicons name="camera-outline" size={36} color={Colors.primary} />
              <Text style={styles.imagePickerText}>Chụp ảnh hoặc chọn từ máy</Text>
              <Text style={styles.imagePickerSub}>Hình ảnh rõ ràng giúp hàng xóm nhận đồ nhanh hơn</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Form Fields */}
        <Text style={styles.fieldLabel}>Tên thực phẩm / Món ăn *</Text>
        <TextInput
          style={styles.input}
          placeholder="VD: 2 bó rau muống sạch, 3 củ khoai tây..."
          placeholderTextColor={Colors.textSecondary}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.fieldLabel}>Số lượng *</Text>
        <TextInput
          style={styles.input}
          placeholder="VD: 1 túi 500g, 4 quả, 1 hộp..."
          placeholderTextColor={Colors.textSecondary}
          value={quantity}
          onChangeText={setQuantity}
        />

        {/* Type Selector (Tặng 0đ vs Đổi đồ) */}
        <Text style={styles.fieldLabel}>Hình thức chia sẻ</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeOption, type === 'GIFT' && styles.typeOptionActiveGift]}
            onPress={() => setType('GIFT')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="gift"
              size={18}
              color={type === 'GIFT' ? '#FFFFFF' : '#10B981'}
            />
            <Text
              style={[
                styles.typeOptionText,
                type === 'GIFT' && styles.typeOptionTextActive,
              ]}
            >
              Tặng miễn phí (0đ)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeOption, type === 'EXCHANGE' && styles.typeOptionActiveExchange]}
            onPress={() => setType('EXCHANGE')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="swap-horizontal"
              size={18}
              color={type === 'EXCHANGE' ? '#FFFFFF' : '#F59E0B'}
            />
            <Text
              style={[
                styles.typeOptionText,
                type === 'EXCHANGE' && styles.typeOptionTextActive,
              ]}
            >
              Đổi đồ khác
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Selector */}
        <Text style={styles.fieldLabel}>Danh mục</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, isSelected && styles.categoryCardActive]}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryCardText,
                    isSelected && styles.categoryCardTextActive,
                  ]}
                >
                  {cat.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Location & Address */}
        <Text style={styles.fieldLabel}>Khu vực nhận đồ</Text>
        <TextInput
          style={styles.input}
          placeholder="VD: Chung cư Discovery Complex, Ngõ 68 Cầu Giấy..."
          placeholderTextColor={Colors.textSecondary}
          value={addressName}
          onChangeText={setAddressName}
        />

        {/* Note & Pickup details */}
        <Text style={styles.fieldLabel}>Ghi chú cho người nhận</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="VD: Thực phẩm còn tươi trong tủ lạnh, nhắn trước khi qua nhận..."
          placeholderTextColor={Colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.submitButtonText}>{uploadingText}</Text>
            </View>
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Đăng bài chia sẻ</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        visible={verificationModalVisible}
        onClose={() => setVerificationModalVisible(false)}
        currentUser={user}
        onSuccess={(updatedUser) => {
          updateUserProfile(updatedUser);
          setVerificationModalVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 14,
  },
  imagePicker: {
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 8,
  },
  imagePickerSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  typeOptionActiveGift: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeOptionActiveExchange: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryCardTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 28,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default CreateShareScreen;
