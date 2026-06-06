// No longer using rainviewer
// Ensure OPENWEATHERMAP_API_KEY is available or warn
if (!process.env.OPENWEATHERMAP_API_KEY) {
    console.warn("OPENWEATHERMAP_API_KEY is not set in environment variables. Radar tiles will not load properly.");
}

exports.getRadar =
  async (req, res) => {

    try {

      const tileUrl =
        `https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=${process.env.OPENWEATHERMAP_API_KEY}`;

      res.json({

        success: true,

        data: {

          generated:
            Math.floor(Date.now() / 1000),

          tileUrl,

          latestFrame:
            Math.floor(Date.now() / 1000)

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