const { getRiversByLocation } = require('./src/services/rivernetService');

(async () => {
    try {
        const data = await getRiversByLocation("kuruvita");
        console.log("Success! Data length:", data.length);
        console.log(data.slice(0, 2));
    } catch (err) {
        console.error("Error:", err);
    }
})();
