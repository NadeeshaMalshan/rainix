import React from 'react';

const SunMoonCards = ({ weather }) => {
  if (!weather) return null;

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
  };

  const sunrise = formatTime(weather.sunrise);
  const sunset = formatTime(weather.sunset);
  const moonrise = formatTime(weather.moonrise);
  const moonset = formatTime(weather.moonset);
  const getMoonImage = (name) => {
    if (!name) return '/images/moon.png';
    const n = name.toLowerCase();
    if (n.includes('new')) return '/images/moon/new-moon.png';
    if (n.includes('full')) return '/images/moon/full-Moon.png';
    if (n.includes('first quarter')) return '/images/moon/first-quarter-moon.png';
    if (n.includes('last quarter')) return '/images/moon/last-quarter-moon.png';
    if (n.includes('waxing crescent')) return '/images/moon/waxing-crescent-moon.png';
    if (n.includes('waning crescent')) return '/images/moon/waning-crescent-moon.png';
    if (n.includes('waxing gibbous')) return '/images/moon/waxing-gibbous.png'; 
    if (n.includes('waning gibbous')) return '/images/moon/waning-gibbous.png';
    return '/images/moon.png';
  };

  const moonImagePath = getMoonImage(weather.moonPhaseName);

  // Calculate sun position
  let sunProgress = 0.5;
  if (weather.sunrise && weather.sunset) {
    const tSunrise = new Date(weather.sunrise).getTime();
    const tSunset = new Date(weather.sunset).getTime();
    const tNow = new Date().getTime();
    if (tNow >= tSunrise && tNow <= tSunset) {
      sunProgress = (tNow - tSunrise) / (tSunset - tSunrise);
    } else if (tNow > tSunset) {
      sunProgress = 1;
    } else {
      sunProgress = 0;
    }
  }

  const sunX = 10 + (80 * sunProgress); // 10% to 90%
  // simple parabola for sun height, adjusted to stay above text
  const sunY = 70 - (Math.sin(sunProgress * Math.PI) * 50);

  return (
    <div className="w-full max-w-[1600px] w-[95vw] mx-auto mt-6 px-2 md:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* SUN CARD */}
        <div className="deep-frosted-pill animate-fade-in-up rounded-3xl p-6 shadow-glass relative flex flex-col h-64 md:h-72 overflow-hidden" style={{ animationDelay: '0.5s' }}>
          
          <div className="flex-1 relative w-full h-full mt-4">
            <svg className="absolute inset-0 w-full h-[80%]" preserveAspectRatio="none" viewBox="0 0 100 100">
              {/* Horizon Line */}
              <line x1="0" y1="70" x2="100" y2="70" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              
              {/* Sun Path Curve */}
              <path d="M 0 85 Q 50 0 100 85" fill="none" stroke="rgba(255,215,0,0.4)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 10 70 Q 50 10 90 70" fill="none" stroke="rgba(255,215,0,0.8)" strokeWidth="2" />
            </svg>

            {/* Sun HTML Element to prevent stretching */}
            <div className="absolute inset-0 w-full h-[80%] pointer-events-none">
              <div 
                className="absolute rounded-full bg-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.6)]"
                style={{
                  left: `${sunX}%`,
                  top: `${sunY}%`,
                  width: '14px',
                  height: '14px',
                  transform: 'translate(-50%, -50%)'
                }}
              ></div>
              <div 
                className="absolute rounded-full bg-yellow-400/30"
                style={{
                  left: `${sunX}%`,
                  top: `${sunY}%`,
                  width: '24px',
                  height: '24px',
                  transform: 'translate(-50%, -50%)'
                }}
              ></div>
            </div>
            
            <div className="absolute bottom-0 w-full flex justify-between px-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-white/60 uppercase tracking-wider">Sunrise</span>
                <span className="text-xl md:text-2xl font-bold text-white mt-1">{sunrise}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-white/60 uppercase tracking-wider">Sunset</span>
                <span className="text-xl md:text-2xl font-bold text-white mt-1">{sunset}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MOON CARD */}
        <div className="deep-frosted-pill animate-fade-in-up rounded-3xl p-6 shadow-glass relative flex items-center justify-between h-64 md:h-72 overflow-hidden px-8" style={{ animationDelay: '0.6s' }}>
          
          <div className="flex flex-col items-center">
             <div className="relative w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
               <img src={moonImagePath} alt="Moon Phase" className="w-[90%] h-[90%] object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]" />
             </div>
             <span className="mt-4 text-sm md:text-base font-medium text-white/90">{weather.moonPhaseName || 'Waning gibbous'}</span>
          </div>

          <div className="flex flex-col justify-center gap-6 md:gap-8 text-right">
             <div className="flex flex-col items-end">
               <span className="text-xs text-white/60 uppercase tracking-wider mb-1">Moonset</span>
               <span className="text-2xl md:text-3xl font-bold text-white">{moonset}</span>
             </div>
             <div className="flex flex-col items-end">
               <span className="text-xs text-white/60 uppercase tracking-wider mb-1">Moonrise</span>
               <span className="text-2xl md:text-3xl font-bold text-white">{moonrise}</span>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default SunMoonCards;
