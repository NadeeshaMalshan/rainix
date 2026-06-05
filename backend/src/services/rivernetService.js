const axios = require("axios");

const {
  parseRiverLocation
} = require("../utils/parseRiverLocation");

const cityRiverMap = require("../data/cityRiverMap.json");
const riverCoordinates = require("../data/riverCoordinates.json");


// ========================================
// Get All Rivers By Region
// ========================================

exports.getRegionDevices = async (region) => {

  try {

    const url =
      `https://api.rivernet.lk/cache-api.php?path=api/overview/region-devices?region=${region}`;
   
    const response = await axios.get(url);

    const rivers =
      response.data?.results?.basinRiverDevices?.[region];

    if (!rivers) {
      return [];
    }

    const transformed = rivers.map(
    device => {

    const parsed =
      parseRiverLocation(
        device.location || ""
      );

    let riverName = parsed.river;
    if (riverName === "Kalu Ganga" && parsed.city === "Ratnapura") {
      riverName = "Ratnapura";
    }

    return {

      id: device.unitId,

      deviceKey: device.deviceKey,

      name: riverName,
      
      originalName: parsed.river,

      area: parsed.city,

      city: parsed.city,
      
      lat: riverCoordinates[device.unitId]?.lat || null,
      
      lon: riverCoordinates[device.unitId]?.lon || null,

      type: device.type,

      status: "UNKNOWN",

      maxLevel: device.maxLevel,

      alertLevels: device.alertLevels || [],

      levels: {

        alert:
          device.alertLevels?.find(
            l => l.name === "alert"
          )?.value || null,

        minor:
          device.alertLevels?.find(
            l => l.name === "minor"
          )?.value || null,

        major:
          device.alertLevels?.find(
            l => l.name === "major"
          )?.value || null,

        critical:
          device.alertLevels?.find(
            l => l.name === "critical"
          )?.value || null
      }

    };

});

    return transformed;

  } catch (error) {

    console.log("Rivernet Service Error:", error.message);

    throw new Error("Failed to fetch river data");
  }
};

exports.fetchRegionRiverData = exports.getRegionDevices;

// ========================================
// Get All River Devices
// ========================================

exports.getAllDevices = async () => {
  try {
    const url = "https://api.rivernet.lk/cache-api.php?path=api/overview/region-devices";
    const response = await axios.get(url);
    const basinRiverDevices = response.data?.results?.basinRiverDevices;

    if (!basinRiverDevices) {
      return [];
    }

    const allTransformed = [];
    for (const region in basinRiverDevices) {
      const devices = basinRiverDevices[region];
      if (Array.isArray(devices)) {
        devices.forEach(device => {
          const parsed = parseRiverLocation(device.location || "");
          
          let riverName = parsed.river;
          if (riverName === "Kalu Ganga" && parsed.city === "Ratnapura") {
            riverName = "Ratnapura";
          }

          allTransformed.push({
            id: device.unitId,
            deviceKey: device.deviceKey,
            name: riverName,
            originalName: parsed.river,
            area: parsed.city,
            city: parsed.city,
            lat: riverCoordinates[device.unitId]?.lat || null,
            lon: riverCoordinates[device.unitId]?.lon || null,
            type: device.type,
            status: "UNKNOWN",
            maxLevel: device.maxLevel,
            alertLevels: device.alertLevels || [],
            levels: {
              alert: device.alertLevels?.find(l => l.name === "alert")?.value || null,
              minor: device.alertLevels?.find(l => l.name === "minor")?.value || null,
              major: device.alertLevels?.find(l => l.name === "major")?.value || null,
              critical: device.alertLevels?.find(l => l.name === "critical")?.value || null
            }
          });
        });
      }
    }
    return allTransformed;
  } catch (error) {
    console.log("Rivernet Service Error (All Devices):", error.message);
    throw new Error("Failed to fetch all river data");
  }
};

// ========================================
// Get Rivers By Location
// ========================================

exports.getRiversByLocation = async (
  regionOrLocation,
  location
) => {

  try {
    const searchLocation = location || regionOrLocation;

    let rivers;
    if (location && regionOrLocation) {
      rivers = await exports.getRegionDevices(regionOrLocation);
    } else {
      rivers = await exports.getAllDevices();
    }

    const normalize = (str) => {
      if (!str) return "";
      return str
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .replace(/w/g, "v")
        .replace(/th/g, "t");
    };

    const normSearch = normalize(searchLocation);
    const mappedRivers = cityRiverMap[normSearch] || [];
    const normalizedMappedRivers = mappedRivers.map(r => normalize(r));

    const filtered = rivers.filter(
      river => {
        if (!searchLocation) {
          return false;
        }

        // 1. Direct city match (normalized)
        if (river.city && normalize(river.city) === normSearch) {
          return true;
        }

        // 2. Direct river name match (exact, normalized)
        if (river.name && normalize(river.name) === normSearch) {
          return true;
        }

        // 3. Direct river name match (contains, normalized)
        if (river.name && normalize(river.name).includes(normSearch)) {
          return true;
        }

        // 4. Mapped river name match (normalized)
        if (river.name && normalizedMappedRivers.some(mappedName => normalize(river.name).includes(mappedName))) {
          return true;
        }

        // 5. Original name match
        if (river.originalName && normalize(river.originalName).includes(normSearch)) {
          return true;
        }

        return false;
      }
    );

    return filtered;

  } catch (error) {

    console.log(
      "Location Filter Error:",
      error.message
    );

    throw new Error(
      "Failed to filter rivers by location"
    );
  }
};


// ========================================
// Get River Chart Data
// ========================================

exports.getRiverChart = async (
  deviceKey
) => {

  try {

    const nowSec = Math.floor(Date.now() / 1000);
    const last24HoursSec = nowSec - (24 * 60 * 60);

    const rawPath = `api/reports/river-level/chart/minute/${last24HoursSec}/${nowSec}?keys=${deviceKey}&last24HoursData=1&isPublic=1`;
    const url = `https://api.rivernet.lk/cache-api.php?path=${encodeURIComponent(rawPath)}`;

    const response = await axios.get(url);

    return response.data;

  } catch (error) {

    console.log(
      "Chart Fetch Error:",
      error.message
    );

    throw new Error(
      "Failed to fetch river chart data"
    );
  }
};
