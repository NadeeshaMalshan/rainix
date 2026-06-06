import React, { useRef } from 'react';

const DailyForecast = ({ dailyData }) => {
  const scrollRef = useRef(null);

  if (!dailyData || dailyData.length === 0) return null;

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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full max-w-[1600px] w-[95vw] mx-auto mt-6 px-2 md:px-6">
      <div className="deep-frosted-pill animate-fade-in-up rounded-3xl p-6 shadow-glass flex flex-col min-w-0" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-white/80 font-medium flex items-center gap-2 mb-4">
         
          14-Day Forecast
        </h3>
        <div className="relative flex-1 w-full overflow-x-auto sleek-scrollbar" ref={scrollRef}>
          <div className="flex flex-row items-center h-full w-max pb-3">
            {dailyData.map((d, idx) => (
              <div key={idx} className="w-[calc((100vw-48px)/4)] md:w-[100px] flex flex-col items-center justify-between h-full relative z-10 shrink-0 py-2">
                <div className="text-[10px] md:text-xs text-white/70 mt-1 mb-1 flex flex-col items-center">
                  <span className="font-semibold text-white">
                    {idx === 0 ? 'Today' : formatDate(d.date).split(',')[0]}
                  </span>
                  <span className="text-[9px] md:text-[10px] opacity-75 mt-0.5">
                    {formatDate(d.date).split(', ')[1]}
                  </span>
                </div>
                
                <span className="material-symbols-outlined text-2xl text-white my-2 drop-shadow-md">
                  {getWeatherIcon(d.weatherCode)}
                </span>
                
                <div className="flex flex-col items-center w-full my-2">
                  <span className="text-lg md:text-xl font-semibold text-white drop-shadow-md">
                    {Math.round(d.avg)}°
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1 text-[10px] text-white/60 w-full mb-1 mt-auto">
                  <span className="material-symbols-outlined text-[10px] text-blue-300">water_drop</span>
                  {d.precipitationProbabilityMax}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyForecast;
