const axios = require("axios");

exports.getAllRegions =
  async () => {

    try {

      const url =
        "https://api.rivernet.lk/cache-api.php?path=api/overview/region-devices";

      const response =
        await axios.get(url);

      const basinRiverDevices =
        response.data?.results?.basinRiverDevices;

      if (!basinRiverDevices) {
        return [];
      }

      return Object.keys(
        basinRiverDevices
      );

    } catch (error) {

      console.log(
        "Region Service Error:",
        error.message
      );

      throw new Error(
        "Failed to fetch regions"
      );

    }

};