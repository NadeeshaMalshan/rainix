import axios from 'axios';

async function main() {
    const nowSec = Math.floor(Date.now() / 1000);
    const pastSec = nowSec - 3600;
    const rawPath = `api/reports/river-level/chart/minute/${pastSec}/${nowSec}?keys=2bq292rf6uz&last24HoursData=1&isPublic=1`;
    const url = `https://api.rivernet.lk/cache-api.php?path=${encodeURIComponent(rawPath)}`;
    
    console.log("Current UTC Time:", new Date().toISOString());
    console.log("Current SLT Time:", new Date(Date.now() + 5.5 * 3600000).toISOString());
    
    try {
        const res = await axios.get(url);
        const data = res.data.results.series[0].data;
        console.log("Rivernet array length:", data.length);
        if (data.length > 0) {
            const last = data[data.length - 1];
            console.log("Last record raw:", last);
            console.log("Last record x as UTC Date:", new Date(last.x).toISOString());
            console.log("Last record x as SLT Date:", new Date(last.x + 5.5 * 3600000).toISOString());
        }
    } catch(e) {
        console.error(e.message);
    }
}
main();
