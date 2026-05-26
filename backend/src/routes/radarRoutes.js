const express = require("express");

const router = express.Router();

const {
  getRadar
} = require(
  "../controllers/radarController"
);

router.get("/", getRadar);

module.exports = router;