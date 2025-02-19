const express = require('express');
const router = express.Router();
const {uploadURL,queryURL} = require('../controller/url_parser');


router.post('/query',queryURL);
router.post('/upload', uploadURL);

module.exports = router;