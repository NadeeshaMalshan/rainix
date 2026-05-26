const axios = require('axios');

(async () => {
    try {
        const url = "https://api.rivernet.lk/cache-api.php?path=api/overview/region-devices?region=ratnapura";
        const response = await axios.get(url);
        const ratnapuraDevices = response.data?.results?.basinRiverDevices?.ratnapura || [];
        
        const kaluGanga = ratnapuraDevices.find(d => d.unitId === 'I97');
        console.log(JSON.stringify(kaluGanga, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
})();
