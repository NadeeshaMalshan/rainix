const axios = require("axios");

exports.getRadarMetaData =
  async () => {

    try {

      const url =
        "https://api.rainviewer.com/public/weather-maps.json";

      const response =
        await axios.get(url);

      return response.data;

    } catch (error) {

      console.log(
        "RainViewer Error:",
        error.message
      );

      throw new Error(
        "Failed to fetch radar data"
      );

    }

};