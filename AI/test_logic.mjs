import axios from 'axios';

const LAT = 6.6828;
const LON = 80.3992;
const RIVERNET_DEVICE_KEY = '2bq292rf6uz';

async function getWeatherData(startDate, endDate) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,precipitation&start_date=${startDate}&end_date=${endDate}`;
    try {
        const response = await axios.get(url);
        return response.data.hourly;
    } catch (err) {
        console.error("Error fetching weather data:", err.message);
        return null;
    }
}

async function getRivernetData(startSec, endSec) {
    const rawPath = `api/reports/river-level/chart/minute/${startSec}/${endSec}?keys=${RIVERNET_DEVICE_KEY}&last24HoursData=1&isPublic=1`;
    const url = `https://api.rivernet.lk/cache-api.php?path=${encodeURIComponent(rawPath)}`;
    try {
        const res = await axios.get(url);
        if (res.data && res.data.results && Array.isArray(res.data.results.series) && res.data.results.series.length > 0) {
             return res.data.results.series[0].data || [];
        }
        return [];
    } catch (err) {
        console.error("Rivernet API Error:", err.message);
        return [];
    }
}

async function main() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    const startDate = yesterday.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    console.log("Fetching weather...");
    const weatherData = await getWeatherData(startDate, endDate);
    console.log("Weather array length:", weatherData ? weatherData.time.length : 0);
    
    const startSec = Math.floor(yesterday.getTime() / 1000);
    const endSec = Math.floor(now.getTime() / 1000);
    console.log(`Fetching Rivernet from ${startSec} to ${endSec}...`);
    const riverData = await getRivernetData(startSec, endSec);
    console.log("River data array length:", riverData.length);
    
    if(weatherData && riverData.length > 0) {
        const filteredRiverData = riverData.filter(d => {
             const t = new Date(d.x);
             return t.getMinutes() % 5 === 0;
        });
        console.log("Filtered river data length:", filteredRiverData.length);
        
        let matches = 0;
        for (const riverRow of filteredRiverData) {
             const dataTime = new Date(riverRow.x);
             const hourString = dataTime.toISOString().substring(0, 13) + ":00";
             const weatherIndex = weatherData.time.indexOf(hourString);
             if (weatherIndex !== -1) matches++;
        }
        console.log("Weather matches:", matches);
    }
}

main();
