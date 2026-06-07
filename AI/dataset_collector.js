const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');

// ==== CONFIGURATION ====
// Me details oya Google Cloud Platform eken Service Account ekak hadala ganna oni.
const GOOGLE_SERVICE_ACCOUNT_EMAIL = 'your-service-account-email@project.iam.gserviceaccount.com';
const GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n';
const SPREADSHEET_ID = 'your-google-spreadsheet-id-here';

// Ratnapura Coordinates
const LAT = 6.6828;
const LON = 80.3992;

// Google Auth Initialize kireema
const serviceAccountAuth = new JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

// Open-Meteo API eken weather data ganna function eka
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

// River level eka ganna function eka
async function getRiverLevel() {
    // IMPORTANT: Sri Lanka Irrigation Dept ekata direct public JSON API ekak nathi nisa,
    // oya real data gannawa nam eyalage website eken scrape karanna hari wena API ekak pawichi karanna hari wenawa.
    // Danata meka random wathura mattamak (meters) return karanawa.
    return (Math.random() * (5.0 - 2.0) + 2.0).toFixed(2);
}

// Google Sheet eka setup kireema
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

// Kalin peya 24 data save kireema
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

// Idiri peya 24 thula current data save kireema
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
    console.log("Starting Kalu Ganga Dataset Collector Script...");
    const sheet = await initSheet();

    // 1. Iye data tika google sheet ekata danawa
    await collectPast24Hours(sheet);

    // 2. Dan indan idiri peya 24 wenakal seth interval ekak dala winaadi 5n 5ta data update karanawa
    const intervalTime = 5 * 60 * 1000; // Winaadi 5kata sarayak (5 mins)
    
    // First run eka danma karanawa
    await collectCurrentData(sheet);

    const intervalId = setInterval(async () => {
        await collectCurrentData(sheet);
    }, intervalTime);

    // 3. Peya 24kata passe script eka automatic stop wenawa
    const runTime = 24 * 60 * 60 * 1000; // 24 Hours in milliseconds
    setTimeout(() => {
        clearInterval(intervalId);
        console.log("24 Hours completed. Script is terminating.");
        process.exit(0);
    }, runTime);

    console.log("Script will now run continuously for the next 24 hours. Don't close the terminal.");
}

main();
