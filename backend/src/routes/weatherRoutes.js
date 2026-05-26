const express = require('express');
const router = express.Router();

const {
  getWeatherByCoords,
  getWeatherByCity
} = require("../controllers/weatherController");
router.get('/', getWeatherByCoords);
router.get("/:city", getWeatherByCity);

module.exports = router;