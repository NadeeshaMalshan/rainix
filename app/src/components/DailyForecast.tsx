import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';

export default function DailyForecast({ dailyData }: { dailyData: any[] }) {
  if (!dailyData || dailyData.length === 0) return null;

  const getWeatherIcon = (codeVal: any) => {
    const code = Number(codeVal);
    if (code === 0) return 'sun';
    if (code >= 1 && code <= 3) return 'cloud';
    if (code === 45 || code === 48) return 'cloud';
    if (code >= 51 && code <= 57) return 'cloud-drizzle';
    if (code >= 61 && code <= 67) return 'cloud-rain';
    if (code >= 71 && code <= 77) return 'cloud-snow';
    if (code >= 80 && code <= 82) return 'cloud-rain';
    if (code >= 85 && code <= 86) return 'cloud-snow';
    if (code >= 95) return 'cloud-lightning';
    return 'cloud';
  };

  return (
    <View className="w-full bg-white/10 rounded-3xl p-4 my-2">
      <View className="flex-row items-center mb-3 opacity-80">
        <MaterialIcons name="calendar-month" size={16} color="white" />
        <Text className="text-white text-xs ml-1 uppercase font-medium tracking-wider">14-Day Forecast</Text>
      </View>
      <View>
        {dailyData.map((day, idx) => (
          <View key={idx} className="flex-row items-center justify-between py-2 border-b border-white/10 last:border-0">
            <Text className="text-white/90 text-sm w-20">
              {idx === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <View className="flex-row items-center justify-center flex-1">
              <Feather 
                name={getWeatherIcon(day.weatherCode) as any} 
                size={20} 
                color="white" 
              />
              <Text className="text-white/70 text-xs ml-2">{day.precipitationProbabilityMax || 0}%</Text>
            </View>
            <View className="flex-row items-center justify-end w-24">
              <Text className="text-white/60 text-sm w-8 text-right">{Math.round(day.low)}°</Text>
              <View className="w-8 h-1 bg-white/20 rounded-full mx-2" />
              <Text className="text-white text-sm w-8 text-right">{Math.round(day.high)}°</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
