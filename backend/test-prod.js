const https = require('https');
const url = "https://rainix-nadeeshas-projects-cb1ec3ce.vercel.app/api/city/Kandy?full=true";

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(res.statusCode); console.log(data.substring(0, 500)); });
}).on('error', (err) => {
  console.error("Error:", err.message);
});
