const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');

const { getoption } = require('../controller/getData');

router.post('/getoption', authMiddleware,getoption);

module.exports = router;