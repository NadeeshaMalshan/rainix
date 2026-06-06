import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker } from 'react-leaflet';

// Component to dynamically update map center when coordinates change
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

const WeatherMap = ({ coordinates, radarUrl }) => {

  if (!coordinates) return null;

  const { latitude, longitude } = coordinates;
  const center = [latitude, longitude];

  return (
    <div className="w-full max-w-[1600px] w-[95vw] mx-auto mt-6 px-2 md:px-6 mb-12">
      <div className="deep-frosted-pill animate-fade-in-up rounded-3xl p-6 shadow-glass relative flex flex-col h-[400px] md:h-[500px] overflow-hidden" style={{ animationDelay: '0.7s' }}>
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div className="flex items-center gap-3">
               <h3 className="text-white font-semibold text-lg md:text-xl tracking-wide">Live Weather Radar</h3>
               <span className="text-xs text-white/50 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">OpenWeatherMap</span>
            </div>
         </div>
         <div className="w-full h-full rounded-2xl overflow-hidden relative shadow-inner">
            <MapContainer center={center} zoom={7} maxZoom={20} scrollWheelZoom={false} className="w-full h-full z-0 relative">
              <ChangeView center={center} zoom={7} />
              
              {/* Light themed base map */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={20}
              />
              
              {/* OpenWeatherMap Stacked Overlay */}
              {radarUrl && (
                <>
                  <TileLayer
                    url={radarUrl.replace('{layer}', 'temp_new') + '&palette=-65:821692;-55:821692;-45:821692;-40:821692;-30:8257db;-20:208cec;-10:20c4e8;0:23dddd;10:00ff00;20:ff8800;25:ff4400;30:fc8014'}
                    opacity={0.35}
                    maxZoom={20}
                    maxNativeZoom={6}
                  />
                  <TileLayer
                    url={radarUrl.replace('{layer}', 'clouds_new')}
                    opacity={0.6}
                    maxZoom={20}
                    maxNativeZoom={6}
                  />
                  <TileLayer
                    url={radarUrl.replace('{layer}', 'wind_new')}
                    opacity={0.5}
                    maxZoom={20}
                    maxNativeZoom={6}
                  />
                  <TileLayer
                    key="precip-fix-5"
                    attribution='&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
                    url={radarUrl.replace('{layer}', 'precipitation_new')}
                    opacity={0.9}
                    maxZoom={20}
                    maxNativeZoom={5}
                  />
                </>
              )}
              
              {/* Highlight Selected Location */}
              <CircleMarker 
                center={center} 
                pathOptions={{ color: '#000000', fillColor: '#000000', fillOpacity: 1, weight: 2 }} 
                radius={5} 
              />
            </MapContainer>
         </div>
      </div>
    </div>
  );
};

export default WeatherMap;
