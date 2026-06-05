const axios = require("axios");
const {fetchWeatherByCity, fetchWeatherData} = require("../services/weatherService");
const {
  getRiversByLocation: getArcgisRiversByLocation
} = require("../services/arcgisService");
const {
  getRiversByLocation: getRivernetRiversByLocation,
  getRiverChart
} = require("../services/rivernetService");
const {getRadarMetaData} = require("../services/rainviewer");

const normalize = (str) => {
    if (!str) return "";
    return str.trim().toLowerCase().replace(/[^a-z0-9]/g, "").replace(/w/g, "v").replace(/th/g, "t");
};

const mergeRivers = (rivernetData, arcgisData) => {
    const data = [...(rivernetData || [])];
    const existingNames = new Set(data.map(r => normalize(r.name)));
    for (const arcRiver of (arcgisData || [])) {
        if (arcRiver.id === "arcgis_rathnapura") continue; // Removed as requested
        const normName = normalize(arcRiver.name);
        if (!existingNames.has(normName)) {
            data.push(arcRiver);
        }
    }
    return data;
};

exports.getCityOverview = async (req, res) => {
    try {
        const {city} = req.params;
        const {lat, lon} = req.query;
        console.log("Fetching weather...");

        let weather;
        let resolvedCityName = city;
        if (lat && lon) {
            weather = await fetchWeatherData(lat, lon);
            
            try {
                const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`, {
                    headers: {
                        'User-Agent': 'rainiX-Weather-App'
                    },
                    timeout: 4000
                });
                
                const address = geoRes.data?.address;
                if (address) {
                    const actualCity = address.city || address.town || address.suburb || address.village || address.municipality || address.county || address.state || 'My Location';
                    const actualCountry = address.country || 'Your Location';
                    
                    resolvedCityName = actualCity;
                    weather.city = actualCity;
                    weather.country = actualCountry;
                } else {
                    weather.city = city;
                    weather.country = 'Your Location';
                }
            } catch (geoErr) {
                console.error("Reverse geocoding failed:", geoErr.message);
                weather.city = city;
                weather.country = 'Your Location';
            }
        } else {
            try {
                weather = await fetchWeatherByCity(city);
            } catch (weatherErr) {
                console.error("Weather data not found for:", city);
                weather = null;
            }
        }

        console.log("Weather OK");

        console.log("Fetching rivers...");
        let rivernetRivers = [];
        let arcgisRivers = [];
        try {
            rivernetRivers = await getRivernetRiversByLocation(resolvedCityName);
        } catch (e) { console.error(e); }

        try {
            arcgisRivers = await getArcgisRiversByLocation(resolvedCityName);
        } catch (e) { console.error(e); }

        let rivers = mergeRivers(rivernetRivers, arcgisRivers);
        console.log("Rivers OK");

        // Rivers are already filtered by their respective services

        // Enrich rivernet rivers with actual 24-hour historical chart data
        if (rivers && rivers.length > 0) {
            console.log("Enriching rivers with historical chart data...");
            await Promise.all(
                rivers.map(async (river) => {
                    if (river.deviceKey) {
                        try {
                            const chartData = await getRiverChart(river.deviceKey);
                            river.historicalData = chartData?.results?.series?.[0]?.data || [];
                            
                            if (river.historicalData.length > 0) {
                                const lastReading = river.historicalData[river.historicalData.length - 1].y;
                                const alertThreshold = river.levels?.alert;
                                
                                if (alertThreshold !== null && alertThreshold !== undefined && lastReading >= alertThreshold) {
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
                        if (!river.historicalData) {
                            river.historicalData = [];
                        }
                        if (river.status === undefined || river.status === null) {
                            river.status = "UNKNOWN";
                        }
                    }
                })
            );
        }

        // If not a full request, remove historical data to save space
        const isFullRequest = req.query.full === 'true';
        if (!isFullRequest && rivers && rivers.length > 0) {
            rivers = rivers.map(r => {
                const cleanRiver = { ...r };
                delete cleanRiver.historicalData;
                return cleanRiver;
            });
        }

        console.log("Fetching radar...");
        let radar = null;
        try {
            const radarData = await getRadarMetaData();
            const latestFrame = radarData.radar.past[radarData.radar.past.length - 1];
            radar = {
                generated: radarData.generated,
                tileUrl: `${radarData.host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
                latestFrame: latestFrame.time
            };
            console.log("Radar OK");
        } catch (radarError) {
            console.error("Failed to fetch radar for city overview:", radarError.message);
        }

        res.json({
            success: true,
            data: {
                city: resolvedCityName,
                weather,
                rivers,
                radar
            }
        });
    } catch (error) {
        console.error("City Overview Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch city overview"
        });
    }
}