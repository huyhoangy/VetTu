const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const FoodShare = require('../models/FoodShare');
const User = require('../models/User');

// POST /api/chat/conversation
// Find or create conversation for a food share between current user and donor
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { shareId, donorId, initialMessage } = req.body;
    const currentUserId = req.user?._id || req.body.userId;

    if (!shareId || !donorId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bài chia sẻ hoặc người nhận',
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      shareId,
      participants: { $all: [currentUserId, donorId] },
    })
      .populate('shareId', 'title images quantity status addressName type')
      .populate('participants', 'name avatar rating email');

    if (!conversation) {
      conversation = await Conversation.create({
        shareId,
        participants: [currentUserId, donorId],
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

      // Automatically simulate a friendly donor reply for instant interactive demo
      setTimeout(async () => {
        try {
          await Message.create({
            conversationId: conversation._id,
            sender: donorId,
            text: 'Chào bạn! Món này mình vẫn còn nhé. Bạn có thể qua lấy trước 20h tối nay được không?',
          });
          await Conversation.findByIdAndUpdate(conversation._id, {
            'lastMessage.text': 'Chào bạn! Món này mình vẫn còn nhé. Bạn có thể qua lấy trước 20h tối nay được không?',
            'lastMessage.sender': donorId,
            'lastMessage.createdAt': new Date(),
          });
        } catch (e) {}
      }, 1200);

      conversation = await Conversation.findById(conversation._id)
        .populate('shareId', 'title images quantity status addressName type')
        .populate('participants', 'name avatar rating email');
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
// Get all conversation history for the current user
exports.getUserConversations = async (req, res) => {
  try {
    const currentUserId = req.user?._id || req.query.userId;

    let query = {};
    if (currentUserId) {
      query = { participants: currentUserId };
    }

    const conversations = await Conversation.find(query)
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

// GET /api/chat/conversations/:id/messages
exports.getConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const messages = await Message.find({ conversationId: id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: messages,
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
    const currentUserId = req.user?._id || senderId;

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

    await Conversation.findByIdAndUpdate(id, {
      lastMessage: {
        text: text.trim(),
        sender: currentUserId,
        createdAt: new Date(),
        isRead: false,
      },
    });

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
