import React, { useEffect, useState } from 'react';

interface StationWeatherCardProps {
  lat: number | null;
  lon: number | null;
  stationName: string;
}

interface WeatherData {
  temp: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
}

export default function StationWeatherCard({ lat, lon, stationName }: StationWeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (lat === null || lon === null) {
      setWeather(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(false);

    // Fetch weather specifically for this station's coordinates
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability&timezone=auto`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        if (data.error) {
          setError(true);
          setLoading(false);
          return;
        }

        setWeather({
          temp: data.current.temperature_2m,
          humidity: data.current.relative_humidity_2m,
          precipitation: data.current.precipitation,
          precipitationProbability: data.hourly.precipitation_probability[new Date().getHours()] || 0,
          windSpeed: data.current.wind_speed_10m,
          weatherCode: data.current.weather_code,
        });
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [lat, lon]);

  // Map WMO weather codes to material symbols
  const getWeatherIcon = (code: number, isNight: boolean) => {
    if (code === 0) return isNight ? 'clear_night' : 'clear_day';
    if (code >= 1 && code <= 3) return isNight ? 'partly_cloudy_night' : 'partly_cloudy_day';
    if (code >= 45 && code <= 48) return 'foggy';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
    if (code >= 71 && code <= 77) return 'weather_snowy';
    if (code >= 95 && code <= 99) return 'thunderstorm';
    return 'cloud';
  };

  if (!lat || !lon) {
    return (
      <div className="w-full h-full min-h-[250px] rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center font-poppins text-white/50 p-6 text-center">
        Location data missing for {stationName}
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[200px] rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-4 font-poppins font-normal text-white flex flex-col gap-4 relative overflow-hidden justify-center">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Top Section: Icon | Temp \n Location */}
      <div className="flex flex-col justify-center items-center p-2">
        <div className="flex items-center gap-4 mb-2">
          <span className="material-symbols-outlined text-6xl text-white/90 drop-shadow-md">
            {weather ? getWeatherIcon(weather.weatherCode, new Date().getHours() >= 19 || new Date().getHours() <= 6) : 'cloud'}
          </span>
          <div className="text-5xl font-light tracking-tighter">
            {weather ? Math.round(weather.temp) : '--'}°
          </div>
        </div>
        <div className="text-lg md:text-xl text-white/80 text-center mt-2 px-2 max-w-full truncate">
          {stationName}
        </div>
      </div>

      {/* Bottom Section: 4 Columns */}
      <div className="grid grid-cols-4 gap-2 w-full mt-2">
        {/* MM (Precipitation) */}
        <div className="flex flex-col items-center justify-center p-3">
          <span className="material-symbols-outlined text-2xl mb-1 opacity-80 text-white/90">water_drop</span>
          <span className="text-lg">{weather ? weather.precipitation : '--'} <span className="text-sm opacity-60">mm</span></span>
        </div>
        
        {/* Possibility (Probability) */}
        <div className="flex flex-col items-center justify-center p-3">
          <span className="material-symbols-outlined text-2xl mb-1 opacity-80 text-white/90">rainy</span>
          <span className="text-lg">{weather ? weather.precipitationProbability : '--'} <span className="text-sm opacity-60">%</span></span>
        </div>
        
        {/* Wind */}
        <div className="flex flex-col items-center justify-center p-3">
          <span className="material-symbols-outlined text-2xl mb-1 opacity-80 text-white/90">air</span>
          <span className="text-lg">{weather ? weather.windSpeed : '--'} <span className="text-sm opacity-60">km/h</span></span>
        </div>
        
        {/* Humidity */}
        <div className="flex flex-col items-center justify-center p-3">
          <span className="material-symbols-outlined text-2xl mb-1 opacity-80 text-white/90">humidity_percentage</span>
          <span className="text-lg">{weather ? weather.humidity : '--'} <span className="text-sm opacity-60">%</span></span>
        </div>
      </div>
    </div>
  );
}
