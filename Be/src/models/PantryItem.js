const mongoose = require('mongoose');

const pantryItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Tên thực phẩm là bắt buộc'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['VEGGIES', 'PROTEIN', 'SPICES', 'CAN_DRY', 'COOKED', 'DAIRY', 'OTHER'],
      default: 'OTHER',
    },
    quantity: {
      type: String,
      default: '1 phần',
      trim: true,
    },
    storageLocation: {
      type: String,
      enum: ['CHILLED', 'FROZEN', 'PANTRY'],
      default: 'CHILLED',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Hạn sử dụng là bắt buộc'],
      index: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

pantryItemSchema.index({ userId: 1, isUsed: 1, expiryDate: 1 });

const PantryItem = mongoose.model('PantryItem', pantryItemSchema);

module.exports = PantryItem;
