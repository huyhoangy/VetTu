const Notification = require('../models/Notification');
const User = require('../models/User');

// GET /api/notifications
// Get all notifications for current user
exports.getNotifications = async (req, res) => {
  try {
    let currentUserId = req.user?._id || req.query.userId;
    if (!currentUserId) {
      const firstUser = await User.findOne();
      currentUserId = firstUser?._id;
    }

    let query = {};
    if (currentUserId) {
      query = { recipient: currentUserId };
    }

    let notifications = await Notification.find(query)
      .populate('sender', 'name avatar')
      .populate('data.shareId', 'title images quantity status')
      .sort({ createdAt: -1 })
      .limit(50);

    // If 0 notifications exist, seed a few friendly starter notifications
    if (notifications.length === 0 && currentUserId) {
      const starterSamples = [
        {
          recipient: currentUserId,
          title: 'Chào mừng đến với Vét Tủ! 🎉',
          message: 'Khám phá món ngon từ nguyên liệu sẵn có hoặc chia sẻ thực phẩm dư với hàng xóm lân cận.',
          type: 'SYSTEM',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
        },
        {
          recipient: currentUserId,
          title: '🎁 Món mới gần bạn!',
          message: 'Chị Mai vừa đăng chia sẻ: "Bó rau muống sạch quê gửi lên" cách bạn ~250m.',
          type: 'NEW_SHARE',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
        },
      ];

      await Notification.insertMany(starterSamples);
      notifications = await Notification.find(query)
        .populate('sender', 'name avatar')
        .populate('data.shareId', 'title images quantity status')
        .sort({ createdAt: -1 });
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách thông báo',
      error: error.message,
    });
  }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    let currentUserId = req.user?._id || req.query.userId;
    if (!currentUserId) {
      const firstUser = await User.findOne();
      currentUserId = firstUser?._id;
    }

    const count = await Notification.countDocuments({
      recipient: currentUserId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi đếm thông báo chưa đọc',
      error: error.message,
    });
  }
};

// PUT /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
    }

    // If this notification belongs to a conversation, mark all related notifications for this recipient as read as well!
    if (notification.data?.conversationId) {
      await Notification.updateMany(
        {
          recipient: notification.recipient,
          'data.conversationId': notification.data.conversationId,
          isRead: false,
        },
        { isRead: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu đã đọc',
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thông báo',
      error: error.message,
    });
  }
};

// PUT /api/notifications/read-by-conversation
exports.markReadByConversation = async (req, res) => {
  try {
    const { conversationId, userId } = req.body;
    let currentUserId = req.user?._id || userId;
    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Thiếu conversationId' });
    }

    const query = { 'data.conversationId': conversationId, isRead: false };
    if (currentUserId) {
      query.recipient = currentUserId;
    }

    await Notification.updateMany(query, { isRead: true });

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo của đoạn chat là đã đọc',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thông báo',
      error: error.message,
    });
  }
};

// PUT /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    let currentUserId = req.user?._id || req.body?.userId || req.query.userId;
    if (!currentUserId) {
      const firstUser = await User.findOne();
      currentUserId = firstUser?._id;
    }

    await Notification.updateMany(
      { recipient: currentUserId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật tất cả thông báo',
      error: error.message,
    });
  }
};

// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Đã xóa thông báo thành công',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thông báo',
      error: error.message,
    });
  }
};
