const express = require('express')
const router = express.Router();
const {uploadYouTubeVideo,queryYouTube} = require('../controller/youtube_parser');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/query',authMiddleware,queryYouTube);
router.post('/upload',authMiddleware, uploadYouTubeVideo);


module.exports = router;