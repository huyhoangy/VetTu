const mongoose = require('mongoose');

const userReviewSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    foodShare: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodShare',
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Số sao đánh giá là bắt buộc'],
      min: 1,
      max: 5,
    },
    tags: {
      type: [String],
      default: [],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Nhận xét không quá 500 ký tự'],
      default: '',
    },
    role: {
      type: String,
      enum: ['GIVER', 'RECEIVER', 'GENERAL'],
      default: 'RECEIVER', // Người nhận đánh giá người cho hoặc ngược lại
    },
  },
  {
    timestamps: true,
  }
);

userReviewSchema.index({ targetUser: 1, createdAt: -1 });

module.exports = mongoose.model('UserReview', userReviewSchema);
