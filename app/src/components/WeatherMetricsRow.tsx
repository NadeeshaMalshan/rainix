import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

export default function WeatherMetricsRow({ weather }: { weather: any }) {
  if (!weather) return null;

  const w = weather.weather || weather;
  const windSpeed = w.windSpeed || 0;
  const windDirection = w.windDirection || 0;
  const pressure = w.pressure || 1012;
  const aqi = w.aqi || 0;
  const pollen = w.pollen;
  const uvIndex = w.uvIndexMax || w.uvIndex || 0;
  const visibility = w.visibility || 0;

  // Pressure
  const pressureCircumference = Math.PI * 45;
  const pressurePercent = Math.max(0, Math.min(100, ((pressure - 950) / 100) * 100));
  const pressureOffset = pressureCircumference - (pressurePercent / 100) * pressureCircumference;

  // AQI
  let aqiLabel = 'Good';
  let aqiColor = 'bg-green-400';
  if (aqi > 50) { aqiLabel = 'Moderate'; aqiColor = 'bg-yellow-400'; }
  if (aqi > 100) { aqiLabel = 'Unhealthy'; aqiColor = 'bg-orange-500'; }
  if (aqi > 150) { aqiLabel = 'Very Unhealthy'; aqiColor = 'bg-red-500'; }
  const aqiPercent = Math.max(0, Math.min(100, (aqi / 300) * 100));

  const getPollenText = (val: number) => {
    if (!val || val < 10) return 'None';
    if (val < 50) return 'Low';
    if (val < 100) return 'Medium';
    return 'High';
  };

  // UV
  let uvLabel = 'Low';
  let uvColor = 'bg-green-400';
  if (uvIndex >= 3) { uvLabel = 'Moderate'; uvColor = 'bg-yellow-400'; }
  if (uvIndex >= 6) { uvLabel = 'High'; uvColor = 'bg-orange-500'; }
  if (uvIndex >= 8) { uvLabel = 'Very High'; uvColor = 'bg-red-500'; }
  if (uvIndex >= 11) { uvLabel = 'Extreme'; uvColor = 'bg-purple-500'; }
  const uvPercent = Math.max(0, Math.min(100, (uvIndex / 11) * 100));

  return (
    <View className="w-full mt-2">
      <View className="flex-row flex-wrap justify-between w-full">
        {/* WIND */}
        <View className="w-[48%] bg-white/10 rounded-3xl p-4 mb-4 h-56">
          <View className="flex-row items-center mb-2 opacity-80">
            <MaterialIcons name="air" size={16} color="white" />
            <Text className="text-white text-xs ml-1 font-medium">Wind</Text>
          </View>
          <View className="flex-1 items-center justify-center relative">
            <View className="w-32 h-32 items-center justify-center relative">
              <View className="absolute inset-0 items-center justify-center" style={{ transform: [{ rotate: '-90deg' }] }}>
                <Svg height="100%" width="100%" viewBox="0 0 100 100">
                  <Circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                </Svg>
              </View>
              <Text className="absolute top-1 text-red-400 text-[10px] font-bold">N</Text>
              <Text className="absolute right-2 text-white/50 text-[10px] font-bold">E</Text>
              <Text className="absolute bottom-1 text-white/50 text-[10px] font-bold">S</Text>
              <Text className="absolute left-2 text-white/50 text-[10px] font-bold">W</Text>
              
              <View className="absolute inset-0 items-center justify-center" style={{ transform: [{ rotate: `${windDirection}deg` }] }}>
                <Svg height="100%" width="100%" viewBox="0 0 100 100">
                  <Polygon points="50,1 55,10 45,10" fill="white" />
                </Svg>
              </View>

              <View className="items-center justify-center mt-2">
                <Text className="text-2xl font-bold text-white">{Math.round(windSpeed)}</Text>
                <Text className="text-[10px] font-medium text-white/80">km/h</Text>
              </View>
            </View>
          </View>
        </View>

        {/* PRESSURE */}
        <View className="w-[48%] bg-white/10 rounded-3xl p-4 mb-4 h-56">
          <View className="flex-row items-center mb-2 opacity-80">
            <MaterialIcons name="compress" size={16} color="white" />
            <Text className="text-white text-xs ml-1 font-medium">Pressure</Text>
          </View>
          <View className="flex-1 items-center justify-center relative mt-2">
            <View className="w-40 h-20 overflow-hidden items-center justify-end relative">
              <View className="absolute top-0 w-full h-40 items-center justify-center" style={{ transform: [{ rotate: '180deg' }] }}>
                <Svg height="100%" width="100%" viewBox="0 0 100 100">
                  <Circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" strokeDasharray={`${pressureCircumference} ${pressureCircumference}`} strokeDashoffset="0" />
                  <Circle 
                    cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="6" 
                    strokeDasharray={`${pressureCircumference} ${pressureCircumference}`} strokeDashoffset={pressureOffset} strokeLinecap="round"
                  />
                </Svg>
              </View>
              <View className="items-center justify-center mb-1">
                <Text className="text-xl font-bold text-white">{pressure.toFixed(1)}</Text>
                <Text className="text-[10px] font-medium text-white/60">mb</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AQI & POLLEN */}
        <View className="w-[48%] bg-white/10 rounded-3xl p-4 mb-4 h-56">
          <View className="flex-row items-center mb-1 opacity-80">
            <Text className="text-white text-xs font-medium">AQI</Text>
          </View>
          <View className="flex-1 justify-between">
            <View className="mb-2">
              <View className="flex-row items-end gap-1 mb-2">
                <Text className="text-base font-bold text-white">{aqiLabel}</Text>
                <Text className="text-[10px] text-white/60 mb-0.5">({aqi})</Text>
              </View>
              <View className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <View className={`h-full rounded-full ${aqiColor}`} style={{ width: `${aqiPercent}%` }}></View>
              </View>
            </View>

            <View className="flex-row justify-between items-end pb-1 mt-2">
              <View className="items-center gap-1">
                <MaterialIcons name="eco" size={18} color="rgba(255,255,255,0.4)" />
                <Text className="text-[9px] text-white/60">Tree</Text>
                <Text className="text-[10px] font-semibold text-white">{getPollenText(pollen?.tree)}</Text>
              </View>
              <View className="items-center gap-1">
                <MaterialIcons name="grass" size={18} color="rgba(255,255,255,0.4)" />
                <Text className="text-[9px] text-white/60">Grass</Text>
                <Text className="text-[10px] font-semibold text-white">{getPollenText(pollen?.grass)}</Text>
              </View>
              <View className="items-center gap-1">
                <MaterialIcons name="local-florist" size={18} color="rgba(255,255,255,0.4)" />
                <Text className="text-[9px] text-white/60">Weed</Text>
                <Text className="text-[10px] font-semibold text-white">{getPollenText(pollen?.ragweed)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* UV INDEX & VISIBILITY */}
        <View className="w-[48%] bg-white/10 rounded-3xl p-4 mb-4 h-56">
          <View className="flex-row items-center mb-1 opacity-80">
            <MaterialIcons name="light-mode" size={16} color="white" />
            <Text className="text-white text-xs ml-1 font-medium">Max UV Index</Text>
          </View>
          
          <View className="flex-1">
            <View className="mb-2 mt-1">
              <Text className="text-2xl font-bold text-white">{uvLabel}</Text>
            </View>
            
            <View className="relative w-full h-2.5 rounded-full mt-3 bg-white/10 overflow-visible">
              <View className="absolute inset-0 rounded-full overflow-hidden">
                <LinearGradient
                  colors={['#4ade80', '#facc15', '#f97316', '#a855f7']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
              <View 
                className={`absolute top-1/2 -ml-2.5 w-5 h-5 rounded-full border-[2px] border-white items-center justify-center ${uvColor}`} 
                style={{ left: `${uvPercent}%`, marginTop: -10 }}
              >
                <Text className="text-[9px] font-bold text-white leading-none">{Math.round(uvIndex)}</Text>
              </View>
            </View>
            <View className="flex-row justify-between w-full mt-1">
               <Text className="text-[9px] text-white/50 font-bold">0</Text>
               <Text className="text-[9px] text-white/50 font-bold">11+</Text>
            </View>
          </View>

          <View className="mt-auto pt-3 border-t border-white/10 flex-row justify-between items-center w-full">
            <View className="flex-row items-center gap-1">
              <MaterialIcons name="visibility" size={14} color="rgba(255,255,255,0.6)" />
              <Text className="text-white/80 text-[10px] font-medium">Vis</Text>
            </View>
            <View className="items-end">
              <Text className="text-sm font-bold text-white">
                {visibility ? (visibility / 1000).toFixed(1) : '--'}<Text className="text-[9px] text-white/60 ml-0.5">km</Text>
              </Text>
            </View>
          </View>
        </View>

      </View>
    </View>
  );
}
