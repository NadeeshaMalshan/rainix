import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

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
         <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold text-lg md:text-xl tracking-wide">Live Weather Radar</h3>
            <span className="text-xs text-white/50 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md">Powered by RainViewer</span>
         </div>
         <div className="w-full h-full rounded-2xl overflow-hidden relative shadow-inner">
            <MapContainer center={center} zoom={7} scrollWheelZoom={false} className="w-full h-full z-0 relative">
              <ChangeView center={center} zoom={7} />
              
              {/* Light themed base map */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Rainviewer Radar Overlay */}
              {radarUrl && (
                <TileLayer
                  attribution='<a href="https://rainviewer.com/">RainViewer</a>'
                  url={radarUrl.replace('/2/1_1.png', '/1/1_1.png')}
                  opacity={0.65}
                />
              )}
            </MapContainer>
         </div>
      </div>
    </div>
  );
};

export default WeatherMap;
