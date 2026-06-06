const { getRiversByBasin, getAllRivers: getAllArcgisRivers, getRiversByLocation: getArcgisRiversByLocation } = require('../services/arcgisService');
const { fetchRegionRiverData, getRiversByLocation: getRivernetRiversByLocation, getAllDevices: getAllRivernetDevices, getRiverChart } = require('../services/rivernetService');

const normalize = (str) => {
    if (!str) return "";
    return str.trim().toLowerCase().replace(/[^a-z0-9]/g, "").replace(/w/g, "v").replace(/th/g, "t");
};

const mergeRivers = (rivernetData, arcgisData) => {
    const data = [...(rivernetData || [])];
    const existingNames = new Set(data.map(r => normalize(r.name)));
    for (const arcRiver of (arcgisData || [])) {
        if (arcRiver.id === "arcgis_rathnapura") continue; // Removed as requested
        const normName = normalize(arcRiver.name);
        if (!existingNames.has(normName)) {
            data.push(arcRiver);
        }
    }
    return data;
};

const enrichRivers = async (rivers) => {
    if (!rivers || rivers.length === 0) return rivers;
    
    await Promise.all(
        rivers.map(async (river) => {
            if (river.deviceKey) {
                try {
                    const chartData = await getRiverChart(river.deviceKey);
                    river.historicalData = chartData?.results?.series?.[0]?.data || [];
                    
                    if (river.historicalData.length > 0) {
                        const lastReading = river.historicalData[river.historicalData.length - 1].y;
                        river.currentLevel = lastReading;
                        
                        const alert = river.levels?.alert;
                        const minor = river.levels?.minor;
                        const major = river.levels?.major;
                        const critical = river.levels?.critical;
                        
                        if (critical !== null && critical !== undefined && lastReading >= critical) {
                            river.status = "CRITICAL FLOOD";
                        } else if (major !== null && major !== undefined && lastReading >= major) {
                            river.status = "MAJOR FLOOD";
                        } else if (minor !== null && minor !== undefined && lastReading >= minor) {
                            river.status = "MINOR FLOOD";
                        } else if (alert !== null && alert !== undefined && lastReading >= alert) {
                            river.status = "ALERT";
                        } else {
                            river.status = "SAFE";
                        }
                    } else {
                        river.status = "UNKNOWN";
                    }
                } catch (chartErr) {
                    console.error(`Failed to fetch chart for river ${river.name}:`, chartErr.message);
                    river.historicalData = [];
                    river.status = "UNKNOWN";
                }
            } else {
                if (!river.historicalData) {
                    river.historicalData = [];
                }
                if (river.status === undefined || river.status === null) {
                    river.status = "UNKNOWN";
                }
            }
        })
    );

    const isFullRequest = req && req.query && req.query.full === 'true';
    if (isFullRequest) {
        return rivers;
    }

    // AI optimized structure without heavy historicalData array
    return rivers.map(r => {
        const cleanRiver = { ...r };
        delete cleanRiver.historicalData;
        return cleanRiver;
    });
};

exports.getAllRivers = async (req, res) => {
    try {
        const { city } = req.query;
        let rivernetData = await getAllRivernetDevices();
        let arcgisData = await getAllArcgisRivers();

        let data = mergeRivers(rivernetData, arcgisData);

        if (city && data) {
            data = data.filter(river => 
                river.city && river.city.toLowerCase() === city.toLowerCase()
            );
        }

        const enrichedData = await enrichRivers(data);

        res.status(200).json({
            success: true,
            data: enrichedData
        });
    } catch (error) {
        console.error('Error fetching all river data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch all river data'
        });
    }
};

    exports.searchRivers = async (req, res) => {
        try {
            const { q } = req.query;
            if (!q || q.length < 2) return res.json({ success: true, data: [] });
            
            let rivernetData = await getAllRivernetDevices();
            let arcgisData = await getAllArcgisRivers();
            let data = mergeRivers(rivernetData, arcgisData);
            
            const normQ = normalize(q);
            
            const unique = [];
            const seen = new Set();
            
            for (const r of data) {
                // Determine the actual river name
                // For ArcGIS, basin contains the river name. For Rivernet, originalName contains the river name.
                let riverName = r.basin ? r.basin : r.originalName;
                if (!riverName) riverName = r.name;
                
                const normRiverName = normalize(riverName);
                
                // Only match against the river name
                if (normRiverName.includes(normQ)) {
                    if (!seen.has(normRiverName)) {
                        seen.add(normRiverName);
                        // Return the river name as the search suggestion
                        unique.push({ name: riverName, city: '', country: 'Sri Lanka', isRiver: true });
                    }
                }
            }
            
            res.status(200).json({
                success: true,
                data: unique.slice(0, 5)
            });
    } catch (error) {
        console.error('Error searching rivers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search rivers'
        });
    }
};

