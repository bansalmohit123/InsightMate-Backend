const express = require('express');
const router = express.Router();
const { signup, login, profile ,TokenisValid , getdata } = require('../controller/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const cors = require("cors");
// Signup route
router.post('/signup',cors(), signup);

// Login route
router.post('/login', login);

// Profile route (protected)
router.get('/profile', authMiddleware, profile);

router.post('/TokenisValid', TokenisValid);

router.get('/', authMiddleware, getdata);

module.exports = router;