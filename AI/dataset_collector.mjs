import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import axios from 'axios';

// ==== CONFIGURATION ====
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const LAT = 6.6828;
const LON = 80.3992;
const RIVERNET_DEVICE_KEY = '2bq292rf6uz'; // Ratnapura, Kalu Ganga

if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !SPREADSHEET_ID) {
    console.error("Missing credentials in environment variables!");
    process.exit(1);
}

const serviceAccountAuth = new JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

function getSLTime(dateInput) {
    const d = new Date(dateInput);
    // Add 5.5 hours to UTC to get Sri Lanka time
    const slTime = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
    return slTime.toISOString().substring(0, 19) + '+05:30';
}

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
        if (res.data && res.data.results && res.data.results.chartData && res.data.results.chartData.length > 0) {
             return res.data.results.chartData[0].data; // array of {y, x, t}
        }
        return [];
    } catch (err) {
        console.error("Rivernet API Error:", err.message);
        return [];
    }
}

async function initSheet() {
    await doc.loadInfo(); 
    let sheet = doc.sheetsByTitle['Kalu_Ganga_Data'];
    if (!sheet) {
        sheet = await doc.addSheet({ 
            headerValues: ['Timestamp', 'Temperature_C', 'Rainfall_mm', 'River_Level_m', 'Type'], 
            title: 'Kalu_Ganga_Data' 
        });
    }
    return sheet;
}

async function collectPast24Hours(sheet) {
    console.log("Fetching exact past 24 hours REAL data from Rivernet...");
    const now = new Date();
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    const startDate = yesterday.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    const weatherData = await getWeatherData(startDate, endDate);
    
    const startSec = Math.floor(yesterday.getTime() / 1000);
    const endSec = Math.floor(now.getTime() / 1000);
    const riverData = await getRivernetData(startSec, endSec);
    
    if(weatherData && riverData.length > 0) {
        const rows = [];
        
        // Filter rivernet minute-by-minute data to only keep every 5th minute
        const filteredRiverData = riverData.filter(d => {
             const t = new Date(d.x);
             return t.getMinutes() % 5 === 0;
        });

        for (const riverRow of filteredRiverData) {
             const dataTime = new Date(riverRow.x);
             
             // Find matching hourly weather (UTC time string match e.g. "2026-06-06T12:00")
             const hourString = dataTime.toISOString().substring(0, 13) + ":00";
             const weatherIndex = weatherData.time.indexOf(hourString);
             
             let temp = null;
             let rain = null;
             if (weatherIndex !== -1) {
                 temp = weatherData.temperature_2m[weatherIndex];
                 rain = weatherData.precipitation[weatherIndex];
             }
             
             rows.push({
                 Timestamp: getSLTime(dataTime),
                 Temperature_C: temp,
                 Rainfall_mm: rain,
                 River_Level_m: riverRow.y,
                 Type: 'Historical'
             });
        }
        
        await sheet.addRows(rows);
        console.log(`Saved ${rows.length} rows of real data to Google Sheets (5-minute intervals).`);
    } else {
        console.error("Failed to fetch data from APIs.");
    }
}

async function collectCurrentData(sheet) {
    console.log(`[${new Date().toISOString()}] Collecting current REAL data...`);
    const today = new Date().toISOString().split('T')[0];
    const weatherData = await getWeatherData(today, today);
    
    const nowSec = Math.floor(Date.now() / 1000);
    const pastSec = nowSec - 3600; // Look back 1 hour to get the latest point safely
    const riverData = await getRivernetData(pastSec, nowSec);
    
    if(weatherData && riverData && riverData.length > 0) {
        // Get the very last recorded river level
        const latestRiver = riverData[riverData.length - 1].y;

        const currentUtcStr = new Date().toISOString().substring(0, 13) + ":00";
        const wIndex = weatherData.time.indexOf(currentUtcStr);
        
        const temp = wIndex !== -1 ? weatherData.temperature_2m[wIndex] : null;
        const rain = wIndex !== -1 ? weatherData.precipitation[wIndex] : null;

        await sheet.addRow({
            Timestamp: getSLTime(new Date()),
            Temperature_C: temp,
            Rainfall_mm: rain,
            River_Level_m: latestRiver,
            Type: 'Real-Time'
        });
        console.log(`[${getSLTime(new Date())}] Current REAL data row added to Google Sheet.`);
    } else {
        console.error("Failed to fetch current real data.");
    }
}

async function main() {
    console.log("Starting Kalu Ganga Dataset Collector...");
    const sheet = await initSheet();

    if (process.argv.includes('--init')) {
        await collectPast24Hours(sheet);
    } else {
        await collectCurrentData(sheet);
    }
    
    console.log("Task completed successfully.");
}

main();
