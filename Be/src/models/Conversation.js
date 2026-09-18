const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    shareId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodShare',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
      isRead: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESERVED', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    clearedHistory: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clearedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
