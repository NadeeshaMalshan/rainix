import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import axios from 'axios';

// ==== CONFIGURATION ====
// Credentials env variables (GitHub Secrets walin enawa)
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Ratnapura Coordinates
const LAT = 6.6828;
const LON = 80.3992;

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

async function getWeatherData(dateStr) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=temperature_2m,precipitation&start_date=${dateStr}&end_date=${dateStr}`;
    try {
        const response = await axios.get(url);
        return response.data.hourly;
    } catch (err) {
        console.error("Error fetching weather data:", err.message);
        return null;
    }
}

async function getRiverLevel() {
    return (Math.random() * (5.0 - 2.0) + 2.0).toFixed(2);
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
    console.log("Fetching past 24 hours data...");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const weatherData = await getWeatherData(dateStr);
    
    if(weatherData) {
        const rows = [];
        for(let i=0; i<weatherData.time.length; i++) {
            const mockRiverLevel = await getRiverLevel(); 
            rows.push({
                Timestamp: weatherData.time[i],
                Temperature_C: weatherData.temperature_2m[i],
                Rainfall_mm: weatherData.precipitation[i],
                River_Level_m: mockRiverLevel,
                Type: 'Historical'
            });
        }
        await sheet.addRows(rows);
        console.log("Past 24 hours data saved to Google Sheets.");
    }
}

async function collectCurrentData(sheet) {
    console.log(`[${new Date().toISOString()}] Collecting current data...`);
    const today = new Date().toISOString().split('T')[0];
    const weatherData = await getWeatherData(today);
    
    if(weatherData) {
        const currentHour = new Date().getHours();
        const temp = weatherData.temperature_2m[currentHour];
        const rain = weatherData.precipitation[currentHour];
        const riverLvl = await getRiverLevel();

        await sheet.addRow({
            Timestamp: new Date().toISOString(),
            Temperature_C: temp,
            Rainfall_mm: rain,
            River_Level_m: riverLvl,
            Type: 'Real-Time'
        });
        console.log("Current data row added to Google Sheet.");
    }
}

async function main() {
    console.log("Starting Kalu Ganga Dataset Collector...");
    const sheet = await initSheet();

    // '--init' command line argument eka dunnoth iye data gannawa, nathnam dan welawe data gannawa
    if (process.argv.includes('--init')) {
        await collectPast24Hours(sheet);
    } else {
        await collectCurrentData(sheet);
    }
    
    console.log("Task completed successfully.");
}

main();
