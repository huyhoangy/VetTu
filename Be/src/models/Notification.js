const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['MESSAGE', 'NEW_SHARE', 'CLAIM_CONFIRMED', 'SYSTEM'],
      default: 'SYSTEM',
    },
    data: {
      conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
      shareId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodShare' },
      avatar: { type: String },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
