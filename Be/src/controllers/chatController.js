const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const FoodShare = require('../models/FoodShare');
const User = require('../models/User');

// POST /api/chat/conversation
// Find or create conversation for a food share between current user and donor
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { shareId, donorId, initialMessage, userId } = req.body;

    if (!shareId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bài chia sẻ',
      });
    }

    // 1. Resolve current user ID
    let currentUserId = req.user?._id || userId;
    if (!currentUserId) {
      let firstUser = await User.findOne();
      if (!firstUser) {
        firstUser = await User.create({
          name: 'Tôi (Người nhận)',
          email: 'receiver@vettu.app',
          avatar: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
        });
      }
      currentUserId = firstUser._id;
    }

    // 2. Resolve donor user ID
    let resolvedDonorId = typeof donorId === 'object' && donorId?._id ? donorId._id : donorId;
    if (!resolvedDonorId) {
      // Find share to get createdBy
      const shareDoc = await FoodShare.findById(shareId);
      if (shareDoc && shareDoc.createdBy) {
        resolvedDonorId = shareDoc.createdBy;
      }
    }

    if (!resolvedDonorId) {
      let donor = await User.findOne({ _id: { $ne: currentUserId } });
      if (!donor) {
        donor = await User.create({
          name: 'Chị Mai (Hàng xóm)',
          email: 'donor@vettu.app',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400',
        });
      }
      resolvedDonorId = donor._id;
    }

    // If user is trying to message their own post, assign demo neighbor partner
    if (resolvedDonorId.toString() === currentUserId.toString()) {
      let partner = await User.findOne({ _id: { $ne: currentUserId } });
      if (!partner) {
        partner = await User.create({
          name: 'Chị Mai (Hàng xóm)',
          email: 'neighbor_demo@vettu.app',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400',
        });
      }
      resolvedDonorId = partner._id;
    }

    // 3. Check if conversation already exists
    let conversation = await Conversation.findOne({
      shareId,
      participants: { $all: [currentUserId, resolvedDonorId] },
    })
      .populate('shareId', 'title images quantity status addressName type')
      .populate('participants', 'name avatar rating email');

    if (!conversation) {
      conversation = await Conversation.create({
        shareId,
        participants: [currentUserId, resolvedDonorId],
        lastMessage: {
          text: initialMessage || 'Chào bạn, mình muốn xin món này được không?',
          sender: currentUserId,
          createdAt: new Date(),
          isRead: false,
        },
      });

      // Create initial message
      await Message.create({
        conversationId: conversation._id,
        sender: currentUserId,
        text: initialMessage || 'Chào bạn, mình thấy bạn đang chia sẻ món này, mình có thể qua xin/nhận được không ạ?',
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('shareId', 'title images quantity status addressName type')
        .populate('participants', 'name avatar rating email');
    } else {
      // If conversation exists but was marked as deleted for this user, restore it
      if (conversation.deletedFor && conversation.deletedFor.some((u) => u.toString() === currentUserId.toString())) {
        conversation.deletedFor = conversation.deletedFor.filter((u) => u.toString() !== currentUserId.toString());
        await conversation.save();
      }
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể khởi tạo đoạn chat',
      error: error.message,
    });
  }
};

// GET /api/chat/conversations
// Get all conversation history for the current user (excluding deleted ones for this user)
exports.getUserConversations = async (req, res) => {
  try {
    const currentUserId = req.user?._id || req.query.userId;

    let query = {};
    if (currentUserId) {
      query = {
        participants: currentUserId,
        deletedFor: { $ne: currentUserId },
      };
    }

    let conversations = await Conversation.find(query)
      .populate('shareId', 'title images quantity status addressName type')
      .populate('participants', 'name avatar rating email')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải danh sách hội thoại',
      error: error.message,
    });
  }
};

// GET /api/chat/conversations/:id
exports.getConversationById = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findById(id)
      .populate('shareId', 'title images quantity status addressName type')
      .populate('participants', 'name avatar rating email');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy cuộc hội thoại',
      });
    }

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải thông tin hội thoại',
      error: error.message,
    });
  }
};

