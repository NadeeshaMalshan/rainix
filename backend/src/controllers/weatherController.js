const {
  fetchWeatherData,
  fetchWeatherByCity
} = require("../services/weatherService");
exports.getWeatherByCoords =
  async (req, res) => {

    try {

      const {
        lat,
        lon
      } = req.query;

      if (!lat || !lon) {

        return res.status(400).json({
          success: false,
          message:
            "Latitude and longitude required"
        });

      }

      const data =
        await fetchWeatherData(lat, lon);

      res.json({
        success: true,
        data
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch weather"
      });

    }

};


exports.getWeatherByCity =
  async (req, res) => {

    try {

      const { city } = req.params;

      const data =
        await fetchWeatherByCity(city);

      res.json({
        success: true,
        data
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch weather"
      });

    }

};