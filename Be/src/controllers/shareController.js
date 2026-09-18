const FoodShare = require('../models/FoodShare');
const User = require('../models/User');

// Helper to format distance nicely
const formatDistance = (meters) => {
  if (!meters && meters !== 0) return 'Gần bạn';
  if (meters < 1000) {
    return `Cách ~${Math.round(meters)}m`;
  }
  return `Cách ~${(meters / 1000).toFixed(1)}km`;
};

// GET /api/shares/nearby
exports.getNearbyShares = async (req, res) => {
  try {
    const {
      lng = 105.782,
      lat = 21.031,
      maxDistance = 15000, // 15km
      category,
      type,
      search,
    } = req.query;

    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);
    const distanceLimit = parseInt(maxDistance, 10);

    const matchQuery = {
      status: 'AVAILABLE',
      expiresAt: { $gt: new Date() },
    };

    if (category && category !== 'ALL') {
      matchQuery.category = category;
    }

    if (type && type !== 'ALL') {
      matchQuery.type = type;
    }

    if (search && search.trim()) {
      matchQuery.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // Use $geoNear aggregation to accurately calculate distance
    const shares = await FoodShare.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distanceMeters',
          maxDistance: distanceLimit,
          spherical: true,
          query: matchQuery,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'author',
        },
      },
      {
        $unwind: {
          path: '$author',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          category: 1,
          type: 1,
          quantity: 1,
          images: 1,
          status: 1,
          location: 1,
          addressName: 1,
          contactPhone: 1,
          contactNote: 1,
          expiresAt: 1,
          createdAt: 1,
          distanceMeters: 1,
          'author._id': 1,
          'author.name': 1,
          'author.avatar': 1,
          'author.rating': 1,
        },
      },
      {
        $sort: { distanceMeters: 1 },
      },
    ]);

    const formattedShares = shares.map((share) => ({
      ...share,
      distanceText: formatDistance(share.distanceMeters),
    }));

    res.status(200).json({
      success: true,
      count: formattedShares.length,
      data: formattedShares,
    });
  } catch (error) {
    console.error('Error in getNearbyShares:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách chia sẻ lân cận',
      error: error.message,
    });
  }
};

// GET /api/shares/:id
exports.getShareById = async (req, res) => {
  try {
    const { id } = req.params;
    const share = await FoodShare.findById(id).populate('createdBy', 'name avatar email rating');

    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài chia sẻ',
      });
    }

    res.status(200).json({
      success: true,
      data: share,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy chi tiết bài chia sẻ',
      error: error.message,
    });
  }
};

// POST /api/shares
exports.createShare = async (req, res) => {
  try {
    const {
      title,
      description,
      category = 'VEGGIES',
      type = 'GIFT',
      quantity,
      images,
      latitude = 21.031,
      longitude = 105.782,
      addressName,
      contactPhone,
      contactNote,
      expiresHours = 48,
    } = req.body;

    if (!title || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tên thực phẩm và số lượng',
      });
    }

    const expiresAt = new Date(Date.now() + parseInt(expiresHours, 10) * 60 * 60 * 1000);

    const newShare = await FoodShare.create({
      title,
      description,
      category,
      type,
      quantity,
      images: images && images.length > 0 ? images : ['https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800'],
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      addressName: addressName || 'Gần vị trí của bạn',
      contactPhone: contactPhone || '',
      contactNote: contactNote || 'Nhắn tin qua ứng dụng để hẹn giờ lấy đồ',
      expiresAt,
      createdBy: req.user?._id || req.body.userId,
    });

    const populatedShare = await FoodShare.findById(newShare._id).populate(
      'createdBy',
      'name avatar rating'
    );

    res.status(201).json({
      success: true,
      message: 'Đăng bài chia sẻ thực phẩm thành công!',
      data: populatedShare,
    });
  } catch (error) {
    console.error('Error creating share:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo bài chia sẻ',
      error: error.message,
    });
  }
};

// PUT /api/shares/:id/status
exports.updateShareStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const share = await FoodShare.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!share) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài chia sẻ',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: share,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật trạng thái',
      error: error.message,
    });
  }
};

