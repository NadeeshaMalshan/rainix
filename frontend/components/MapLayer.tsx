import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet's default icon issue in Next.js/React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icon for the active station
const activeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom Icon for standard stations
const standardIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to center the map when active station changes
function MapController({ activeCenter }: { activeCenter: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (activeCenter) {
      map.flyTo(activeCenter, 11, {
        duration: 1.5
      });
    }
  }, [activeCenter, map]);
  
  return null;
}

interface Station {
  name: string;
  lat: number | null;
  lon: number | null;
  status?: string;
  currentLevel?: number | string;
}

interface MapLayerProps {
  stations: Station[];
  activeStationIdx: number;
}

export default function MapLayer({ stations, activeStationIdx }: MapLayerProps) {
  // Filter out stations that don't have valid coordinates
  const validStations = stations.filter(s => s.lat !== null && s.lon !== null && s.lat !== undefined && s.lon !== undefined);
  
  // Default center (Sri Lanka approximate center)
  let initialCenter: [number, number] = [7.8731, 80.7718];
  let zoom = 7;
  let activeCenter: [number, number] | null = null;

  if (validStations.length > 0) {
    const activeStation = stations[activeStationIdx];
    if (activeStation && activeStation.lat && activeStation.lon) {
      initialCenter = [activeStation.lat, activeStation.lon];
      activeCenter = [activeStation.lat, activeStation.lon];
      zoom = 11;
    } else {
      // Fallback to the first valid station if the active one has no coords
      initialCenter = [validStations[0].lat!, validStations[0].lon!];
      zoom = 10;
    }
  }

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-lg">
      <MapContainer 
        center={initialCenter} 
        zoom={zoom} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {activeCenter && <MapController activeCenter={activeCenter} />}
        
        {validStations.map((station, idx) => {
          const isActivelySelected = station.name === stations[activeStationIdx]?.name;
          
          return (
            <Marker 
              key={`${station.name}-${idx}`} 
              position={[station.lat!, station.lon!]}
              icon={isActivelySelected ? activeIcon : standardIcon}
            >
              <Popup className="dark-popup">
                <div className="text-gray-800 font-semibold mb-1">{station.name}</div>
                {station.currentLevel !== undefined && (
                  <div className="text-sm">
                    Level: <span className="font-bold">{station.currentLevel}m</span>
                  </div>
                )}
                {station.status && (
                  <div className={`text-xs mt-1 font-bold ${
                    station.status === 'MAJOR FLOOD' ? 'text-red-600' :
                    station.status === 'MINOR FLOOD' ? 'text-orange-500' :
                    station.status === 'ALERT' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {station.status}
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <style jsx global>{`
        .leaflet-container {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
}
