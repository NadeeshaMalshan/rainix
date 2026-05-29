const axios = require("axios");
const cityRiverMap = require("../data/cityRiverMap.json");

// ========================================
// Get Rivers By Basin from ArcGIS
// ========================================

exports.getRiversByBasin = async (basinName) => {
  try {
    // Basic mapping for basin names if needed (e.g. "kalu-ganga" -> "Kalu Ganga")
    // If the input doesn't have "ganga", maybe we append it, or we just trust the input if it's formatted well.
    // For safety, let's normalize the basin name to title case and replace hyphens with spaces.
    let formattedBasin = basinName.replace(/-/g, " ");
    formattedBasin = formattedBasin.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

    const url = `https://services3.arcgis.com/J7ZFXmR8rSmQ3FGf/arcgis/rest/services/gauges_2_view/FeatureServer/0/query?f=json&where=basin='%5Bbasin%5D'&outFields=gauge,water_level,rain_fall,CreationDate,alertpull,minorpull,majorpull&orderByFields=CreationDate+DESC&returnGeometry=false`.replace('%5Bbasin%5D', encodeURIComponent(formattedBasin));

    const response = await axios.get(url);
    const features = response.data?.features;

    if (!features || !Array.isArray(features)) {
      return [];
    }

    // Since we order by CreationDate DESC, the first occurrence of a gauge is the most recent.
    // Let's keep only the most recent data per gauge.
    const uniqueGauges = new Map();

    for (const feature of features) {
      const attrs = feature.attributes;
      if (!attrs || !attrs.gauge) continue;

      if (!uniqueGauges.has(attrs.gauge)) {
        uniqueGauges.set(attrs.gauge, attrs);
      }
    }

    const transformed = Array.from(uniqueGauges.values()).map(device => {
      const currentLevel = device.water_level;
      
      const alert = device.alertpull;
      const minor = device.minorpull;
      const major = device.majorpull;
      const critical = null; // Assuming no critical level in this specific ArcGIS schema

      let status = "SAFE";
      if (currentLevel !== null && currentLevel !== undefined) {
          if (major !== null && major !== undefined && currentLevel >= major) {
              status = "MAJOR FLOOD";
          } else if (minor !== null && minor !== undefined && currentLevel >= minor) {
              status = "MINOR FLOOD";
          } else if (alert !== null && alert !== undefined && currentLevel >= alert) {
              status = "ALERT";
          }
      } else {
          status = "UNKNOWN";
      }

      return {
        id: `arcgis_${device.gauge.toLowerCase().replace(/\\s+/g, '_')}`,
        deviceKey: null, // No rivernet device key
        name: device.gauge,
        area: device.gauge,
        city: device.gauge,
        type: "ARCGIS",
        status: status,
        maxLevel: null,
        alertLevels: [
            { name: "alert", value: alert },
            { name: "minor", value: minor },
            { name: "major", value: major }
        ],
        levels: {
          alert: alert || null,
          minor: minor || null,
          major: major || null,
          critical: critical
        },
        currentLevel: currentLevel,
        rainfall: device.rain_fall !== undefined ? device.rain_fall : null,
        source: "ArcGIS",
        historicalData: []
      };
    });

    return transformed;
  } catch (error) {
    console.log("ArcGIS Service Error:", error.message);
    throw new Error("Failed to fetch ArcGIS river data");
  }
};

// ========================================
// Get All Rivers (for location matching)
// ========================================
exports.getAllRivers = async () => {
  try {
    const url = `https://services3.arcgis.com/J7ZFXmR8rSmQ3FGf/arcgis/rest/services/gauges_2_view/FeatureServer/0/query?f=json&where=1=1&outFields=basin,gauge,water_level,rain_fall,CreationDate,alertpull,minorpull,majorpull&orderByFields=CreationDate+DESC&returnGeometry=false`;

    const response = await axios.get(url);
    const features = response.data?.features;

    if (!features || !Array.isArray(features)) {
      return [];
    }

    const uniqueGauges = new Map();
    for (const feature of features) {
      const attrs = feature.attributes;
      if (!attrs || !attrs.gauge) continue;
      if (!uniqueGauges.has(attrs.gauge)) {
        uniqueGauges.set(attrs.gauge, attrs);
      }
    }

    const transformed = Array.from(uniqueGauges.values()).map(device => {
      const currentLevel = device.water_level;
      const alert = device.alertpull;
      const minor = device.minorpull;
      const major = device.majorpull;
      let status = "SAFE";
      
      if (currentLevel !== null && currentLevel !== undefined) {
          if (major !== null && major !== undefined && currentLevel >= major) {
              status = "MAJOR FLOOD";
          } else if (minor !== null && minor !== undefined && currentLevel >= minor) {
              status = "MINOR FLOOD";
          } else if (alert !== null && alert !== undefined && currentLevel >= alert) {
              status = "ALERT";
          }
      } else {
          status = "UNKNOWN";
      }

      return {
        id: `arcgis_${device.gauge.toLowerCase().replace(/\\s+/g, '_')}`,
        deviceKey: null,
        name: device.gauge,
        basin: device.basin,
        area: device.gauge,
        city: device.gauge,
        type: "ARCGIS",
        status: status,
        maxLevel: null,
        alertLevels: [
            { name: "alert", value: alert },
            { name: "minor", value: minor },
            { name: "major", value: major }
        ],
        levels: {
          alert: alert || null,
          minor: minor || null,
          major: major || null,
          critical: null
        },
        currentLevel: currentLevel,
        rainfall: device.rain_fall !== undefined ? device.rain_fall : null,
        source: "ArcGIS",
        historicalData: []
      };
    });

    return transformed;
  } catch (error) {
    console.log("ArcGIS Service getAllRivers Error:", error.message);
    throw new Error("Failed to fetch all ArcGIS river data");
  }
};

// ========================================
// Get Rivers By Location
// ========================================
exports.getRiversByLocation = async (location) => {
    try {
        const rivers = await exports.getAllRivers();
        if (!location) return rivers;

        const normalize = (str) => {
            if (!str) return "";
            return str.trim().toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .replace(/w/g, "v")
                .replace(/th/g, "t"); // Normalize common misspellings (Rathnapura -> ratnapura)
        };

        const normSearch = normalize(location);
        const mappedBasins = cityRiverMap[normSearch] || [];
        const normalizedMappedBasins = mappedBasins.map(r => normalize(r));

        return rivers.filter(river => {
            if (river.city && normalize(river.city) === normSearch) return true;
            if (river.name && normalize(river.name) === normSearch) return true;
            if (river.name && normalize(river.name).includes(normSearch)) return true;
            
            // Match against mapped basins from cityRiverMap.json
            if (river.basin && normalizedMappedBasins.some(mappedBasin => normalize(river.basin).includes(mappedBasin))) {
                return true;
            }

            return false;
        });
    } catch (error) {
        console.log("Location Filter Error:", error.message);
        throw new Error("Failed to filter ArcGIS rivers by location");
    }
};

