const {
  fetchRegionRiverData,
  getRiversByLocation,
  getRiverChart
} = require('../services/rivernetService');

exports.getRegionRivers = async (req, res) => {
    try {
        const { region } = req.params; // This parameter might be a region (e.g., ratnapura) or a city (e.g., kuruvita)
        const { city } = req.query;

        // පළමුව region එකක් ලෙස සලකා දත්ත ගන්න උත්සාහ කරනවා
        let data = [];
        try {
            data = await fetchRegionRiverData(region);
        } catch (err) {
            console.log(`Region fetch failed for ${region}, falling back to location search.`);
        }

        // Region එකක් විදියට දත්ත නැත්නම් (උදා: kuruvita), city එකක් විදියට සලකා දත්ත ගන්නවා
        if (!data || data.length === 0) {
            data = await getRiversByLocation(region);
        }

        // query parameter (e.g., ?city=...) දීලා තියෙනවා නම් ඒකෙන් filter කරනවා
        if (city && data) {
            data = data.filter(river => 
                river.city && river.city.toLowerCase() === city.toLowerCase()
            );
        }

        // Enrich rivers with actual 24-hour historical chart data and calculate status
        if (data && data.length > 0) {
            await Promise.all(
                data.map(async (river) => {
                    if (river.deviceKey) {
                        try {
                            const chartData = await getRiverChart(river.deviceKey);
                            river.historicalData = chartData?.results?.series?.[0]?.data || [];
                            
                            if (river.historicalData.length > 0) {
                                const lastReading = river.historicalData[river.historicalData.length - 1].y;
                                river.currentLevel = lastReading;
                                
                                // Determine detailed status based on alert thresholds
                                const alert = river.levels?.alert;
                                const minor = river.levels?.minor;
                                const major = river.levels?.major;
                                const critical = river.levels?.critical;
                                
                                if (critical !== null && critical !== undefined && lastReading >= critical) {
                                    river.status = "CRITICAL FLOOD";
                                } else if (major !== null && major !== undefined && lastReading >= major) {
                                    river.status = "MAJOR FLOOD";
                                } else if (minor !== null && minor !== undefined && lastReading >= minor) {
                                    river.status = "MINOR FLOOD";
                                } else if (alert !== null && alert !== undefined && lastReading >= alert) {
                                    river.status = "ALERT";
                                } else {
                                    river.status = "SAFE";
                                }
                            } else {
                                river.status = "UNKNOWN";
                            }
                        } catch (chartErr) {
                            console.error(`Failed to fetch chart for river ${river.name}:`, chartErr.message);
                            river.historicalData = [];
                            river.status = "UNKNOWN";
                        }
                    } else {
                        river.historicalData = [];
                        river.status = "UNKNOWN";
                    }
                })
            );
        }

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching river data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch river data'
        });
    }
};

exports.getRiverChartData = async (req, res) => {
    try {
        const { deviceKey } = req.params;
        if (!deviceKey) {
            return res.status(400).json({
                success: false,
                message: 'Device key is required'
            });
        }
        const data = await getRiverChart(deviceKey);
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching river chart data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch river chart data'
        });
    }
};
