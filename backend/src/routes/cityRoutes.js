const express = require("express");

const router = express.Router();

const {
  getCityOverview
} = require("../controllers/cityController");

router.get("/:city", getCityOverview);

module.exports = router;