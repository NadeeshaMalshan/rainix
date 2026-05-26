require('dotenv').config();

const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const express = require('express');
const cors = require('cors');
const riverRoutes = require('./routes/riverRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const cityRoutes = require('./routes/cityRoutes');
const regionRoutes = require("./routes/regionRoutes");
const radarRoutes = require("./routes/radarRoutes");

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(compression());
app.use("/api/rivers", riverRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/city", cityRoutes);
app.use("/api/regions", regionRoutes);
app.use("/api/radar", radarRoutes);
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Rainix API!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});