const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { auth: firebaseAuth } = require('../config/firebase');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, location } = req.body;

    // 1. Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // 2. Check existing user
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // 3. Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
      location: location || {
        type: 'Point',
        coordinates: [106.7009, 10.7769],
        address: 'TP. Hồ Chí Minh',
      },
    });

    // 4. Return token & user payload
    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          phone: user.phone,
          rating: user.rating,
          ratingCount: user.ratingCount,
          location: user.location,
        },
        token,
      },
      message: 'Account registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // 2. Find user with password included
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 3. Check password match
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 4. Return token & user payload
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          phone: user.phone,
          rating: user.rating,
          ratingCount: user.ratingCount,
          location: user.location,
        },
        token,
      },
      message: 'Logged in successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate with Firebase ID Token (Google / Apple)
// @route   POST /api/auth/firebase-login
// @access  Public
const firebaseLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Firebase idToken',
      });
    }

    console.log(`[Backend Firebase Auth] Nhận token xác thực (${idToken.substring(0, 15)}...)`);

    // 1. Verify token with Firebase Admin or Google OAuth API
    let email, name, picture, uid;

    try {
      if (firebaseAuth) {
        const decodedToken = await firebaseAuth.verifyIdToken(idToken);
        email = decodedToken.email;
        name = decodedToken.name;
        picture = decodedToken.picture;
        uid = decodedToken.uid;
        console.log(`[Backend Firebase Auth] Xác thực thành công qua Firebase Admin: ${email}`);
      }
    } catch (fbErr) {
      console.log('[Backend Firebase Auth] Firebase Admin verify không khớp, chuyển sang Google API fallback:', fbErr.message);
    }

    // Fallback: Verify directly via Google OAuth tokeninfo / userinfo
    if (!email) {
      try {
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          email = googleData.email;
          name = googleData.name;
          picture = googleData.picture;
          uid = googleData.sub;
          console.log(`[Backend Google Auth] Xác thực thành công qua tokeninfo: ${email}`);
        } else {
          // Try userinfo with Access Token
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (userinfoRes.ok) {
            const userData = await userinfoRes.json();
            email = userData.email;
            name = userData.name;
            picture = userData.picture;
            uid = userData.sub;
            console.log(`[Backend Google Auth] Xác thực thành công qua userinfo: ${email}`);
          }
        }
      } catch (gErr) {
        console.error('[Backend Google Auth] Lỗi gọi Google API:', gErr.message);
      }
    }

    if (!email) {
      console.error('[Backend Auth] Token không hợp lệ ở cả Firebase và Google API');
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Google/Firebase token',
      });
    }

    // 2. Find or create user in MongoDB
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name: name || 'Đầu bếp Vét Tủ',
        email: email.toLowerCase(),
        password: uid || 'social-auth-password',
        avatar: picture || 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
        location: {
          type: 'Point',
          coordinates: [106.7009, 10.7769],
          address: 'TP. Hồ Chí Minh',
        },
      });
    } else if (picture && user.avatar.includes('flaticon')) {
      user.avatar = picture;
      await user.save();
    }

    // 3. Generate system JWT token
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          phone: user.phone,
          rating: user.rating,
          ratingCount: user.ratingCount,
          location: user.location,
        },
        token,
      },
      message: 'Logged in with Firebase successfully',
    });
  } catch (error) {
    console.error('Firebase Auth Verification Error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired Firebase token',
      error: error.message,
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private (Protected by JWT)
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          phone: user.phone,
          rating: user.rating,
          ratingCount: user.ratingCount,
          location: user.location,
        },
      },
      message: 'User profile fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user GPS coordinates & address
// @route   PUT /api/auth/location
// @access  Private
const updateLocation = async (req, res, next) => {
  try {
    const { longitude, latitude, address } = req.body;

    if (longitude === undefined || latitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both longitude and latitude',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        location: {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)], // [lng, lat]
          address: address || '',
        },
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: {
        location: updatedUser.location,
      },
      message: 'Location updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  firebaseLogin,
  getMe,
  updateLocation,
};
