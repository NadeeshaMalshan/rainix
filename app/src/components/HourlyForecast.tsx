import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle, G } from 'react-native-svg';

export default function HourlyForecast({ hourlyData }: { hourlyData: any[] }) {
  if (!hourlyData || hourlyData.length === 0) return null;

  const next24 = hourlyData.slice(0, 24);
  const parsedPrecip = next24.map(h => Number(h.precipitation) || 0);
  const maxPrecip = Math.max(...parsedPrecip) > 0 ? Math.max(...parsedPrecip) : 1;

  const getWeatherIcon = (codeVal: any, timeStr: string) => {
    const code = Number(codeVal);
    let isNight = false;
    if (timeStr) {
      const hours = new Date(timeStr).getHours();
      isNight = hours >= 19 || hours <= 6;
    }
    
    if (code === 0) return isNight ? 'moon' : 'sun';
    if (code >= 1 && code <= 3) return 'cloud';
    if (code === 45 || code === 48) return 'cloud'; // fog
    if (code >= 51 && code <= 57) return 'cloud-drizzle';
    if (code >= 61 && code <= 67) return 'cloud-rain';
    if (code >= 71 && code <= 77) return 'cloud-snow';
    if (code >= 80 && code <= 82) return 'cloud-rain';
    if (code >= 85 && code <= 86) return 'cloud-snow';
    if (code >= 95) return 'cloud-lightning';
    return 'cloud';
  };

  return (
    <View className="w-full">
      {/* 24-Hour Forecast (Temperatures) */}
      <View className="w-full bg-white/10 rounded-3xl p-4 my-2">
        <View className="flex-row items-center mb-3 opacity-80">
          <MaterialIcons name="schedule" size={16} color="white" />
          <Text className="text-white text-xs ml-1 uppercase font-medium tracking-wider">24-Hour Forecast</Text>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ flexDirection: 'row', position: 'relative', paddingTop: 8, paddingBottom: 8, paddingRight: 16 }}
        >
          {/* SVG Background Line Chart */}
          <View className="absolute z-0" style={{ top: 56, left: 0, height: 40, width: next24.length * 64 }}>
            <Svg height={40} width={next24.length * 64} viewBox={`0 0 ${next24.length * 64} 40`}>
              {next24.map((h, i) => {
                const ITEM_WIDTH = 64;
                const HALF_WIDTH = ITEM_WIDTH / 2;
                const xCenter = i * ITEM_WIDTH + HALF_WIDTH;
                
                const minTemp = Math.min(...next24.map(h => h.temperature));
                const maxTemp = Math.max(...next24.map(h => h.temperature));
                const range = maxTemp - minTemp || 1;
                
                // Scale to fit between y=10 and y=30 (inside 40px height)
                const yCenter = 30 - ((h.temperature - minTemp) / range) * 20; 
                
                const prev = i > 0 ? next24[i - 1] : null;
                const prevY = prev ? 30 - ((prev.temperature - minTemp) / range) * 20 : yCenter;
                const prevX = prev ? (i - 1) * ITEM_WIDTH + HALF_WIDTH : xCenter;
                
                return (
                  <G key={`svg-${i}`}>
                    {i > 0 && (
                      <Line x1={prevX} y1={prevY} x2={xCenter} y2={yCenter} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="2" />
                    )}
                    <Circle cx={xCenter} cy={yCenter} r="4" fill="white" />
                  </G>
                );
              })}
            </Svg>
          </View>

          {next24.map((hour, idx) => (
            <View key={idx} className="items-center w-16 relative z-10" style={{ width: 64 }}>
              <Text className="text-white/80 text-xs mb-2">
                {idx === 0 ? 'Now' : hour.time?.split('T')[1]?.substring(0, 5) || ''}
              </Text>
              <Feather 
                name={getWeatherIcon(hour.weatherCode, hour.time) as any} 
                size={24} 
                color="white" 
              />
              
              {/* Spacer for the chart to live in */}
              <View style={{ height: 40, width: '100%' }} />
              
              <Text className="text-white font-medium mt-1 text-base">{Math.round(hour.temperature)}°</Text>
              <View className="flex-row items-center mt-1 opacity-60">
                <MaterialIcons name="water-drop" size={10} color="#93c5fd" />
                <Text className="text-white text-[10px] ml-0.5">{hour.precipitationProbability}%</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Expected Rainfall */}
      <View className="w-full bg-white/10 rounded-3xl p-4 my-2">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center opacity-80">
            <MaterialIcons name="water-drop" size={16} color="white" />
            <Text className="text-white text-xs ml-1 uppercase font-medium tracking-wider">Expected Rainfall</Text>
          </View>
          <View className="bg-white/10 px-2 py-0.5 rounded-full">
            <Text className="text-white/80 text-[10px]">Max: {maxPrecip.toFixed(1)} mm</Text>
          </View>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-end', height: 128, paddingTop: 16, paddingRight: 16 }}
        >
          {next24.map((hour, idx) => {
            const heightPercentage = (Number(hour.precipitation || 0) / maxPrecip) * 100;
            return (
              <View key={idx} className="items-center w-10 h-full justify-end relative" style={{ width: 40, marginRight: 16 }}>
                <Text className="text-white/70 text-[10px] absolute top-0">
                  {idx === 0 ? 'Now' : hour.time?.split('T')[1]?.substring(0, 5) || ''}
                </Text>
                
                {/* Bar */}
                <View className="w-8 h-20 flex justify-end items-center mb-1">
                  <LinearGradient
                    colors={['rgba(56,189,248,0.8)', 'rgba(59,130,246,0.8)']}
                    style={{ 
                      width: '100%', 
                      height: `${Math.max(heightPercentage, 2)}%`,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4
                    }}
                  >
                    <View className="w-full h-1 bg-white/40 rounded-t-sm" />
                  </LinearGradient>
                </View>
                
                <Text className="text-white text-[10px] font-medium">
                  {Number(hour.precipitation) > 0 ? Number(hour.precipitation).toFixed(2) : '0.00'}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