exports.getAreaRivers = async (req, res) => {
    try {
        const { area } = req.params;

        let rivernetData = [];
        try {
            const fetched = await fetchRegionRiverData(area);
            if (fetched && fetched.length > 0) { rivernetData = fetched; }
            else { throw new Error("Empty region"); }
        } catch (err) {
            rivernetData = await getRivernetRiversByLocation(area);
        }

        let arcgisData = [];
        try {
            const fetched = await getRiversByBasin(area);
            if (fetched && fetched.length > 0) { arcgisData = fetched; }
            else { throw new Error("Empty basin"); }
        } catch (err) {
            try { arcgisData = await getArcgisRiversByLocation(area); } catch(e){}
        }

        let data = mergeRivers(rivernetData, arcgisData);

        // Data is already filtered by respective services

        const enrichedData = await enrichRivers(data);

        res.status(200).json({
            success: true,
            data: enrichedData
        });
    } catch (error) {
        console.error('Error fetching area river data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch area river data'
        });
    }
};

exports.getRegionRivers = async (req, res) => {
    try {
        const { region } = req.params;
        const { city } = req.query;

        // Rivernet fetch
        let rivernetData = [];
        let rivernetUsedFallback = false;
        try {
            const fetched = await fetchRegionRiverData(region);
            if (fetched && fetched.length > 0) {
                rivernetData = fetched;
            } else {
                throw new Error("Empty region data");
            }
        } catch (err) {
            console.log(`Region fetch failed for ${region}, falling back to location search.`);
            rivernetUsedFallback = true;
        }
        if (rivernetUsedFallback) {
            rivernetData = await getRivernetRiversByLocation(region);
        }

        // ArcGIS fetch
        let arcgisData = [];
        let arcgisUsedFallback = false;
        try {
            const fetched = await getRiversByBasin(region);
            if (fetched && fetched.length > 0) {
                arcgisData = fetched;
            } else {
                throw new Error("Empty basin data");
            }
        } catch (err) {
            console.log(`ArcGIS fetch failed for basin ${region}`);
            arcgisUsedFallback = true;
        }
        if (arcgisUsedFallback) {
            try {
                arcgisData = await getArcgisRiversByLocation(region);
            } catch (err) {
                console.log(`ArcGIS fallback location fetch failed for ${region}`);
            }
        }

        let data = mergeRivers(rivernetData, arcgisData);

        if (city && data) {
            data = data.filter(river => 
                river.city && river.city.toLowerCase() === city.toLowerCase()
            );
        }

        const enrichedData = await enrichRivers(data);

        res.status(200).json({
            success: true,
            data: enrichedData
        });
    } catch (error) {
        console.error('Error fetching river data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch river data'
        });
    }
};



exports.getRiverChartData = async (req, res) => {
    try {
        const { deviceKey } = req.params;
        if (!deviceKey) {
            return res.status(400).json({
                success: false,
                message: 'Device key is required'
            });
        }
        const data = await getRiverChart(deviceKey);
        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching river chart data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch river chart data'
        });
    }
};
