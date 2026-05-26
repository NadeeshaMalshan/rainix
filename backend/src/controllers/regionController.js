const {
  getAllRegions
} = require("../services/regionService");

exports.getRegions =
  async (req, res) => {

    try {

      const regions =
        await getAllRegions();

      res.json({

        success: true,

        data: regions

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Failed to fetch regions"

      });

    }

};