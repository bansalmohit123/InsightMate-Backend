const express = require('express');
const router = express.Router();
const { saveMessage, getMessages } = require('../controller/chatController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/save', authMiddleware, saveMessage);
router.get('/get/:sessionId', getMessages);


module.exports = router;