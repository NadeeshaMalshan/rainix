const express = require('express');
const router = express.Router();

const {
  getRegionRivers,
  getRiverChartData
} = require('../controllers/riverController');

router.get('/chart/:deviceKey', getRiverChartData);
router.get('/:region/', getRegionRivers);

module.exports = router;