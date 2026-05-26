const {
  getRadarMetaData
} = require(
  "../services/rainviewer"
);

exports.getRadar =
  async (req, res) => {

    try {

      const data =
        await getRadarMetaData();

      const latestFrame =
        data.radar.past[
          data.radar.past.length - 1
        ];

      const tileUrl =
        `${data.host}/v2/radar/${latestFrame.time}/256/{z}/{x}/{y}/2/1_1.png`;

      res.json({

        success: true,

        data: {

          generated:
            data.generated,

          tileUrl,

          latestFrame:
            latestFrame.time

        }

      });

    } catch (error) {

      console.error(error);

      res.status(500).json({

        success: false,

        message:
          "Failed to fetch radar"

      });

    }

};