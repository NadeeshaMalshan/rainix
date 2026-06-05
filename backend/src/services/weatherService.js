const axios = require("axios");
const SunCalc = require("suncalc");

/**
 * Fetches rich, comprehensive weather forecast telemetry for specific coordinates.
 * Includes current, hourly (next 24h), and daily (14 days) forecast matrices.
 */
exports.fetchWeatherData = async (latitude, longitude) => {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,visibility,surface_pressure` +
      `&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_probability_max,weather_code,uv_index_max` +
      `&timezone=auto&forecast_days=14`;

    const weatherResponse = await axios.get(weatherUrl);
    const { current, hourly, daily } = weatherResponse.data;

    // Fetch AQI and Pollen
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,alder_pollen,birch_pollen,grass_pollen,ragweed_pollen,olive_pollen,mugwort_pollen`;
    const aqiResponse = await axios.get(aqiUrl).catch(() => ({ data: {} }));
    const aqiData = aqiResponse.data.current || {};

    // Calculate current hour's precipitation probability from hourly data
    const currentHourStr = current.time.slice(0, 13) + ":00";
    const hourlyIndex = hourly.time.findIndex(t => t.startsWith(currentHourStr.slice(0, 13)));
    const currentPrecipitationProbability = hourlyIndex !== -1 ? hourly.precipitation_probability[hourlyIndex] : 0;

    // Calculate moon details
    const moonIllumination = SunCalc.getMoonIllumination(new Date());
    const moonTimes = SunCalc.getMoonTimes(new Date(), parseFloat(latitude), parseFloat(longitude));
    let moonPhaseName = "New Moon";
    const p = moonIllumination.phase;
    if (p > 0 && p < 0.25) moonPhaseName = "Waxing crescent";
    else if (Math.abs(p - 0.25) < 0.02) moonPhaseName = "First quarter";
    else if (p > 0.25 && p < 0.5) moonPhaseName = "Waxing gibbous";
    else if (Math.abs(p - 0.5) < 0.02) moonPhaseName = "Full moon";
    else if (p > 0.5 && p < 0.75) moonPhaseName = "Waning gibbous";
    else if (Math.abs(p - 0.75) < 0.02) moonPhaseName = "Last quarter";
    else if (p > 0.75 && p < 1) moonPhaseName = "Waning crescent";

    return {
      coordinates: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      weather: {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        feelsLike: current.apparent_temperature,
        rain: current.rain,
        precipitation: current.precipitation,
        precipitationProbability: currentPrecipitationProbability,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        visibility: current.visibility,
        weatherCode: current.weather_code,
        pressure: current.surface_pressure,
        uvIndex: daily.uv_index_max ? daily.uv_index_max[0] : 0,
        aqi: aqiData.us_aqi || 0,
        pollen: {
          tree: Math.max(aqiData.alder_pollen || 0, aqiData.birch_pollen || 0, aqiData.olive_pollen || 0),
          grass: aqiData.grass_pollen || 0,
          ragweed: Math.max(aqiData.ragweed_pollen || 0, aqiData.mugwort_pollen || 0)
        },
        time: current.time,

        // Today's boundaries and solar details
        high: daily.temperature_2m_max[0],
        low: daily.temperature_2m_min[0],
        sunrise: daily.sunrise[0],
        sunset: daily.sunset[0],
        moonPhase: p,
        moonPhaseName,
        moonrise: moonTimes.rise ? moonTimes.rise.toISOString() : null,
        moonset: moonTimes.set ? moonTimes.set.toISOString() : null,

        // Hourly: Next 24 hours
        hourly: hourly.time.map((timeStr, idx) => ({
          time: timeStr,
          temperature: hourly.temperature_2m[idx],
          humidity: hourly.relative_humidity_2m[idx],
          feelsLike: hourly.apparent_temperature[idx],
          precipitationProbability: hourly.precipitation_probability[idx],
          precipitation: hourly.precipitation[idx],
          weatherCode: hourly.weather_code[idx],
          windSpeed: hourly.wind_speed_10m[idx],
          windDirection: hourly.wind_direction_10m[idx],
        })).slice(hourlyIndex !== -1 ? hourlyIndex : 0, (hourlyIndex !== -1 ? hourlyIndex : 0) + 24),

        // Daily: 14 days forecast
        forecast14Days: daily.time.map((timeStr, idx) => ({
          date: timeStr,
          high: daily.temperature_2m_max[idx],
          low: daily.temperature_2m_min[idx],
          avg: daily.temperature_2m_mean ? daily.temperature_2m_mean[idx] : (daily.temperature_2m_max[idx] + daily.temperature_2m_min[idx]) / 2,
          feelsLikeMax: daily.apparent_temperature_max[idx],
          feelsLikeMin: daily.apparent_temperature_min[idx],
          sunrise: daily.sunrise[idx],
          sunset: daily.sunset[idx],
          precipitationProbabilityMax: daily.precipitation_probability_max[idx],
          weatherCode: daily.weather_code[idx],
        }))
      }
    };
  } catch (error) {
    console.log("Weather Service Coords Error:", error.message);
    throw new Error("Failed to fetch weather data by coordinates");
  }
};

/**
 * Resolves city to coordinates and retrieves rich weather telemetry.
 */
exports.fetchWeatherByCity = async (city) => {
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`;
    const geoResponse = await axios.get(geoUrl);
    const location = geoResponse.data.results?.[0];

    if (!location) {
      throw new Error("City not found");
    }

    const { latitude, longitude, name, country } = location;

    // Fetch details using coordinates helper
    const weatherData = await exports.fetchWeatherData(latitude, longitude);

    return {
      city: name,
      country,
      ...weatherData
    };
  } catch (error) {
    console.log("Weather Service Error:", error.message);
    throw new Error("Failed to fetch weather data");
  }
};