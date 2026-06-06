const express = require('express');
const router = express.Router();
const meteoController = require('../controllers/meteoController');

router.get('/', meteoController.getMeteoContent);

module.exports = router;
