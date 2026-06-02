import React, { useRef, useEffect, useState } from 'react';

const HourlyForecast = ({ hourlyData, sunrise, sunset, timeZone }) => {
  const scrollRefLeft = useRef(null);
  const scrollRefRight = useRef(null);
  const [points, setPoints] = useState([]);
  
  // Get next 24 hours (or what's available up to 24)
  const next24 = hourlyData ? hourlyData.slice(0, 24) : [];

  // Helper to format time
  const formatTime = (timeStr) => {
    const date = new Date(timeStr);
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:00 ${ampm}`;
  };

  const getWeatherIcon = (code) => {
    if (code === 0) return 'wb_sunny';
    if (code >= 1 && code <= 3) return 'partly_cloudy_day';
    if (code === 45 || code === 48) return 'filter_drama';
    if (code >= 51 && code <= 57) return 'rainy';
    if (code >= 61 && code <= 67) return 'rainy_light';
    if (code >= 71 && code <= 77) return 'ac_unit';
    if (code >= 80 && code <= 82) return 'rainy_heavy';
    if (code >= 85 && code <= 86) return 'weather_snowy';
    if (code >= 95) return 'thunderstorm';
    return 'cloud';
  };

  // Calculate SVG line points for temperature
  useEffect(() => {
    if (next24.length === 0) return;
    const minTemp = Math.min(...next24.map(h => h.temperature));
    const maxTemp = Math.max(...next24.map(h => h.temperature));
    const range = maxTemp - minTemp || 1;
    
    // SVG width: each hour is 100px wide
    const newPoints = next24.map((h, i) => {
      const x = i * 100 + 50;
      // y goes from 10 to 50 (40px height)
      const y = 50 - ((h.temperature - minTemp) / range) * 40;
      return { x, y, temp: h.temperature };
    });
    setPoints(newPoints);
  }, [next24]);

  if (!hourlyData || hourlyData.length === 0) return null;

  const parsedPrecip = next24.map(h => Number(h.precipitation) || 0);
  const actualMaxPrecip = Math.max(...parsedPrecip);
  const maxPrecip = actualMaxPrecip > 0 ? actualMaxPrecip : 1; // Avoid div by 0 if all are 0

  return (
    <div className="w-full max-w-[1600px] w-[95vw] mx-auto mt-6 px-2 md:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        
        {/* Left Side: 24 hrs weather */}
        <div className="deep-frosted-pill rounded-3xl p-4 md:p-6 shadow-glass relative overflow-hidden flex flex-col h-72">
          <h3 className="text-center font-medium text-sm md:text-base text-white/90 mb-4 tracking-wide">
            24-Hour Forecast
          </h3>
          <div className="relative flex-1 w-full overflow-x-auto hide-scrollbar" ref={scrollRefLeft}>
            <div className="flex flex-row items-stretch h-full min-w-max pb-2 relative" style={{ width: `${next24.length * 100}px` }}>
              
              {/* SVG Line for temperatures */}
              {points.length > 0 && (
                <svg className="absolute bottom-8 left-0 h-16 pointer-events-none z-0" style={{ width: `${next24.length * 100}px` }}>
                  <polyline
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.5)"
                    strokeWidth="2"
                    points={points.map(p => `${p.x},${p.y}`).join(' ')}
                  />
                  {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" />
                  ))}
                </svg>
              )}

              {next24.map((h, idx) => (
                <div key={idx} className="w-[100px] flex flex-col items-center h-full relative z-10 shrink-0">
                  <span className="text-[10px] md:text-xs text-white/70 mt-1 mb-1">{formatTime(h.time)}</span>
                  <span className="material-symbols-outlined text-2xl text-white my-1 drop-shadow-md">
                    {getWeatherIcon(h.weatherCode)}
                  </span>
                  
                  <span className="text-lg md:text-xl font-semibold text-white drop-shadow-md my-1 z-20">
                    {Math.round(h.temperature)}°
                  </span>

                  {/* Empty space for chart */}
                  <div className="flex-1 w-full min-h-[60px]"></div>

                  {/* Precipitation Probability at bottom */}
                  <div className="flex items-center justify-center gap-1 text-[10px] text-white/60 w-full mb-1 mt-auto absolute bottom-0">
                    <span className="material-symbols-outlined text-[10px] text-blue-300">water_drop</span>
                    {h.precipitationProbability}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: 24 hrs raining mm */}
        <div className="deep-frosted-pill rounded-3xl p-4 md:p-6 shadow-glass relative overflow-hidden flex flex-col h-72">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white/80 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-300">water_drop</span>
              Expected Rainfall
            </h3>
            <span className="text-[10px] text-white/60 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              Max: {maxPrecip.toFixed(1)} mm
            </span>
          </div>
          <div className="relative flex-1 w-full overflow-x-auto hide-scrollbar" ref={scrollRefRight}>
            <div className="flex flex-row items-end h-full min-w-max pb-6 relative" style={{ width: `${next24.length * 90}px` }}>
              
              {/* Horizontal grid lines for bar chart */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between pb-6 pt-8 z-0">
                <div className="border-t border-white/10 w-full"></div>
                <div className="border-t border-white/10 w-full"></div>
                <div className="border-t border-white/10 w-full"></div>
              </div>

              {next24.map((h, idx) => {
                const heightPercentage = (h.precipitation / maxPrecip) * 100;
                return (
                  <div key={idx} className="w-[90px] flex flex-col items-center justify-end h-full relative z-10 shrink-0 group">
                    <span className="text-[10px] md:text-xs text-white/70 absolute top-0">{formatTime(h.time)}</span>
                    
                    {/* Bar */}
                    <div className="w-8 md:w-10 flex items-end justify-center h-24 mb-2 relative">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500/80 to-cyan-300/80 rounded-t-sm shadow-[0_0_8px_rgba(56,189,248,0.4)] transition-all duration-300 group-hover:opacity-100 opacity-90"
                        style={{ height: `${Math.max(heightPercentage, 2)}%` }} // Ensure visible even for 0
                      >
                         {/* Water highlight effect at top of bar */}
                        <div className="w-full h-1 bg-white/40 rounded-t-sm"></div>
                      </div>
                    </div>
                    
                    {/* MM Value */}
                    <span className="text-[10px] md:text-xs text-white font-medium drop-shadow-md absolute -bottom-1">
                      {h.precipitation > 0 ? h.precipitation.toFixed(2) : '0.00'}
                    </span>
                  </div>
                )
              })}
              
              {/* mm label left side */}
              <div className="absolute bottom-0 left-0 text-[10px] text-white/60 font-medium">mm</div>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default HourlyForecast;
