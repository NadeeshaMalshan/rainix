const express = require('express');
const router = express.Router();

const {
  getRiverChartData,
  getAllRivers,
  getAreaRivers,
  getRegionRivers
} = require('../controllers/riverController');

router.get('/chart/:deviceKey', getRiverChartData);
router.get('/', getAllRivers);
router.get('/area/:area', getAreaRivers);
router.get('/:region/', getRegionRivers);

module.exports = router;