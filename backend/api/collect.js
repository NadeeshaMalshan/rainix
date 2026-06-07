const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const axios = require('axios');

// Vercel eke Environment Variables widihata me details danna
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
// Vercel eke private key eka daddi \n escape wena nisa replace karanawa
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const LAT = 6.6828;
const LON = 80.3992;

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

export default async function handler(req, res) {
    // Vercel Cron call eka authorize karanna oni nam (optional):
    // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return res.status(401).end('Unauthorized');
    // }

    try {
        const serviceAccountAuth = new JWT({
            email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: GOOGLE_PRIVATE_KEY,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
        await doc.loadInfo(); 
        
        let sheet = doc.sheetsByTitle['Kalu_Ganga_Data'];
        if (!sheet) {
            sheet = await doc.addSheet({ 
                headerValues: ['Timestamp', 'Temperature_C', 'Rainfall_mm', 'River_Level_m', 'Type'], 
                title: 'Kalu_Ganga_Data' 
            });
        }

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
                Type: 'Real-Time (Vercel Cron)'
            });
            
            return res.status(200).json({ success: true, message: "Data collected successfully via Vercel Cron" });
        } else {
            return res.status(500).json({ success: false, message: "Failed to fetch weather data" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
