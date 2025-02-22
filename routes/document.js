const express = require('express');
const router = express.Router();
const {query,uploaddocument} = require('../controller/document_parser');
const multer = require('multer');
const { authMiddleware } = require('../middleware/authMiddleware');
// Store files in memory instead of disk
const upload = multer({
    storage: multer.memoryStorage(), // Store file in memory buffer
    limits: { fileSize: 10 * 1024 * 1024 }, // Set file size limit (optional)
  });

router.post('/query',authMiddleware,query);
router.post('/upload', upload.single('file'), authMiddleware, uploaddocument);


module.exports = router;