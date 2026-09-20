const { scanFoodOrReceiptImage, parseVoiceOrTextPrompt } = require('../services/aiService');

// @desc    Scan receipt or food image using AI Vision
// @route   POST /api/ai/scan-image
// @access  Public / Private
exports.scanImage = async (req, res, next) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp dữ liệu hình ảnh (base64)',
      });
    }

    const items = await scanFoodOrReceiptImage(imageBase64, mimeType);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error('Error in scanImage controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Không thể phân tích hình ảnh bằng AI',
    });
  }
};

// @desc    Parse natural language voice / text prompt into structured items
// @route   POST /api/ai/parse-text
// @access  Public / Private
exports.parseVoiceText = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp nội dung văn bản hoặc giọng nói',
      });
    }

    const items = await parseVoiceOrTextPrompt(text);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error('Error in parseVoiceText controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Không thể phân tích câu nói bằng AI',
    });
  }
};
