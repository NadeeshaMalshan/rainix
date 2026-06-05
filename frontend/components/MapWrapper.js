import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the WeatherMap component, disabling Server-Side Rendering
const DynamicMap = dynamic(() => import('./WeatherMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-[1600px] w-[95vw] mx-auto mt-6 px-2 md:px-6 mb-12">
      <div className="deep-frosted-pill animate-pulse rounded-3xl p-6 shadow-glass relative flex flex-col h-[400px] md:h-[500px] items-center justify-center">
        <span className="text-white/50 tracking-wider">Loading Live Radar...</span>
      </div>
    </div>
  )
});

const MapWrapper = ({ coordinates, radarUrl }) => {
  return <DynamicMap coordinates={coordinates} radarUrl={radarUrl} />;
};

export default MapWrapper;
