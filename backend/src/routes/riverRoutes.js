const express = require('express');
const router = express.Router();

const {
  getRiverChartData,
  getAllRivers,
  getAreaRivers,
  getRegionRivers,
  searchRivers
} = require('../controllers/riverController');

router.get('/search', searchRivers);
router.get('/chart/:deviceKey', getRiverChartData);
router.get('/', getAllRivers);
router.get('/area/:area', getAreaRivers);
router.get('/:region/', getRegionRivers);

module.exports = router;