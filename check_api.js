const fs = require('fs');
let fileContent = fs.readFileSync('test_api_res.json', 'utf8');
if (fileContent.charCodeAt(0) === 0xFEFF) {
  fileContent = fileContent.slice(1);
}
const data = JSON.parse(fileContent);
console.log('Rivers count:', data.data.rivers.length);
data.data.rivers.forEach((river, idx) => {
  console.log(`River [${idx}]:`, river.name);
  console.log('  Max Level:', river.maxLevel);
  console.log('  Historical Data Length:', river.historicalData ? river.historicalData.length : 'undefined');
  if (river.historicalData && river.historicalData.length > 0) {
    console.log('  Last 2 items:');
    console.log(river.historicalData.slice(-2));
  }
});
