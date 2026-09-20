const express = require('express');
const router = express.Router();
const { scanImage, parseVoiceText } = require('../controllers/aiController');

router.post('/scan-image', scanImage);
router.post('/parse-text', parseVoiceText);

module.exports = router;
