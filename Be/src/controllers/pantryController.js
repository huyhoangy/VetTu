const PantryItem = require('../models/PantryItem');
const Notification = require('../models/Notification');

// Helper to compute expiration metadata
const formatPantryItem = (item) => {
  const itemObj = item.toObject ? item.toObject() : item;
  const now = new Date();
  const expiry = new Date(itemObj.expiryDate);
  
  // Set time to end of the day for accurate date comparison
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  
  const diffTime = expiryDay.getTime() - startOfToday.getTime();
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  let expiryStatus = 'FRESH';
  let statusText = `Còn ${daysRemaining} ngày`;
  let statusColor = '#10B981'; // Green
  
  if (daysRemaining < 0) {
    expiryStatus = 'EXPIRED';
    statusText = `Đã quá hạn ${Math.abs(daysRemaining)} ngày`;
    statusColor = '#EF4444'; // Red
  } else if (daysRemaining === 0) {
    expiryStatus = 'EXPIRED';
    statusText = 'Hết hạn hôm nay';
    statusColor = '#EF4444'; // Red
  } else if (daysRemaining <= 2) {
    expiryStatus = 'EXPIRING_SOON';
    statusText = `Hết hạn trong ${daysRemaining} ngày`;
    statusColor = '#F59E0B'; // Amber / Orange
  }

  return {
    ...itemObj,
    daysRemaining,
    expiryStatus,
    statusText,
    statusColor,
  };
};

