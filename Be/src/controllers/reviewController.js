const UserReview = require('../models/UserReview');
const User = require('../models/User');
const FoodShare = require('../models/FoodShare');

/**
 * Helper to get current logged in or specified user ID
 */
const getUserId = async (req) => {
  if (req.user && req.user._id) return req.user._id;
  if (req.body && req.body.fromUserId) return req.body.fromUserId;
  if (req.query && req.query.fromUserId) return req.query.fromUserId;
  return null;
};

/**
 * POST /api/reviews
 * Submit a review for a user and recalculate trust score
 */
const createReview = async (req, res, next) => {
  try {
    let fromUserId = await getUserId(req);
    const { targetUserId, foodShareId, rating, tags, comment, role } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp targetUserId của người được đánh giá' });
    }

    if (!fromUserId) {
      // Fallback to any user different from targetUser
      const anotherUser = await User.findOne({ _id: { $ne: targetUserId } });
      if (anotherUser) fromUserId = anotherUser._id;
    }

    if (String(fromUserId) === String(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Bạn không thể tự đánh giá chính mình' });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Số sao đánh giá phải từ 1 đến 5' });
    }

    // Create review
    const review = await UserReview.create({
      fromUser: fromUserId,
      targetUser: targetUserId,
      foodShare: foodShareId || null,
      rating: numRating,
      tags: Array.isArray(tags) ? tags : [],
      comment: comment ? comment.trim() : '',
      role: role || 'RECEIVER',
    });

    // Recalculate target user trust score
    const allReviews = await UserReview.find({ targetUser: targetUserId });
    const totalCount = allReviews.length;
    const sumRating = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const avgRating = totalCount > 0 ? Number((sumRating / totalCount).toFixed(1)) : 5.0;

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      {
        rating: avgRating,
        ratingCount: totalCount,
      },
      { new: true }
    ).select('name avatar rating ratingCount');

    const populatedReview = await UserReview.findById(review._id)
      .populate('fromUser', 'name avatar rating')
      .populate('foodShare', 'title quantity');

    res.status(201).json({
      success: true,
      message: 'Gửi đánh giá thành công! Cảm ơn bạn đã đóng góp cho cộng đồng.',
      data: {
        review: populatedReview,
        targetUser: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews/user/:userId
 * Get user reputation details, rating distribution, badges & review list
 */
const getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('name avatar rating ratingCount createdAt phone');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    const reviews = await UserReview.find({ targetUser: userId })
      .sort({ createdAt: -1 })
      .populate('fromUser', 'name avatar rating')
      .populate('foodShare', 'title quantity');

    // Rating star distribution
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const tagFreq = {};

    reviews.forEach((r) => {
      const star = Math.round(r.rating);
      if (breakdown[star] !== undefined) {
        breakdown[star]++;
      }
      if (Array.isArray(r.tags)) {
        r.tags.forEach((tag) => {
          tagFreq[tag] = (tagFreq[tag] || 0) + 1;
        });
      }
    });

    // Sort tags by popularity
    const topTags = Object.keys(tagFreq)
      .map((tag) => ({ tag, count: tagFreq[tag] }))
      .sort((a, b) => b.count - a.count);

    // Dynamic reputation badges
    const badges = [];
    const giftsSharedCount = await FoodShare.countDocuments({ createdBy: userId, status: 'COMPLETED' });

    if (giftsSharedCount >= 1 || reviews.length >= 1) {
      badges.push({
        id: 'food_saver',
        title: 'Chiến binh Vét Tủ',
        desc: 'Đã tích cực chia sẻ và giải cứu thực phẩm',
        icon: 'leaf',
        color: '#10B981',
      });
    }

    if (user.rating >= 4.5 && reviews.length >= 1) {
      badges.push({
        id: 'super_punctual',
        title: 'Đúng Hẹn & Chu Đáo',
        desc: 'Được đánh giá cao về sự uy tín và đúng giờ',
        icon: 'time',
        color: '#0EA5E9',
      });
    }

    if (user.rating >= 4.8 && reviews.length >= 2) {
      badges.push({
        id: 'generous_neighbor',
        title: 'Người Hàng Xóm Hào Phóng',
        desc: 'Đạt điểm uy tín xuất sắc trên 4.8 sao',
        icon: 'heart',
        color: '#EF4444',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          rating: user.rating || 5.0,
          totalReviews: reviews.length,
          giftsSharedCount,
          breakdown,
        },
        topTags,
        badges,
        reviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getUserReviews,
};
