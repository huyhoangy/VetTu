const mongoose = require('mongoose');

const ingredientShareSchema = new mongoose.Schema(
  {
    ingredientName: {
      type: String,
      required: [true, 'Please provide ingredient name'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['VEGETABLE', 'FRUIT', 'MEAT', 'SEAFOOD', 'SPICE', 'DAIRY', 'OTHER'],
      default: 'OTHER',
    },
    quantity: {
      type: String,
      required: [true, 'Please provide quantity (e.g. 500g, 2 quả)'],
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    images: [
      {
        type: String,
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: {
        type: String,
        default: '',
      },
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'PENDING', 'COMPLETED', 'CANCELLED'],
      default: 'AVAILABLE',
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// 2dsphere index for GeoJSON location searches ($near)
ingredientShareSchema.index({ location: '2dsphere' });
ingredientShareSchema.index({ status: 1 });

module.exports = mongoose.model('IngredientShare', ingredientShareSchema);
