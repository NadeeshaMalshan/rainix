const https = require('https');
const now = Math.floor(Date.now()/1000);
const past = now - 3600;
const rawPath = `api/reports/river-level/chart/minute/${past}/${now}?keys=2bq292rf6uz&last24HoursData=1&isPublic=1`;
https.get('https://api.rivernet.lk/cache-api.php?path=' + encodeURIComponent(rawPath), res => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json.results, null, 2));
    });
});