// @desc    Get all user pantry items with filters & stats
// @route   GET /api/pantry
// @access  Private
exports.getUserPantry = async (req, res, next) => {
  try {
    const { userId, location, status, search } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp userId' });
    }

    const filter = { userId, isUsed: false };

    if (location && location !== 'ALL') {
      filter.storageLocation = location;
    }

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const rawItems = await PantryItem.find(filter).sort({ expiryDate: 1, createdAt: -1 });
    const formattedItems = rawItems.map(formatPantryItem);

    // Apply status filter in memory after expiration calculation
    let filteredItems = formattedItems;
    if (status && status !== 'ALL') {
      if (status === 'EXPIRING_SOON') {
        filteredItems = formattedItems.filter(
          (i) => i.expiryStatus === 'EXPIRING_SOON' || i.daysRemaining === 0
        );
      } else if (status === 'EXPIRED') {
        filteredItems = formattedItems.filter((i) => i.expiryStatus === 'EXPIRED');
      } else if (status === 'FRESH') {
        filteredItems = formattedItems.filter((i) => i.expiryStatus === 'FRESH');
      }
    }

    // Compute stats for all user active items
    const allUserItems = await PantryItem.find({ userId, isUsed: false });
    const allFormatted = allUserItems.map(formatPantryItem);

    const stats = {
      total: allFormatted.length,
      expiringSoon: allFormatted.filter((i) => i.expiryStatus === 'EXPIRING_SOON' || i.daysRemaining === 0).length,
      expired: allFormatted.filter((i) => i.daysRemaining < 0).length,
      fresh: allFormatted.filter((i) => i.expiryStatus === 'FRESH').length,
      chilled: allFormatted.filter((i) => i.storageLocation === 'CHILLED').length,
      frozen: allFormatted.filter((i) => i.storageLocation === 'FROZEN').length,
      pantry: allFormatted.filter((i) => i.storageLocation === 'PANTRY').length,
    };

    res.status(200).json({
      success: true,
      count: filteredItems.length,
      stats,
      data: filteredItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to pantry
// @route   POST /api/pantry
// @access  Private
exports.addPantryItem = async (req, res, next) => {
  try {
    const {
      userId,
      name,
      category = 'OTHER',
      quantity = '1 phần',
      storageLocation = 'CHILLED',
      purchaseDate,
      expiryDate,
      notes = '',
    } = req.body;

    if (!userId || !name || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tên thực phẩm và ngày hết hạn',
      });
    }

    const newItem = await PantryItem.create({
      userId,
      name: name.trim(),
      category,
      quantity: quantity.trim(),
      storageLocation,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      expiryDate: new Date(expiryDate),
      notes: notes ? notes.trim() : '',
    });

    const formatted = formatPantryItem(newItem);

    res.status(201).json({
      success: true,
      message: 'Đã thêm thực phẩm vào tủ lạnh',
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Batch add multiple pantry items (from AI Scan or voice)
// @route   POST /api/pantry/batch
// @access  Private
exports.batchAddPantryItems = async (req, res, next) => {
  try {
    const { userId, items } = req.body;

    if (!userId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp danh sách thực phẩm hợp lệ',
      });
    }

    const createdItems = [];
    const now = new Date();

    for (const item of items) {
      if (!item.name || !item.name.trim()) continue;

      let expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
      if (!expiryDate || isNaN(expiryDate.getTime())) {
        const days = Number(item.suggestedDays || item.days || 4);
        const calcDate = new Date();
        calcDate.setDate(calcDate.getDate() + days);
        expiryDate = calcDate;
      }

      const created = await PantryItem.create({
        userId,
        name: item.name.trim(),
        category: item.category || 'OTHER',
        quantity: item.quantity ? String(item.quantity).trim() : '1 phần',
        storageLocation: item.storageLocation || 'CHILLED',
        purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : now,
        expiryDate,
        notes: item.notes ? String(item.notes).trim() : '',
      });

      createdItems.push(formatPantryItem(created));
    }

    res.status(201).json({
      success: true,
      message: `Đã thêm thành công ${createdItems.length} món vào tủ lạnh`,
      count: createdItems.length,
      data: createdItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update pantry item
// @route   PUT /api/pantry/:id
// @access  Private
exports.updatePantryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);
    if (updateData.purchaseDate) updateData.purchaseDate = new Date(updateData.purchaseDate);

    const updated = await PantryItem.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thực phẩm' });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật thành công',
      data: formatPantryItem(updated),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete pantry item
// @route   DELETE /api/pantry/:id
// @access  Private
exports.deletePantryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await PantryItem.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thực phẩm' });
    }

    res.status(200).json({
      success: true,
      message: 'Đã xoá thực phẩm khỏi tủ lạnh',
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check and create expiry reminder notifications for users
// @route   POST /api/pantry/check-reminders
// @access  Public / Cron / Trigger
exports.checkAndCreateExpiryReminders = async (req, res, next) => {
  try {
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find all active items expiring between today and 2 days from now
    const expiringItems = await PantryItem.find({
      isUsed: false,
      expiryDate: { $gte: startOfToday, $lte: twoDaysLater },
    }).populate('userId', 'name email');

    // Group items by user
    const userMap = {};
    for (const item of expiringItems) {
      if (!item.userId) continue;
      const uid = item.userId._id ? item.userId._id.toString() : item.userId.toString();
      if (!userMap[uid]) {
        userMap[uid] = [];
      }
      userMap[uid].push(item.name);
    }

    let notificationsCreated = 0;

    for (const [userId, itemNames] of Object.entries(userMap)) {
      // Check if a reminder notification was already sent to this user today
      const alreadyNotifiedToday = await Notification.findOne({
        recipient: userId,
        type: 'EXPIRY_ALERT',
        createdAt: { $gte: startOfToday },
      });

      if (!alreadyNotifiedToday) {
        const displayItems = itemNames.slice(0, 3).join(', ');
        const extraCount = itemNames.length > 3 ? ` và ${itemNames.length - 3} món khác` : '';

        await Notification.create({
          recipient: userId,
          title: '🔔 Cảnh báo hạn thực phẩm',
          message: `Tủ lạnh của bạn có ${displayItems}${extraCount} sắp hết hạn trong 1-2 ngày tới. Hãy Vét Tủ nấu ngay!`,
          type: 'EXPIRY_ALERT',
        });

        notificationsCreated++;
      }
    }

    res.status(200).json({
      success: true,
      expiringCount: expiringItems.length,
      notificationsCreated,
    });
  } catch (error) {
    if (next) next(error);
    else console.error('Error in checkAndCreateExpiryReminders:', error);
  }
};