// DELETE /api/chat/conversations/:id
// Delete a conversation ONLY for the requesting user (preserving for the other participant)
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id || req.query.userId || req.body?.userId;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đoạn hội thoại để xóa',
      });
    }

    if (currentUserId) {
      const now = new Date();

      // Update clearedHistory for this user
      if (!conversation.clearedHistory) conversation.clearedHistory = [];
      const existingClearedIdx = conversation.clearedHistory.findIndex(
        (c) => c.user?.toString() === currentUserId.toString()
      );
      if (existingClearedIdx >= 0) {
        conversation.clearedHistory[existingClearedIdx].clearedAt = now;
      } else {
        conversation.clearedHistory.push({ user: currentUserId, clearedAt: now });
      }

      // Add to deletedFor
      if (!conversation.deletedFor) conversation.deletedFor = [];
      if (!conversation.deletedFor.some((u) => u.toString() === currentUserId.toString())) {
        conversation.deletedFor.push(currentUserId);
      }

      // If ALL participants have deleted this conversation, purge it completely
      const allDeleted =
        conversation.participants.length > 0 &&
        conversation.participants.every((p) =>
          conversation.deletedFor.some((d) => d.toString() === p.toString())
        );

      if (allDeleted) {
        await Message.deleteMany({ conversationId: id });
        await Conversation.findByIdAndDelete(id);
      } else {
        await conversation.save();
      }
    } else {
      // Fallback if no user identifier provided
      await Message.deleteMany({ conversationId: id });
      await Conversation.findByIdAndDelete(id);
    }

    res.status(200).json({
      success: true,
      message: 'Đã xóa lịch sử đoạn chat của bạn thành công',
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa đoạn hội thoại',
      error: error.message,
    });
  }
};

// GET /api/chat/conversations/:id/messages
exports.getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id || req.query.userId;

    const conversation = await Conversation.findById(id).select('status shareId clearedHistory');
    
    let messageQuery = { conversationId: id };

    // If current user previously cleared history, only show messages after their clearedAt timestamp
    if (currentUserId && conversation?.clearedHistory?.length > 0) {
      const userCleared = conversation.clearedHistory.find(
        (c) => c.user?.toString() === currentUserId.toString()
      );
      if (userCleared && userCleared.clearedAt) {
        messageQuery.createdAt = { $gt: userCleared.clearedAt };
      }
    }

    const messages = await Message.find(messageQuery)
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: messages,
      conversationStatus: conversation?.status || 'ACTIVE',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải tin nhắn',
      error: error.message,
    });
  }
};

// POST /api/chat/conversations/:id/messages
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, senderId } = req.body;
    let currentUserId = req.user?._id || senderId;

    if (!currentUserId) {
      const anyUser = await User.findOne();
      currentUserId = anyUser?._id;
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung tin nhắn không được để trống',
      });
    }

    const newMessage = await Message.create({
      conversationId: id,
      sender: currentUserId,
      text: text.trim(),
    });

    // Un-delete conversation for all participants when a new message is sent
    const conversation = await Conversation.findById(id);
    if (conversation) {
      conversation.lastMessage = {
        text: text.trim(),
        sender: currentUserId,
        createdAt: new Date(),
        isRead: false,
      };
      // Pull all participants from deletedFor so both see new message in their list
      conversation.deletedFor = [];
      await conversation.save();
    }

    const populated = await Message.findById(newMessage._id).populate('sender', 'name avatar');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể gửi tin nhắn',
      error: error.message,
    });
  }
};

// POST /api/chat/conversations/:id/confirm-claim
exports.confirmClaim = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cuộc hội thoại' });
    }

    // Update conversation and share status
    conversation.status = 'COMPLETED';
    await conversation.save();

    await FoodShare.findByIdAndUpdate(conversation.shareId, {
      status: 'COMPLETED',
    });

    // Create system message
    const systemMsg = await Message.create({
      conversationId: id,
      sender: conversation.participants[0],
      text: '🎉 Giao dịch nhận thực phẩm đã hoàn tất thành công! Cảm ơn bạn đã cùng chung tay chống lãng phí đồ ăn.',
      type: 'SYSTEM',
    });

    res.status(200).json({
      success: true,
      message: 'Xác nhận nhận thực phẩm thành công!',
      data: { conversation, systemMsg },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xác nhận nhận đồ',
      error: error.message,
    });
  }
};
