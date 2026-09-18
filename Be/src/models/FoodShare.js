const mongoose = require('mongoose');

const foodShareSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tên món ăn hoặc thực phẩm là bắt buộc'],
      trim: true,
      maxlength: [100, 'Tên không quá 100 ký tự'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Mô tả không quá 500 ký tự'],
      default: '',
    },
    category: {
      type: String,
      enum: ['VEGGIES', 'PROTEIN', 'SPICES', 'CAN_DRY', 'COOKED', 'OTHER'],
      default: 'VEGGIES',
    },
    type: {
      type: String,
      enum: ['GIFT', 'EXCHANGE'],
      default: 'GIFT', // GIFT = Tặng miễn phí 0đ, EXCHANGE = Đổi đồ
    },
    quantity: {
      type: String,
      required: [true, 'Vui lòng nhập số lượng'],
      trim: true,
      default: '1 phần',
    },
    images: {
      type: [String],
      default: ['https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800'],
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'RESERVED', 'COMPLETED', 'EXPIRED'],
      default: 'AVAILABLE',
    },
    // GeoJSON Point location for 2dsphere proximity search
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [105.782, 21.031], // Mặc định Hà Nội
      },
    },
    addressName: {
      type: String,
      trim: true,
      default: 'Khu vực gần bạn',
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },
    contactNote: {
      type: String,
      trim: true,
      default: 'Liên hệ qua ứng dụng để nhận đồ',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // Mặc định 48h
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for MongoDB geospatial queries
foodShareSchema.index({ location: '2dsphere' });
foodShareSchema.index({ status: 1, category: 1, type: 1 });

const FoodShare = mongoose.model('FoodShare', foodShareSchema);

module.exports = FoodShare;
