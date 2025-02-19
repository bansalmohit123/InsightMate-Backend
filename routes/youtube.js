const express = require('express')
const router = express.Router();
const {uploadYouTubeVideo,queryYouTube} = require('../controller/youtube_parser');

router.post('/query',queryYouTube);
router.post('/upload', uploadYouTubeVideo);


module.exports = router;