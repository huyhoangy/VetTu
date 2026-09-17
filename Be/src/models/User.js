const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide user name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide password'],
      minlength: 6,
      select: false,
    },
    avatar: {
      type: String,
      default: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
    },
    phone: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [106.7009, 10.7769], // Default HCMC
      },
      address: {
        type: String,
        default: '',
      },
    },
  },
  { timestamps: true }
);

// GeoJSON 2dsphere index for location-based nearby queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
