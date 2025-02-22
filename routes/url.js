const express = require('express');
const router = express.Router();
const {uploadURL,queryURL} = require('../controller/url_parser');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/query',authMiddleware,queryURL);
router.post('/upload',authMiddleware, uploadURL);

module.exports = router;