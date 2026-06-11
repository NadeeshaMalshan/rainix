const https = require('https');
const url = "https://api.open-meteo.com/v1/forecast?latitude=7.2906&longitude=80.6337&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,visibility,surface_pressure&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_probability_max,weather_code,uv_index_max&timezone=auto&forecast_days=14";

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(res.statusCode); console.log(data.substring(0, 500)); });
}).on('error', (err) => {
  console.error("Error:", err.message);
});