// POST /api/shares/seed
exports.seedSampleShares = async (req, res) => {
  try {
    // Get or create dummy donor user
    let donor = await User.findOne();
    if (!donor) {
      donor = await User.create({
        email: 'hangxom@vettu.app',
        name: 'Chị Mai (Hàng xóm thân thiện)',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400',
        rating: 5.0,
      });
    }

    const baseLng = 105.782;
    const baseLat = 21.031;

    const sampleShares = [
      {
        title: 'Bó rau muống sạch quê gửi lên',
        description: 'Mẹ ở quê gửi nhiều rau muống quá ăn không kịp, tặng bạn nào gần khu vực Cầu Giấy nấu canh/xào tỏi nhé.',
        category: 'VEGGIES',
        type: 'GIFT',
        quantity: '2 bó tươi rói',
        images: ['https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=800'],
        location: { type: 'Point', coordinates: [baseLng + 0.002, baseLat + 0.001] }, // ~250m
        addressName: 'Ngõ 68 Cầu Giấy, Hà Nội',
        contactPhone: '0987654321',
        contactNote: 'Có thể qua lấy sau 18h tối nay',
        createdBy: donor._id,
      },
      {
        title: '3 củ khoai tây Đà Lạt & 2 củ cà rốt',
        description: 'Mua nấu lẩu còn dư nguyên vẹn chưa gọt, tặng bạn nào cần nấu bữa tối.',
        category: 'VEGGIES',
        type: 'GIFT',
        quantity: '3 củ khoai + 2 cà rốt',
        images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=800'],
        location: { type: 'Point', coordinates: [baseLng - 0.003, baseLat + 0.002] }, // ~450m
        addressName: 'Chung cư Discovery Complex',
        contactPhone: '0912345678',
        contactNote: 'Gửi lễ tân sảnh A',
        createdBy: donor._id,
      },
      {
        title: '1 khay ức gà CP còn nguyên seal (500g)',
        description: 'Mình đổi chế độ ăn nên muốn tặng hoặc đổi lấy 1 vỉ trứng gà.',
        category: 'PROTEIN',
        type: 'EXCHANGE',
        quantity: '500 gram',
        images: ['https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=800'],
        location: { type: 'Point', coordinates: [baseLng + 0.005, baseLat - 0.004] }, // ~750m
        addressName: 'Khu đô thị Dịch Vọng Hậu',
        contactPhone: '0909888999',
        contactNote: 'Đổi lấy trứng gà hoặc xúc xích',
        createdBy: donor._id,
      },
      {
        title: 'Hũ Kim Chi Hàn Quốc tự làm giòn ngon',
        description: 'Tự muối hũ kim chi cải thảo 1kg ăn không hết, chia sẻ 1 nửa cho bạn nào thích ăn mì cay hoặc nấu canh đậu phụ.',
        category: 'CAN_DRY',
        type: 'GIFT',
        quantity: '1 hũ 500g',
        images: ['https://images.unsplash.com/photo-1583224964978-2257b960c3d3?q=80&w=800'],
        location: { type: 'Point', coordinates: [baseLng + 0.008, baseLat + 0.006] }, // ~1.2km
        addressName: 'Phố Trần Thái Tông',
        contactPhone: '0933445566',
        contactNote: 'Kim chi mới muối 3 ngày vừa chua tới',
        createdBy: donor._id,
      },
      {
        title: 'Combo gia vị: Gừng, sả, hành tím, tỏi',
        description: 'Gia vị tươi mua nhiều nấu cỗ còn dư, chia lại cho bạn nào phòng trọ đang cần.',
        category: 'SPICES',
        type: 'GIFT',
        quantity: '1 túi nhỏ',
        images: ['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=800'],
        location: { type: 'Point', coordinates: [baseLng - 0.006, baseLat - 0.005] }, // ~1.1km
        addressName: 'Ngõ 165 Xuân Thủy',
        contactPhone: '0977112233',
        contactNote: 'Nhắn trước khi qua lấy',
        createdBy: donor._id,
      },
      {
        title: '4 bắp ngô ngọt luộc sẵn thơm phức',
        description: 'Bác ở quê mang lên nhiều bắp ngọt luộc thơm lừng, tặng bớt cho các bạn sinh viên ăn xế chiều.',
        category: 'COOKED',
        type: 'GIFT',
        quantity: '4 trái',
        images: ['https://images.unsplash.com/photo-1551782450-a2132b4ba21d?q=80&w=800'],
        location: { type: 'Point', coordinates: [baseLng + 0.012, baseLat + 0.008] }, // ~1.8km
        addressName: 'Đường Nguyễn Phong Sắc',
        contactPhone: '0988665544',
        contactNote: 'Còn nóng hổi luôn nhé',
        createdBy: donor._id,
      },
    ];

    await FoodShare.deleteMany({});
    const created = await FoodShare.insertMany(sampleShares);

    res.status(200).json({
      success: true,
      message: `Đã nạp thành công ${created.length} bài chia sẻ thực phẩm mẫu gần bạn!`,
      data: created,
    });
  } catch (error) {
    console.error('Error seeding shares:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể nạp dữ liệu mẫu',
      error: error.message,
    });
  }
};
