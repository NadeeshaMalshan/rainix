import React from 'react';

const WeatherMetricsRow = ({ weather }) => {
  if (!weather) return null;

  const { windSpeed, windDirection, pressure, aqi, pollen, uvIndex } = weather;

  // 1. Wind gauge properties
  // Rotate the arrow according to the wind direction.
  // 0 deg = North, 90 deg = East, 180 deg = South, 270 deg = West.
  const arrowRotation = windDirection || 0;

  // 2. Pressure gauge properties
  // Typical pressure range: 950 to 1050 mb.
  const minPressure = 950;
  const maxPressure = 1050;
  const pressureVal = pressure || 1012;
  const pressurePercent = Math.max(0, Math.min(100, ((pressureVal - minPressure) / (maxPressure - minPressure)) * 100));
  
  // Dasharray calculation for semi-circle (radius 45, circumference ~282.7)
  const pressureCircumference = Math.PI * 45;
  const pressureOffset = pressureCircumference - (pressurePercent / 100) * pressureCircumference;

  // 3. AQI properties
  const aqiVal = aqi || 0;
  let aqiLabel = 'Good';
  let aqiColor = 'bg-green-400';
  if (aqiVal > 50) { aqiLabel = 'Moderate'; aqiColor = 'bg-yellow-400'; }
  if (aqiVal > 100) { aqiLabel = 'Unhealthy'; aqiColor = 'bg-orange-500'; }
  if (aqiVal > 150) { aqiLabel = 'Very Unhealthy'; aqiColor = 'bg-red-500'; }
  
  const aqiPercent = Math.max(0, Math.min(100, (aqiVal / 300) * 100)); // Cap for bar width

  // Pollen helper
  const getPollenText = (val) => {
    if (val < 10) return 'None';
    if (val < 50) return 'Low';
    if (val < 100) return 'Medium';
    return 'High';
  };

  // 4. UV Index properties
  const uvVal = uvIndex || 0;
  let uvLabel = 'Low';
  let uvColor = 'text-green-400';
  if (uvVal >= 3) { uvLabel = 'Moderate'; uvColor = 'text-yellow-400'; }
  if (uvVal >= 6) { uvLabel = 'High'; uvColor = 'text-orange-500'; }
  if (uvVal >= 8) { uvLabel = 'Very High'; uvColor = 'text-red-500'; }
  if (uvVal >= 11) { uvLabel = 'Extreme'; uvColor = 'text-purple-500'; }

  const uvPercent = Math.max(0, Math.min(100, (uvVal / 11) * 100));
  const uvOffset = pressureCircumference - (uvPercent / 100) * pressureCircumference;

  return (
    <div className="w-full max-w-[1600px] w-[95vw] mx-auto mt-6 px-2 md:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* WIND */}
        <div className="deep-frosted-pill rounded-3xl p-4 md:p-6 shadow-glass relative flex flex-col h-64 md:h-72">
          <h3 className="text-white/80 font-medium flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-lg">air</span> Wind
          </h3>
          <div className="flex-1 flex items-center justify-center relative">
            {/* SVG Compass */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
              </svg>
              
              {/* Compass Labels */}
              <span className="absolute top-1 text-red-400 text-[10px] font-bold">N</span>
              <span className="absolute right-2 text-white/50 text-[10px] font-bold">E</span>
              <span className="absolute bottom-1 text-white/50 text-[10px] font-bold">S</span>
              <span className="absolute left-2 text-white/50 text-[10px] font-bold">W</span>
              <span className="absolute top-[18%] right-[18%] text-white/40 text-[8px]">NE</span>
              <span className="absolute bottom-[18%] right-[18%] text-white/40 text-[8px]">SE</span>
              <span className="absolute bottom-[18%] left-[18%] text-white/40 text-[8px]">SW</span>
              <span className="absolute top-[18%] left-[18%] text-white/40 text-[8px]">NW</span>

              {/* Arrow */}
              <svg 
                className="absolute inset-0 w-full h-full transition-transform duration-1000 ease-out" 
                viewBox="0 0 100 100"
                style={{ transform: `rotate(${arrowRotation}deg)` }}
              >
                {/* A white triangle pointer at the top edge */}
                <polygon points="50,1 55,10 45,10" fill="white" />
              </svg>

              {/* Center Value */}
              <div className="flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white drop-shadow-md">{Math.round(windSpeed || 0)}</span>
                <span className="text-sm font-medium text-white/80">km/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* PRESSURE */}
        <div className="deep-frosted-pill rounded-3xl p-4 md:p-6 shadow-glass relative flex flex-col h-64 md:h-72">
          <h3 className="text-white/80 font-medium flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-lg">compress</span> Pressure
          </h3>
          <div className="flex-1 flex items-center justify-center relative mt-4">
            <div className="relative w-48 h-24 overflow-hidden flex items-end justify-center">
              {/* Semi-circle Gauge */}
              <svg className="absolute top-0 w-full h-48 transform rotate-180" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" strokeDasharray={`${pressureCircumference} ${pressureCircumference}`} strokeDashoffset="0" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.6)" 
                  strokeWidth="6" 
                  strokeDasharray={`${pressureCircumference} ${pressureCircumference}`} 
                  strokeDashoffset={pressureOffset} 
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              
              {/* Center Text */}
              <div className="flex flex-col items-center justify-center mb-2">
                <span className="text-3xl font-bold text-white drop-shadow-md">{(pressureVal || 0).toFixed(1)}</span>
                <span className="text-sm font-medium text-white/60">mb</span>
              </div>
            </div>
          </div>
        </div>

        {/* AQI & POLLEN */}
        <div className="deep-frosted-pill rounded-3xl p-4 md:p-6 shadow-glass relative flex flex-col h-64 md:h-72">
          <h3 className="text-white/80 font-medium flex items-center gap-2 mb-2">
            AQI
          </h3>
          <div className="flex flex-col justify-between flex-1">
            <div className="mb-4">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-lg font-bold text-white">{aqiLabel}</span>
                <span className="text-sm text-white/60">({aqiVal})</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${aqiColor}`} style={{ width: `${aqiPercent}%` }}></div>
              </div>
            </div>

            {/* Pollen Row */}
            <div className="flex justify-between items-end pb-2">
              <div className="flex flex-col items-center gap-1">
                <span className="material-symbols-outlined text-white/40 text-3xl">eco</span>
                <span className="text-[10px] text-white/60">Tree</span>
                <span className="text-xs font-semibold text-white">{getPollenText(pollen?.tree || 0)}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="material-symbols-outlined text-white/40 text-3xl">grass</span>
                <span className="text-[10px] text-white/60">Grass</span>
                <span className="text-xs font-semibold text-white">{getPollenText(pollen?.grass || 0)}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="material-symbols-outlined text-white/40 text-3xl">local_florist</span>
                <span className="text-[10px] text-white/60">Ragweed</span>
                <span className="text-xs font-semibold text-white">{getPollenText(pollen?.ragweed || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* UV INDEX */}
        <div className="deep-frosted-pill rounded-3xl p-4 md:p-6 shadow-glass relative flex flex-col h-64 md:h-72">
          <h3 className="text-white/80 font-medium flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-lg">light_mode</span> UV Index
          </h3>
          <div className="flex-1 flex items-center justify-center relative mt-4">
            <div className="relative w-48 h-24 overflow-hidden flex items-end justify-center">
              {/* Semi-circle Gauge */}
              <svg className="absolute top-0 w-full h-48 transform rotate-180" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" strokeDasharray={`${pressureCircumference} ${pressureCircumference}`} strokeDashoffset="0" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  strokeDasharray={`${pressureCircumference} ${pressureCircumference}`} 
                  strokeDashoffset={uvOffset} 
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out ${uvColor}`}
                />
              </svg>
              
              {/* Center Text */}
              <div className="flex flex-col items-center justify-center mb-2">
                <span className="text-4xl font-bold text-white drop-shadow-md">{uvVal}</span>
                <span className={`text-sm font-semibold mt-1 ${uvColor}`}>{uvLabel}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WeatherMetricsRow;
