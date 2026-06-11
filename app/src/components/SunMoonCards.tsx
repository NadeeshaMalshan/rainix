import React from 'react';
import { View, Text, Image } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';

export default function SunMoonCards({ weather }: { weather: any }) {
  if (!weather) return null;
  const w = weather.weather || weather;

  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
  };

  const sunrise = formatTime(w.sunrise);
  const sunset = formatTime(w.sunset);
  const moonrise = formatTime(w.moonrise);
  const moonset = formatTime(w.moonset);

  const getMoonImage = (name: string) => {
    if (!name) return require('../assets/images/moon/new-moon.png');
    const n = name.toLowerCase();
    if (n.includes('new')) return require('../assets/images/moon/new-moon.png');
    if (n.includes('full')) return require('../assets/images/moon/full-Moon.png');
    if (n.includes('first quarter')) return require('../assets/images/moon/first-quarter-moon.png');
    if (n.includes('last quarter')) return require('../assets/images/moon/last-quarter-moon.png');
    if (n.includes('waxing crescent')) return require('../assets/images/moon/waxing-crescent-moon.png');
    if (n.includes('waning crescent')) return require('../assets/images/moon/waning-crescent-moon.png');
    if (n.includes('waxing gibbous')) return require('../assets/images/moon/waxing-gibbous.png'); 
    if (n.includes('waning gibbous')) return require('../assets/images/moon/waning-gibbous.png');
    return require('../assets/images/moon/full-Moon.png');
  };

  const moonImagePath = getMoonImage(w.moonPhaseName);

  let sunProgress = 0.5;
  if (w.sunrise && w.sunset) {
    const tSunrise = new Date(w.sunrise).getTime();
    const tSunset = new Date(w.sunset).getTime();
    const tNow = new Date().getTime();
    if (tNow >= tSunrise && tNow <= tSunset) {
      sunProgress = (tNow - tSunrise) / (tSunset - tSunrise);
    } else if (tNow > tSunset) {
      sunProgress = 1;
    } else {
      sunProgress = 0;
    }
  }

  const sunX = 10 + (80 * sunProgress); 
  const sunY = 70 - (Math.sin(sunProgress * Math.PI) * 50);

  return (
    <View className="w-full mt-2">
      <View className="flex-row flex-wrap justify-between w-full">
        {/* SUN CARD */}
        <View className="w-[48%] bg-white/10 rounded-3xl p-4 md:p-6 h-56 overflow-hidden relative">
          <View className="flex-1 w-full h-full mt-2 relative">
            <Svg height="80%" width="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
              <Line x1="0" y1="70" x2="100" y2="70" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <Path d="M 0 85 Q 50 0 100 85" fill="none" stroke="rgba(255,215,0,0.4)" strokeWidth="2" strokeDasharray="4 4" />
              <Path d="M 10 70 Q 50 10 90 70" fill="none" stroke="rgba(255,215,0,0.8)" strokeWidth="2" />
            </Svg>

            <View className="absolute inset-0 w-full h-[80%]" pointerEvents="none">
              <View 
                className="absolute rounded-full bg-[#FFD700]"
                style={{ left: `${sunX}%`, top: `${sunY}%`, width: 12, height: 12, marginLeft: -6, marginTop: -6 }}
              ></View>
              <View 
                className="absolute rounded-full bg-yellow-400/30"
                style={{ left: `${sunX}%`, top: `${sunY}%`, width: 20, height: 20, marginLeft: -10, marginTop: -10 }}
              ></View>
            </View>
            
            <View className="absolute bottom-0 w-full flex-row justify-between">
              <View className="items-center">
                <Text className="text-[9px] text-white/60 uppercase tracking-wider">Sunrise</Text>
                <Text className="text-sm font-bold text-white mt-1">{sunrise}</Text>
              </View>
              <View className="items-center">
                <Text className="text-[9px] text-white/60 uppercase tracking-wider">Sunset</Text>
                <Text className="text-sm font-bold text-white mt-1">{sunset}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* MOON CARD */}
        <View className="w-[48%] bg-white/10 rounded-3xl p-4 md:p-6 h-56 overflow-hidden flex-col justify-between">
          <View className="items-center justify-center flex-1">
             <View className="w-20 h-20 items-center justify-center relative">
               <Image source={moonImagePath} className="w-[90%] h-[90%] opacity-90" resizeMode="contain" />
             </View>
             <Text className="mt-2 text-[10px] font-medium text-white/90 text-center">{w.moonPhaseName || 'Waning gibbous'}</Text>
          </View>

          <View className="flex-row justify-between items-end mt-2 w-full">
             <View className="items-start">
               <Text className="text-[9px] text-white/60 uppercase tracking-wider mb-1">Moonset</Text>
               <Text className="text-xs font-bold text-white">{moonset}</Text>
             </View>
             <View className="items-end">
               <Text className="text-[9px] text-white/60 uppercase tracking-wider mb-1">Moonrise</Text>
               <Text className="text-xs font-bold text-white">{moonrise}</Text>
             </View>
          </View>
        </View>

      </View>
    </View>
  );
}
