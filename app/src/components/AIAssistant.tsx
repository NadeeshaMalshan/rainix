import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, Keyboard, ActivityIndicator, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { ArrowUp, Settings, AlertTriangle, ChevronUp, ChevronDown, Monitor, Moon, Sun, Search, CloudRain, Wind, Droplets, Thermometer, Calendar } from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText, Line, G, Polygon, Polyline, Circle } from 'react-native-svg';
import EventSource from 'react-native-sse';
import Animated, { FadeIn, FadeInUp, Layout, SlideInDown, ZoomIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const knownCities = [
  "colombo", "kelaniya", "kaduwela", "hanwella", "mapitigama", "pugoda", "ruwanwella", 
  "avissawella", "wellampitiya", "kolonnawa", "ratnapura", "millakanda", "putupaula", 
  "kalutara", "kuruvita", "kuruwita", "ayagama", "pelmadulla", "kalawana", "kahawaththa", 
  "kahawatta", "elapatha", "matara", "bangama", "polothugama", "hulandawa", "warapitiya", 
  "kekiriobada", "peradeniya", "kandy", "gampola", "teldeniya", "katugastota", "chilaw", 
  "kurunegala", "ridibendiella", "sengaloya", "puttalam", "wanathawilluwa", "pahariya", 
  "anuradhapura", "vavuniya", "rambewa", "poonawa", "trincomalee", "habarana", "ampara", 
  "batticaloa", "gampaha", "wattala", "miriswatta", "badulla", "tokyo", "sydney", "london"
];

const detectCity = (userText: string, assistantText: string) => {
  const combined = `${userText || ""} ${assistantText || ""}`.toLowerCase();
  
  const cleanUser = (userText || "").trim().toLowerCase();
  const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy", "yo", "hi there", "hello there"];
  if (greetings.includes(cleanUser) || cleanUser.length <= 3) {
    return null;
  }
  
  for (const city of knownCities) {
    if (combined.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }

  const riverCityMap = [
    { rivers: ["kalu ganga", "kalu gange", "kalu"], city: "Ratnapura" },
    { rivers: ["kelani ganga", "kelani gange", "kelani"], city: "Colombo" },
    { rivers: ["nilwala ganga", "nilwala gange", "nilwala"], city: "Matara" },
    { rivers: ["mahaweli"], city: "Kandy" },
    { rivers: ["kuru ganga", "kuru gange", "kuru"], city: "Kuruvita" },
    { rivers: ["deduru oya", "deduru"], city: "Kurunegala" },
    { rivers: ["mi oya"], city: "Puttalam" },
    { rivers: ["malwathu oya", "malwathu"], city: "Anuradhapura" },
    { rivers: ["yan oya"], city: "Trincomalee" },
    { rivers: ["gal oya"], city: "Ampara" },
    { rivers: ["gin ganga", "gin gange"], city: "Galle" },
    { rivers: ["wey ganga", "wey gange"], city: "Kahawaththa" },
    { rivers: ["kukule ganga", "kukule gange"], city: "Kalawana" },
    { rivers: ["denawaka ganga", "denawaka gange"], city: "Pelmadulla" },
    { rivers: ["niriella ganga", "niriella gange"], city: "Elapatha" },
    { rivers: ["galathura oya"], city: "Ayagama" },
    { rivers: ["mundeni aru"], city: "Batticaloa" },
    { rivers: ["magalawattuwan oya", "magalawattuwan"], city: "Batticaloa" },
    { rivers: ["maduru oya", "maduru"], city: "Batticaloa" },
    { rivers: ["andella oya", "andella"], city: "Batticaloa" },
    { rivers: ["uruwal oya"], city: "Gampaha" },
    { rivers: ["kalu ela"], city: "Gampaha" },
    { rivers: ["hali ela"], city: "Badulla" },
  ];

  for (const entry of riverCityMap) {
    if (entry.rivers.some(r => combined.includes(r))) {
      return entry.city;
    }
  }
  return null;
};

const getWeatherIcon = (code: number, timeStr?: string) => {
  const isNight = timeStr && timeStr.includes('T') ? parseInt(timeStr.split('T')[1].substring(0, 2)) < 6 || parseInt(timeStr.split('T')[1].substring(0, 2)) > 18 : false;
  if (code === 0) return isNight ? 'moon' : 'sun';
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

const getWeatherLabel = (code: number) => {
  if (code === 0) return 'Sunny';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code === 45 || code === 48) return 'Fog'; 
  if (code >= 51 && code <= 57) return 'Light Rain';
  if (code >= 61 && code <= 67) return 'Rain'; 
  if (code >= 71 && code <= 77) return 'Snow'; 
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow Showers'; 
  if (code >= 95) return 'Thunderstorms';
  return 'Cloudy';
};

function AICurrentWeatherCard({ data }: any) {
  if (!data || !data.weather) return null;
  const weather = data.weather.weather;
  const temp = Math.round(weather.temperature);
  const icon = getWeatherIcon(weather.weatherCode, data.weather.time);
  const label = getWeatherLabel(weather.weatherCode);

  return (
    <Animated.View entering={FadeInUp} className="w-full rounded-2xl p-4 mt-3 mb-2" style={{ backgroundColor: '#1c1c1e', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}>
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <Text className="text-lg font-bold" style={{ color: '#ffffff' }}>{data.weather.city || data.city}</Text>
          <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{data.weather.country || 'Sri Lanka'}</Text>
        </View>
        <Feather name={icon as any} size={28} color="white" />
      </View>
      <View className="flex-row items-baseline gap-2 mb-4">
        <Text className="text-4xl font-light" style={{ color: '#ffffff' }}>{temp}°C</Text>
        <Text className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{label}</Text>
      </View>
      <View className="flex-row flex-wrap border-t pt-3 gap-y-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
        <View className="w-1/2 flex-row items-center gap-2">
          <Thermometer size={16} color="#a0a0a0" />
          <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Feels: {Math.round(weather.feelsLike)}°C</Text>
        </View>
        <View className="w-1/2 flex-row items-center gap-2">
          <Droplets size={16} color="#a0a0a0" />
          <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Humidity: {weather.humidity}%</Text>
        </View>
        <View className="w-1/2 flex-row items-center gap-2">
          <Wind size={16} color="#a0a0a0" />
          <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Wind: {weather.windSpeed} km/h</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function AIHourlyForecastCard({ data }: any) {
  if (!data || !data.weather?.weather?.hourly) return null;
  const hourly = data.weather.weather.hourly;
  
  return (
    <Animated.View entering={FadeInUp} className="w-full rounded-2xl p-4 mt-3 mb-2" style={{ backgroundColor: '#1c1c1e', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}>
      <View className="flex-row items-center gap-2 mb-3 px-1">
        <Feather name="clock" size={14} color="#a0a0a0" />
        <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.8)' }}>24-Hour Forecast</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 px-1">
        {hourly.map((h: any, idx: number) => {
          let timeLabel = "12:00";
          if (h.time && h.time.includes('T')) {
            timeLabel = h.time.split('T')[1].substring(0, 5);
          }
          return (
            <View key={idx} className="items-center mr-4">
              <Text className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{timeLabel}</Text>
              <Feather name={getWeatherIcon(h.weatherCode, h.time) as any} size={20} color="white" />
              <Text className="text-sm font-medium mt-2" style={{ color: '#ffffff' }}>{Math.round(h.temperature)}°</Text>
            </View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

function AIForecastDaysCard({ data, days = 14 }: any) {
  if (!data || !data.weather?.weather?.forecast14Days) return null;
  const forecastList = data.weather.weather.forecast14Days.slice(0, days);
  
  return (
    <Animated.View entering={FadeInUp} className="w-full rounded-2xl p-4 mt-3 mb-2" style={{ backgroundColor: '#1c1c1e', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}>
      <View className="flex-row items-center gap-2 mb-3 px-1">
        <Calendar size={14} color="#a0a0a0" />
        <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.8)' }}>{forecastList.length}-Day Forecast</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 px-1">
        {forecastList.map((f: any, idx: number) => {
          const dateObj = new Date(f.date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          return (
            <View key={idx} className="items-center mr-5">
              <Text className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{dayName}</Text>
              <Feather name={getWeatherIcon(f.weatherCode) as any} size={20} color="white" />
              <View className="items-center mt-2">
                <Text className="text-sm font-medium" style={{ color: '#ffffff' }}>{Math.round(f.high)}°</Text>
                <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{Math.round(f.low)}°</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

function AIRiverTelemetryCard({ data }: any) {
  const [predictions, setPredictions] = useState<any>({});

  useEffect(() => {
    const rivers = Array.isArray(data) ? data : data?.rivers;
    if (!rivers) return;
    
    rivers.forEach(async (river: any) => {
      const rid = river.id || river.name;
      if (predictions[rid] !== undefined) return;
      try {
        const payload = {
          river_name: (river.name || "").toLowerCase().includes("ratnapura") ? "Kalu Ganga - Ratnapura" : river.name,
          historical_data: river.historicalData || [],
          weather_data: data
        };
        const aiApiUrl = process.env.EXPO_PUBLIC_AI_API_URL || "http://10.0.2.2:8000";
        const res = await fetch(`${aiApiUrl}/api/predict/river`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.predicted_level != null) {
          setPredictions((prev: any) => ({...prev, [rid]: json.predicted_level}));
        }
      } catch (e) {}
    });
  }, [data]);

  const rivers = Array.isArray(data) ? data : data?.rivers;
  if (!rivers || rivers.length === 0) return null;
  
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full flex-row gap-4 mt-3 mb-2" snapToInterval={width * 0.85 + 16} decelerationRate="fast">
      {rivers.map((river: any, idx: number) => {
        const hasHistory = Array.isArray(river.historicalData) && river.historicalData.length > 0;
        let currentLevel = river.currentLevel;
        if (currentLevel === undefined && hasHistory) {
          currentLevel = river.historicalData[river.historicalData.length - 1].y;
        }
        
        let pointsString = "";
        let fillPointsString = "";
        let minVal = 0, maxVal = 10, minX = 0, maxX = 1;
        let coords: any[] = [];
        
        const thresholds: any[] = [];
        if (river.levels?.minor) thresholds.push({ label: 'Minor', val: Number(river.levels.minor) });
        if (river.levels?.alert) thresholds.push({ label: 'Alert', val: Number(river.levels.alert) });
        if (river.levels?.major) thresholds.push({ label: 'Major', val: Number(river.levels.major) });
        
        if (hasHistory) {
          const yValues = river.historicalData.map((p: any) => p.y);
          minVal = Math.min(...yValues);
          maxVal = Math.max(...yValues);
          if (thresholds.length > 0) {
            const maxT = Math.max(...thresholds.map(t => t.val));
            const minT = Math.min(...thresholds.map(t => t.val));
            if (maxT > maxVal) maxVal = maxT;
            if (minT < minVal) minVal = minT;
          }
          const diff = maxVal - minVal;
          maxVal = maxVal + (diff > 0 ? diff * 0.15 : 1);
          minVal = Math.max(0, minVal - (diff > 0 ? diff * 0.15 : 1));
          
          maxX = river.historicalData.length - 1 || 1;
          coords = river.historicalData.map((p: any, i: number) => ({
            x: ((i - minX) / (maxX - minX)) * 250 + 30,
            y: 90 - ((p.y - minVal) / (maxVal - minVal)) * 70,
            val: p.y
          }));
          pointsString = coords.map(c => `${c.x},${c.y}`).join(" ");
          fillPointsString = `30,90 ${pointsString} ${coords[coords.length - 1].x},90`;
        }
        
        const strokeColor = "#3B82F6";
        const gradientId = `grad-${idx}`;
        const yValues = hasHistory ? river.historicalData.map((p: any) => p.y) : [];
        const maxValFloat = yValues.length > 0 ? Math.max(...yValues) : 0;
        const avgLevel = yValues.length > 0 ? yValues.reduce((a: number, b: number) => a + b, 0) / yValues.length : 0;
        const predictedLevel = predictions[river.id || river.name];

        let trendText = "Stable";
        if (hasHistory && river.historicalData.length >= 2) {
          const lastVal = Number(river.historicalData[river.historicalData.length - 1].y);
          const compareIndex = Math.max(0, river.historicalData.length - 5);
          const prevVal = Number(river.historicalData[compareIndex].y);
          const diff = lastVal - prevVal;
          if (diff > 0.001) trendText = "Rising";
          else if (diff < -0.001) trendText = "Falling";
        }

        const timeLabels = [];
        const nowMs = Date.now();
        for (let i = 0; i <= 4; i++) {
          const t = new Date(nowMs - (24 - i * 6) * 3600 * 1000);
          timeLabels.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }

        return (
          <View key={idx} className="rounded-2xl p-4 flex-shrink-0 mr-4" style={{ width: width * 0.85, backgroundColor: '#1c1c1e', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}>
            <View className="flex-row justify-between items-start mb-3">
              <View>
                <Text className="text-lg font-bold" style={{ color: '#ffffff' }}>{river.name.replace(/^(Kelani Ganga|Kalu Ganga|Nilwala Ganga|Gin Ganga)\s*-\s*/i, "")}</Text>
                <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Active River Station</Text>
              </View>
              <Feather name="activity" size={24} color="white" />
            </View>
            
            <View className="flex-row items-baseline gap-2 mb-3">
              <Text className="text-3xl font-light" style={{ color: '#ffffff' }}>{currentLevel != null ? `${currentLevel.toFixed(2)}m` : 'N/A'}</Text>
              <Text className={`text-xs font-bold ${river.status === 'ALERT' ? 'text-red-400' : 'text-blue-400'}`}>
                {river.status === "ALERT" ? "High Alert" : "Safe"}
              </Text>
            </View>
            
            <View className="flex-row flex-wrap border-t pt-3 gap-y-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <View className="w-1/2 flex-row items-center gap-1.5">
                <Feather name="cpu" size={14} color="#a0a0a0" />
                <Text className="text-[11px]" style={{ color: 'rgba(255,255,255,0.8)' }}>30m Pred: {predictedLevel !== undefined ? `${predictedLevel.toFixed(2)}m` : '...'}</Text>
              </View>
              <View className="w-1/2 flex-row items-center gap-1.5">
                <Feather name="trending-up" size={14} color="#a0a0a0" />
                <Text className="text-[11px]" style={{ color: 'rgba(255,255,255,0.8)' }}>Trend: {trendText}</Text>
              </View>
            </View>
            
            {hasHistory ? (
              <View className="mt-4 pt-3 border-t relative" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <Text className="text-[10px] uppercase font-bold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>24H History</Text>
                <View style={{ height: 100, width: '100%' }}>
                  <Svg viewBox="0 0 300 100" width="100%" height="100%">
                    <Defs>
                      <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
                        <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                      </LinearGradient>
                    </Defs>
                    
                    <SvgText x="25" y="15" fontSize="8" fill="#a0a0a0" textAnchor="end">{maxVal.toFixed(1)}</SvgText>
                    <Line x1="30" y1="12" x2="280" y2="12" stroke="#a0a0a0" strokeWidth="0.5" strokeOpacity="0.2" />
                    
                    <SvgText x="25" y="53" fontSize="8" fill="#a0a0a0" textAnchor="end">{((maxVal + minVal) / 2).toFixed(1)}</SvgText>
                    <Line x1="30" y1="50" x2="280" y2="50" stroke="#a0a0a0" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="2,2" />
                    
                    <SvgText x="25" y="93" fontSize="8" fill="#a0a0a0" textAnchor="end">{minVal.toFixed(1)}</SvgText>
                    <Line x1="30" y1="90" x2="280" y2="90" stroke="#a0a0a0" strokeWidth="0.5" strokeOpacity="0.2" />
                    
                    {thresholds.map((t, i) => {
                      if (t.val >= minVal && t.val <= maxVal) {
                        const tY = 90 - ((t.val - minVal) / (maxVal - minVal)) * 70;
                        return (
                          <G key={i}>
                            <Line x1="30" y1={tY} x2="280" y2={tY} stroke="#ef4444" strokeWidth="1" strokeDasharray="3,3" strokeOpacity="0.5" />
                            <SvgText x="280" y={tY - 3} fontSize="7" fill="#ef4444" opacity="0.8" textAnchor="end">{t.label}</SvgText>
                          </G>
                        );
                      }
                      return null;
                    })}
                    
                    <Polygon points={fillPointsString} fill={`url(#${gradientId})`} />
                    <Polyline points={pointsString} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
                    
                    {coords.length > 1 && (
                      <Circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3" fill={strokeColor} stroke="#1c1c1e" strokeWidth="1" />
                    )}
                  </Svg>
                </View>
                <View className="flex-row justify-between pl-8 pr-4 mt-1 opacity-50">
                  {timeLabels.map((time, i) => (
                    <Text key={i} className="text-[8px] font-mono" style={{ color: '#ffffff' }}>{time}</Text>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

function AIThinkingToggle({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!content) return null;
  return (
    <View className="w-full mb-3">
      <TouchableOpacity 
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center gap-2 rounded-full px-3 py-1.5 self-start"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      >
        <Feather name="cpu" size={12} color="#a0a0a0" />
        <Text className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Thought Process</Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#a0a0a0" />
      </TouchableOpacity>
      {expanded && (
        <Animated.View entering={FadeInUp} className="rounded-xl p-3 mt-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
          <Text className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{content}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const renderFormattedText = (text: string) => {
  if (!text) return null;
  const lines = text.split("\n");
  
  return lines.map((line, idx) => {
    const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ");
    const isH1 = line.trim().startsWith("# ");
    const isH2 = line.trim().startsWith("## ");
    const isH3 = line.trim().startsWith("### ");
    
    let cleanLine = line.trim();
    if (isBullet) cleanLine = cleanLine.substring(2);
    else if (isH1) cleanLine = cleanLine.substring(2);
    else if (isH2) cleanLine = cleanLine.substring(3);
    else if (isH3) cleanLine = cleanLine.substring(4);
    
    const parts = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;
    
    while ((match = boldRegex.exec(cleanLine)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<Text key={`text-${lastIndex}`} style={{ color: 'rgba(255,255,255,0.9)' }}>{cleanLine.substring(lastIndex, match.index)}</Text>);
      }
      parts.push(
        <Text key={`bold-${match.index}`} className="font-bold" style={{ color: '#ffffff' }}>
          {match[1]}
        </Text>
      );
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < cleanLine.length) {
      parts.push(<Text key={`text-end`} style={{ color: 'rgba(255,255,255,0.9)' }}>{cleanLine.substring(lastIndex)}</Text>);
    }
    
    if (isBullet) {
      return (
        <View key={idx} className="flex-row pl-2 mb-2 pr-4">
          <Text className="mr-2 mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>•</Text>
          <Text className="leading-6 text-[15px]" style={{ color: 'rgba(255,255,255,0.9)' }}>{parts}</Text>
        </View>
      );
    } else if (isH3) {
      return <Text key={idx} className="text-lg font-bold mt-4 mb-2" style={{ color: '#ffffff' }}>{parts}</Text>;
    } else if (isH2) {
      return <Text key={idx} className="text-xl font-bold mt-5 mb-3" style={{ color: '#ffffff' }}>{parts}</Text>;
    } else if (isH1) {
      return <Text key={idx} className="text-2xl font-extrabold mt-6 mb-4" style={{ color: '#ffffff' }}>{parts}</Text>;
    }
    
    if (cleanLine === "") return <View key={idx} style={{ height: 8 }} />;
    return <Text key={idx} className="leading-6 text-[15px] mb-2" style={{ color: 'rgba(255,255,255,0.9)' }}>{parts}</Text>;
  });
};

export default function AIAssistant() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef(Math.random().toString(36).substring(7));
  const activeEventSourceRef = useRef<EventSource | null>(null);
  const activeStreamStateRef = useRef({ assistantId: 0, finalText: "", thinkingText: "" });
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Initial welcome ping or check
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userText = text.trim();
    const userMsg = { id: Date.now(), sender: "user", text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const aiApiUrl = process.env.EXPO_PUBLIC_AI_API_URL || "http://10.0.2.2:8000";
      const assistantId = Date.now() + 1;
      const placeholderMsg = {
        id: assistantId,
        sender: "assistant",
        text: "",
        thinking: "",
        isStructured: true,
        userQuery: userText,
        weatherData: null,
        isStreaming: true,
        status: "Working…"
      };
      setMessages(prev => [...prev, placeholderMsg]);

      const streamUrl = `${aiApiUrl}/chat/stream?q=${encodeURIComponent(userText)}&session_id=${sessionIdRef.current}&provider=auto`;
      const es = new EventSource(streamUrl);
      activeEventSourceRef.current = es;

      let finalText = "";
      let thinkingText = "";
      let statusLine = "Working…";
      let detectedBackendLocation: any = null;
      let detectedBackendIsBasin = false;
      let detectedBackendIntent: any = null;
      activeStreamStateRef.current = { assistantId, finalText: "", thinkingText: "" };

      const updateAssistant = (patch: any) => {
        setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, ...patch } : m)));
      };

      const finish = async (thinking: string, final: string) => {
        es.close();
        thinkingText = thinking ?? thinkingText;
        finalText = final ?? finalText;

        const mappedBackendLoc = detectedBackendLocation ? detectCity(detectedBackendLocation, "") : null;
        const detected = mappedBackendLoc || detectedBackendLocation || detectCity(userText, finalText || "");
        
        let fetchedData = null;
        if (detected) {
          try {
            const nodeApiUrl = process.env.EXPO_PUBLIC_NODE_API_URL || "http://10.0.2.2:5000";
            let url = `${nodeApiUrl}/api/city/${encodeURIComponent(detected)}?full=true`;
            if (detectedBackendIntent === "river" && detectedBackendIsBasin) {
                url = `${nodeApiUrl}/api/rivers/${encodeURIComponent(detected)}?full=true`;
            }
            const res = await fetch(url);
            const json = await res.json();
            if (json.success && json.data) fetchedData = json.data;
          } catch (e) {
            console.error(e);
          }
        }

        updateAssistant({
          text: finalText || "Response unavailable.",
          thinking: thinkingText || "",
          weatherData: fetchedData,
          detectedIntent: detectedBackendIntent,
          isStreaming: false,
          status: ""
        });
        setIsLoading(false);
      };

      es.addEventListener("status", (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          statusLine = payload.content || "";
          updateAssistant({ status: statusLine });
        } catch (_) {}
      });

      es.addEventListener("thinking", (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          thinkingText = payload.content || "";
          updateAssistant({ thinking: thinkingText, status: thinkingText ? "Thinking…" : statusLine });
        } catch (_) {}
      });

      es.addEventListener("final_partial", (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          finalText = payload.content || "";
          updateAssistant({ text: finalText });
        } catch (_) {}
      });

      es.addEventListener("detected_location", (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.location) {
            detectedBackendLocation = payload.location;
            detectedBackendIsBasin = payload.is_basin || false;
          }
        } catch (_) {}
      });

      es.addEventListener("detected_intent", (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.intent) {
            detectedBackendIntent = payload.intent;
            updateAssistant({ detectedIntent: detectedBackendIntent });
          }
        } catch (_) {}
      });

      es.addEventListener("done", async (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          await finish(payload.thinking, payload.final);
        } catch (_) {
          await finish(thinkingText, finalText);
        }
        activeEventSourceRef.current = null;
      });

      es.addEventListener("error", (e: any) => {
        es.close();
        updateAssistant({ text: "Unable to connect to rainiX AI backend stream.", isStreaming: false });
        setIsLoading(false);
      });

    } catch (e) {
      setIsLoading(false);
    }
  };

  const stopStreaming = () => {
    if (activeEventSourceRef.current) {
      activeEventSourceRef.current.close();
      activeEventSourceRef.current = null;
    }
    setMessages(prev => prev.map(m => {
      if (m.id === activeStreamStateRef.current.assistantId) {
        return { ...m, isStreaming: false, text: activeStreamStateRef.current.finalText || "Stopped." };
      }
      return m;
    }));
    setIsLoading(false);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#0d0d0d' }}>
      {/* Premium Navbar */}
      <View className="flex-row items-center justify-between px-6 pt-14 pb-4 z-50" style={{ backgroundColor: 'rgba(13,13,13,0.8)', borderBottomWidth: 1, borderBottomColor: 'rgba(39,39,42,0.5)' }}>
        <TouchableOpacity className="flex-row items-center gap-2.5" onPress={() => router.push('/')}>
          <View className="w-10 h-10 items-center justify-center p-1.5 rounded-lg">
            <Svg viewBox="0 0 200 200" width="100%" height="100%">
              <Path d="M 72 142 A 25 25 0 0 1 78 98 A 33 33 0 0 1 138 102 A 25 25 0 0 1 144 142" stroke="#ffffff" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path d="M 108 108 C 108 108 126 138 126 150 C 126 160 118 168 108 168 C 98 168 90 160 90 150 C 90 138 108 108 108 108 Z" fill="#ffffff" />
              <Path d="M 128 40 Q 128 48 136 48 Q 128 48 128 56 Q 128 48 120 48 Q 128 48 128 40 Z" fill="#ffffff" />
              <Path d="M 145 49 Q 145 65 161 65 Q 145 65 145 81 Q 145 65 129 65 Q 145 65 145 49 Z" fill="#ffffff" />
              <Path d="M 158 75 Q 158 82 165 82 Q 158 82 158 89 Q 158 82 151 82 Q 158 82 158 75 Z" fill="#ffffff" />
            </Svg>
          </View>
          <Text className="font-bold text-lg tracking-wide font-poppins" style={{ color: '#ffffff' }}>rainiX AI</Text>
        </TouchableOpacity>
        <TouchableOpacity className="p-2 rounded-full bg-zinc-800/80">
          <Settings size={20} color="#a3a3a3" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-4 pt-6"
          contentContainerStyle={{ paddingBottom: 150, flexGrow: 1 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View className="flex-1 justify-center items-center mt-20">
              <View className="w-32 h-32 mb-8">
                <Svg viewBox="0 0 200 200" width="100%" height="100%">
                  <Path d="M 72 142 A 25 25 0 0 1 78 98 A 33 33 0 0 1 138 102 A 25 25 0 0 1 144 142" stroke="#ffffff" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  <Path d="M 108 108 C 108 108 126 138 126 150 C 126 160 118 168 108 168 C 98 168 90 160 90 150 C 90 138 108 108 108 108 Z" fill="#ffffff" />
                  <Path d="M 128 40 Q 128 48 136 48 Q 128 48 128 56 Q 128 48 120 48 Q 128 48 128 40 Z" fill="#ffffff" />
                  <Path d="M 145 49 Q 145 65 161 65 Q 145 65 145 81 Q 145 65 129 65 Q 145 65 145 49 Z" fill="#ffffff" />
                  <Path d="M 158 75 Q 158 82 165 82 Q 158 82 158 89 Q 158 82 151 82 Q 158 82 158 75 Z" fill="#ffffff" />
                </Svg>
              </View>
              <Text className="text-3xl mb-2" style={{ color: '#ffffff' }}>rainiX AI</Text>
              <Text className="text-center px-4 max-w-md mb-8 leading-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Your intelligent weather companion. Ask about current conditions, rain forecasts, or climate trends.
              </Text>
            </View>
          ) : (
            <View className="gap-8 pb-6">
              {messages.map((msg) => (
                <View key={msg.id} className={`w-full flex-row ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'user' ? (
                    <View className="rounded-3xl px-5 py-2.5 shadow-sm max-w-[85%]" style={{ backgroundColor: '#27272a' }}>
                      <Text className="text-[16px]" style={{ color: '#ffffff' }}>{msg.text}</Text>
                    </View>
                  ) : (
                    <View className="w-full pr-4 flex-col gap-3 items-start">
                      {msg.isStreaming && (
                         <View className="flex-row items-center gap-2 mb-2">
                           <ActivityIndicator size="small" color="#3b82f6" />
                           <Text className="text-xs italic" style={{ color: 'rgba(255,255,255,0.6)' }}>{msg.status || 'Thinking...'}</Text>
                         </View>
                      )}
                      
                      <AIThinkingToggle content={msg.thinking} />
                      
                      {renderFormattedText(msg.text)}
                      
                      {msg.weatherData && !msg.isStreaming && (
                        <View className="mt-2 w-full">
                          {(() => {
                            const intent = msg.detectedIntent;
                            const hasRivers = Array.isArray(msg.weatherData) ? msg.weatherData.length > 0 : msg.weatherData.rivers?.length > 0;
                            const hasWeather = Array.isArray(msg.weatherData) ? false : !!msg.weatherData.weather;
                            
                            if (intent === 'river' && hasRivers) return <AIRiverTelemetryCard data={msg.weatherData} />;
                            if (intent === 'weather' && hasWeather) return <AICurrentWeatherCard data={msg.weatherData} />;
                            
                            return (
                              <View>
                                {hasWeather && <AICurrentWeatherCard data={msg.weatherData} />}
                                {hasRivers && <AIRiverTelemetryCard data={msg.weatherData} />}
                              </View>
                            );
                          })()}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View className="px-4 py-4 w-full absolute bottom-0">
          <View className="w-full rounded-2xl flex-col shadow-lg p-3" style={{ minHeight: 120, backgroundColor: '#1a1a1a', borderColor: '#333333', borderWidth: 1 }}>
            <TextInput
              className="w-full text-[15px] p-0 m-0"
              placeholder="Ask anything about weather or river levels..."
              placeholderTextColor="#888"
              multiline
              value={inputValue}
              onChangeText={setInputValue}
              style={{ color: '#ffffff', minHeight: 40, maxHeight: 150, textAlignVertical: 'top' }}
            />
            
            <View className="flex-row items-center justify-between w-full mt-auto pt-2">
              <TouchableOpacity className="flex-row items-center gap-1 bg-transparent">
                <Text className="text-[12px] font-medium" style={{ color: '#737373' }}>Auto</Text>
                <ChevronUp size={12} color="#737373" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={isLoading ? stopStreaming : () => sendMessage(inputValue)}
                disabled={!isLoading && !inputValue.trim()}
                className="w-9 h-9 rounded-full flex items-center justify-center shadow-md"
                style={{ backgroundColor: (isLoading || inputValue.trim()) ? '#ffffff' : '#333333' }}
              >
                {isLoading ? (
                  <View className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#000000' }} />
                ) : (
                  <ArrowUp size={20} color={inputValue.trim() ? "black" : "#888"} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
