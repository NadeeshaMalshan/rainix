import axios from 'axios';

async function test30Days() {
    const nowSec = Math.floor(Date.now() / 1000);
    // 30 days ago = 30 * 24 * 60 * 60 = 2592000
    const startSec = nowSec - (5 * 24 * 60 * 60); // 5 days ago
    
    // First try with last24HoursData=1 but startSec 5 days ago
    const rawPath = `api/reports/river-level/chart/minute/${startSec}/${nowSec}?keys=2bq292rf6uz&last24HoursData=1&isPublic=1`;
    const url = `https://api.rivernet.lk/cache-api.php?path=${encodeURIComponent(rawPath)}`;
    
    try {
        console.log("Fetching URL:", url);
        const res = await axios.get(url);
        if (res.data && res.data.results && Array.isArray(res.data.results.series)) {
            const data = res.data.results.series[0]?.data || [];
            console.log("Rivernet array length (30 days test):", data.length);
            if (data.length > 0) {
                console.log("First record:", data[0].t);
                console.log("Last record:", data[data.length - 1].t);
            }
        } else {
            console.log("Unexpected response format:", res.data);
        }
    } catch(e) {
        console.error("Error:", e.message);
    }
}
test30Days();
