const express = require('express');
const router = express.Router();

const { getoption } = require('../controller/getData');

router.post('/getoption', getoption);

module.exports = router;