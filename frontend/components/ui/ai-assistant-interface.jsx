"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Mic,
  ArrowUp,
  Sparkles,
  FileText,
  Plus,
  CloudSun,
  Globe,
  AlertTriangle,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RefreshCw,
  MoreHorizontal,
  Paperclip,
  ChevronDown,
  ChevronRight,
  BrainCircuit,
  Settings,
  X,
  ChevronUp,
  Palette,
  Moon,
  Sun,
  Monitor
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIThinkingBlock from "./ai-thinking-block";
import { Loader } from "./loader";

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

const detectCity = (userText, assistantText) => {
  const combined = `${userText || ""} ${assistantText || ""}`.toLowerCase();
  
  const cleanUser = (userText || "").trim().toLowerCase();
  const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy", "yo", "hi there", "hello there"];
  if (greetings.includes(cleanUser) || cleanUser.length <= 3) {
    return null;
  }
  
  // ─── Known River Station Cities ───
  const knownCities = [
    "colombo", "kandy", "galle", "jaffna", "matara", "kurunegala", "ratnapura", 
    "trincomalee", "batticaloa", "anuradhapura", "badulla", "kegalle", "nuwara eliya", 
    "puttalam", "kalutara", "gampaha", "matale", "hambantota", "polonnaruwa", "monaragala", 
    "ampara", "vavuniya", "mannar", "kilinochchi", "mullaitivu", "kuruvita", "kuruwita",
    "kelaniya", "kaduwela", "hanwella", "mapitigama", "pugoda", "ruwanwella", "avissawella",
    "wellampitiya", "kolonnawa", "millakanda", "putupaula", "ayagama", "pelmadulla",
    "kalawana", "kahawaththa", "kahawatta", "elapatha", "bangama", "polothugama",
    "hulandawa", "warapitiya", "kekiriobada", "peradeniya", "gampola", "teldeniya",
    "katugastota", "chilaw", "ridibendiella", "sengaloya", "wanathawilluwa", "pahariya",
    "rambewa", "poonawa", "habarana", "wattala", "miriswatta"
  ];

  for (const city of knownCities) {
    if (combined.includes(city)) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }

  // ─── River name → City mappings (detected from AI's English response) ───
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

const getWeatherDetails = (code) => {
  if (code === 0) return { label: 'Sunny', icon: 'wb_sunny' };
  if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', icon: 'cloud_queue' };
  if (code === 45 || code === 48) return { label: 'Fog', icon: 'filter_drama' }; 
  if (code >= 51 && code <= 57) return { label: 'Light Rain', icon: 'grain' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'rainy' }; 
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'ac_unit' }; 
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: 'umbrella' };
  if (code >= 85 && code <= 86) return { label: 'Snow Showers', icon: 'weather_snowy' }; 
  if (code >= 95) return { label: 'Thunderstorms', icon: 'thunderstorm' };
  return { label: 'Cloudy', icon: 'cloud' };
};

function AICurrentWeatherCard({ data }) {
  if (!data || !data.weather) return null;
  const weather = data.weather.weather;
  const details = getWeatherDetails(weather.weatherCode);
  const temp = Math.round(weather.temperature);
  
  return (
    <div className="w-full max-w-md bg-[#f9f9fb]/90 dark:bg-[#121214]/90 backdrop-blur-md rounded-2xl p-5 border border-neutral-200/50 dark:border-zinc-800/70 shadow-md text-left text-gray-900 dark:text-neutral-100 mt-3 animate-fade-in-up">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-semibold text-lg leading-tight text-gray-900 dark:text-neutral-100">{data.weather.city || data.city}</h4>
          <span className="text-xs text-gray-500 dark:text-neutral-400 opacity-80 font-normal">{data.weather.country || 'Sri Lanka'}</span>
        </div>
        <span className="material-symbols-outlined text-3xl text-gray-700 dark:text-neutral-300">{details.icon}</span>
      </div>
      
      <div className="flex items-baseline gap-2.5 mb-3">
        <span className="text-4xl font-normal tracking-tight font-poppins text-gray-900 dark:text-neutral-100">{temp}°C</span>
        <span className="text-sm font-medium text-gray-600 dark:text-neutral-300">{details.label}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-neutral-200/50 dark:border-zinc-800/70 pt-3 text-xs md:text-sm font-normal">
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-neutral-400">
          <span className="material-symbols-outlined text-base text-gray-400 dark:text-neutral-500">thermostat</span>
          <span>Feels Like: {Math.round(weather.feelsLike)}°C</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-neutral-400">
          <span className="material-symbols-outlined text-base text-gray-400 dark:text-neutral-500">water_drop</span>
          <span>Humidity: {weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-neutral-400">
          <span className="material-symbols-outlined text-base text-gray-400 dark:text-neutral-500">air</span>
          <span>Wind: {weather.windSpeed} km/h</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-neutral-400">
          <span className="material-symbols-outlined text-base text-gray-400 dark:text-neutral-500">visibility</span>
          <span>Visibility: {(weather.visibility / 1000).toFixed(1)} km</span>
        </div>
      </div>
    </div>
  );
}

function AIHourlyForecastCard({ data }) {
  if (!data || !data.weather || !data.weather.weather || !data.weather.weather.hourly) return null;
  const hourly = data.weather.weather.hourly;
  
  return (
    <div className="w-full max-w-lg bg-[#f9f9fb]/90 dark:bg-[#121214]/90 backdrop-blur-md rounded-2xl p-4 border border-neutral-200/50 dark:border-zinc-800/70 shadow-md text-left text-gray-900 dark:text-neutral-100 mt-3 animate-fade-in-up">
      <h4 className="font-semibold text-sm text-gray-900 dark:text-neutral-100 mb-3 uppercase tracking-wider flex items-center gap-1.5 pl-1 opacity-90">
        <span className="material-symbols-outlined text-sm text-gray-600 dark:text-neutral-400">schedule</span>
        24-Hour Hourly Forecast
      </h4>
      <div className="flex overflow-x-auto gap-3.5 pb-2 scrollbar-thin pl-1">
        {hourly.map((h, idx) => {
          const details = getWeatherDetails(h.weatherCode);
          let timeLabel = "12:00";
          if (h.time && h.time.includes('T')) {
            timeLabel = h.time.split('T')[1].substring(0, 5);
          }
          return (
            <div key={idx} className="flex flex-col items-center gap-1.5 border-none rounded-xl py-2 px-1 min-w-[50px] flex-shrink-0 transition-transform hover:scale-[1.03]">
              <span className="text-xs font-normal text-gray-500 dark:text-neutral-400">{timeLabel}</span>
              <span className="material-symbols-outlined text-xl text-gray-700 dark:text-neutral-300">{details.icon}</span>
              <span className="text-sm font-medium">{Math.round(h.temperature)}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AIForecastDaysCard({ data, days = 14 }) {
  if (!data || !data.weather || !data.weather.weather || !data.weather.weather.forecast14Days) return null;
  
  const forecastList = data.weather.weather.forecast14Days.slice(0, days);
  
  return (
    <div className="w-full max-w-lg bg-[#f9f9fb]/90 dark:bg-[#121214]/90 backdrop-blur-md rounded-2xl p-4 border border-neutral-200/50 dark:border-zinc-800/70 shadow-md text-left text-gray-900 dark:text-neutral-100 mt-3 animate-fade-in-up">
      <h4 className="font-semibold text-sm text-gray-900 dark:text-neutral-100 mb-3 uppercase tracking-wider flex items-center gap-1.5 pl-1 opacity-90">
        <span className="material-symbols-outlined text-sm text-gray-600 dark:text-neutral-400">date_range</span>
        {forecastList.length}-Day Forecast
      </h4>
      <div className="flex overflow-x-auto gap-3.5 pb-2 scrollbar-thin pl-1">
        {forecastList.map((f, idx) => {
          const details = getWeatherDetails(f.weatherCode);
          const dateObj = new Date(f.date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const dateNum = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          
          return (
            <div key={idx} className="flex flex-col items-center gap-1.5 border-none rounded-xl py-2 px-2 min-w-[65px] flex-shrink-0 transition-transform hover:scale-[1.03]">
              <span className="text-xs font-normal text-gray-500 dark:text-neutral-400">{dayName}</span>
              <span className="material-symbols-outlined text-xl text-gray-700 dark:text-neutral-300">{details.icon}</span>
              <div className="flex flex-col items-center mt-1">
                <span className="text-sm font-medium">{Math.round(f.high)}°</span>
                <span className="text-xs font-normal text-gray-500 dark:text-neutral-500">{Math.round(f.low)}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function AIRiverTelemetryCard({ data }) {
  const [predictions, setPredictions] = React.useState({});

  React.useEffect(() => {
    const rivers = Array.isArray(data) ? data : data?.rivers;
    if (!rivers) return;
    
    rivers.forEach(async (river) => {
      const rid = river.id || river.name;
      if (predictions[rid] !== undefined) return;
      
      try {
        const payload = {
          river_name: river.name,
          historical_data: river.historicalData || [],
          weather_data: data
        };
        const aiApiUrl = (process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:7860").replace(/\/$/, "");
        const res = await fetch(`${aiApiUrl}/api/predict/river`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.predicted_level !== null && json.predicted_level !== undefined) {
          setPredictions(prev => ({...prev, [rid]: json.predicted_level}));
        }
      } catch (e) {
        console.error("Prediction fetch failed:", e);
      }
    });
  }, [data]);

  const rivers = Array.isArray(data) ? data : data?.rivers;
  if (!rivers || rivers.length === 0) return null;
  
  return (
    <div className="w-full flex flex-row gap-4 mt-3 animate-fade-in-up overflow-x-auto pb-2 snap-x hide-scrollbar">
      {rivers.map((river, idx) => {
        const hasHistory = Array.isArray(river.historicalData) && river.historicalData.length > 0;
        let currentLevel = river.currentLevel;
        if (currentLevel === undefined && hasHistory) {
          currentLevel = river.historicalData[river.historicalData.length - 1].y;
        }
        const isAlert = river.status === "ALERT";
        
        let pointsString = "";
        let fillPointsString = "";
        let minVal = 0;
        let maxVal = 10;
        let minX = 0;
        let maxX = 1;
        let predictedLevel = undefined;
        let coords = [];
        
        const thresholds = [];
        if (river.levels?.minor) thresholds.push({ label: 'Minor', val: Number(river.levels.minor) });
        if (river.levels?.alert) thresholds.push({ label: 'Alert', val: Number(river.levels.alert) });
        if (river.levels?.major) thresholds.push({ label: 'Major', val: Number(river.levels.major) });
        if (river.levels?.critical) thresholds.push({ label: 'Critical', val: Number(river.levels.critical) });
        
        if (hasHistory) {
          const yValues = river.historicalData.map(p => p.y);
          const xValues = river.historicalData.map((_, i) => i);
          minVal = Math.min(...yValues);
          maxVal = Math.max(...yValues);
          
          // Expand maxVal and minVal to include ALL thresholds so threshold lines are always visible
          if (thresholds.length > 0) {
            const maxT = Math.max(...thresholds.map(t => t.val));
            const minT = Math.min(...thresholds.map(t => t.val));
            if (maxT > maxVal) maxVal = maxT;
            if (minT < minVal) minVal = minT;
          }
          
          const diff = maxVal - minVal;
          maxVal = maxVal + (diff > 0 ? diff * 0.15 : 1);
          minVal = Math.max(0, minVal - (diff > 0 ? diff * 0.15 : 1));
          
          // Check if we have a prediction for the text stats
          minX = 0;
          maxX = xValues.length - 1 || 1;
          
          const rid = river.id || river.name;
          predictedLevel = predictions[rid];
          
          
          // X shifts: 40 to 350 to leave room for Y labels
          coords = river.historicalData.map((p, i) => {
            const xSVG = ((i - minX) / (maxX - minX)) * 310 + 40;
            const ySVG = 110 - ((p.y - minVal) / (maxVal - minVal)) * 90;
            return { x: xSVG, y: ySVG, val: p.y };
          });
          
          pointsString = coords.map(c => `${c.x},${c.y}`).join(" ");
          
          // Only fill the actual historical data
          const lastHistoricalCoord = coords[coords.length - 1];
          fillPointsString = `40,110 ${pointsString} ${lastHistoricalCoord.x},110`;
        }
        
        let statusBg = "bg-neutral-100 dark:bg-zinc-800/80 text-gray-900 dark:text-neutral-100 border-neutral-200 dark:border-zinc-700/60";
        let strokeColor = "currentColor";
        let gradientId = `gradient-${river.id || idx}`;
        
        const yValues = hasHistory ? river.historicalData.map(p => p.y) : [];
        const maxValFloat = yValues.length > 0 ? Math.max(...yValues) : 0;
        const avgLevel = yValues.length > 0 ? yValues.reduce((a, b) => a + b, 0) / yValues.length : 0;
        const lowerName = river.name.toLowerCase();
        const alertLimitVal = (river.levels && river.levels.alert !== undefined && river.levels.alert !== null)
          ? Number(river.levels.alert)
          : null;

        // Trend should reflect the movement over a short window (e.g. last 5 mins)
        let trendText = "Stable";
        if (hasHistory && river.historicalData.length >= 2) {
          const lastVal = Number(river.historicalData[river.historicalData.length - 1].y);
          // Compare with data from ~5 mins ago (or 5 points ago depending on resolution)
          const compareIndex = Math.max(0, river.historicalData.length - 5);
          const prevVal = Number(river.historicalData[compareIndex].y);
          const diff = lastVal - prevVal;
          
          // Lowered threshold because a 5-minute window is very small
          if (diff > 0.001) trendText = "Rising";
          else if (diff < -0.001) trendText = "Falling";
        }
        
        // Time labels (5 evenly spaced across 24h)
        const timeLabels = [];
        const nowMs = Date.now();
        for (let i = 0; i <= 4; i++) {
          const t = new Date(nowMs - (24 - i * 6) * 3600 * 1000);
          timeLabels.push(t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }

        return (
          <div key={idx} className="w-full min-w-[320px] max-w-md flex-shrink-0 snap-center bg-[#f9f9fb]/90 dark:bg-[#121214]/90 backdrop-blur-md rounded-2xl p-5 border border-neutral-200/50 dark:border-zinc-800/70 shadow-md text-left text-gray-900 dark:text-neutral-100 animate-fade-in-up">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold text-lg leading-tight text-gray-900 dark:text-neutral-100">
                  {river.name.replace(/^(Kelani Ganga|Kalu Ganga|Nilwala Ganga|Gin Ganga)\s*-\s*/i, "")}
                </h4>
                <span className="text-xs text-gray-500 dark:text-neutral-400 opacity-80 font-normal">
                  {lowerName.includes("kelani") ? "Kelani Ganga Basin" : lowerName.includes("kalu") ? "Kalu Ganga Basin" : lowerName.includes("nilwala") ? "Nilwala Ganga Basin" : "Active River Station"}
                </span>
              </div>
              <span className="material-symbols-outlined text-3xl text-gray-900 dark:text-neutral-100">
                waves
              </span>
            </div>
            
            <div className="flex items-baseline gap-2.5 mb-3">
              <span className="text-4xl font-normal tracking-tight font-poppins text-gray-900 dark:text-neutral-100">
                {currentLevel != null ? `${currentLevel.toFixed(2)}m` : 'N/A'}
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                {river.status === "ALERT" ? "High Alert" : "Safe"}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-neutral-200/50 dark:border-zinc-800/70 pt-3 text-xs md:text-sm font-medium">
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-neutral-400">
                <span className="material-symbols-outlined text-base text-gray-400 dark:text-neutral-500">online_prediction</span>
                <span className="text-gray-900 dark:text-neutral-100 font-semibold">3H Predict: {predictedLevel !== undefined ? `${predictedLevel.toFixed(2)}m` : '...'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-neutral-400">
                <span className="material-symbols-outlined text-base text-gray-400 dark:text-neutral-500">trending_up</span>
                <span>Peak 24h: {maxValFloat.toFixed(2)}m</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-neutral-400">
                <span className="material-symbols-outlined text-base text-gray-400 dark:text-neutral-500">analytics</span>
                <span>Avg Level: {avgLevel.toFixed(2)}m</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-neutral-400">
                <span className="material-symbols-outlined text-base text-gray-400 dark:text-neutral-500">show_chart</span>
                <span>Trend: {trendText}</span>
              </div>
            </div>
            
            {hasHistory ? (
              <div className="relative mt-2 border-t border-neutral-200/40 dark:border-zinc-800/40 pt-3">
                <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500 block mb-2 flex items-center gap-1.5 pl-1">
                  <span className="material-symbols-outlined text-xs">timeline</span>
                  24-Hour Telemetry Level History
                </span>
                <svg viewBox="0 0 360 120" className="w-full overflow-visible">
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity="0.45" />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Y-axis Labels & Grid */}
                  <text x="32" y="24" fontSize="9" fill="currentColor" opacity="0.5" textAnchor="end">{maxVal.toFixed(1)}m</text>
                  <line x1="40" y1="20" x2="350" y2="20" stroke="currentColor" strokeWidth="1" strokeOpacity="0.08" />
                  
                  <text x="32" y="69" fontSize="9" fill="currentColor" opacity="0.5" textAnchor="end">{((maxVal + minVal) / 2).toFixed(1)}m</text>
                  <line x1="40" y1="65" x2="350" y2="65" stroke="currentColor" strokeWidth="1" strokeOpacity="0.08" strokeDasharray="3,3" />
                  
                  <text x="32" y="114" fontSize="9" fill="currentColor" opacity="0.5" textAnchor="end">{minVal.toFixed(1)}m</text>
                  <line x1="40" y1="110" x2="350" y2="110" stroke="currentColor" strokeWidth="1" strokeOpacity="0.08" />
                  
                  {/* Threshold Lines */}
                  {thresholds.map((t, i) => {
                    if (t.val >= minVal && t.val <= maxVal) {
                      const tY = 110 - ((t.val - minVal) / (maxVal - minVal)) * 90;
                      return (
                        <g key={`t-${i}`}>
                          <line x1="40" y1={tY} x2="350" y2={tY} stroke="currentColor" strokeWidth="1" strokeDasharray="4,4" strokeOpacity="0.35" />
                          <text x="350" y={tY - 4} fontSize="8" fill="currentColor" opacity="0.6" textAnchor="end">{t.label} ({t.val.toFixed(1)}m)</text>
                        </g>
                      );
                    }
                    return null;
                  })}
                  
                  <polygon points={fillPointsString} fill={`url(#${gradientId})`} />
                  
                  <polyline
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointsString}
                    className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                  />
                  
                  {river.historicalData.length > 1 && (
                    <>
                      <circle cx="40" cy={110 - ((river.historicalData[0].y - minVal) / (maxVal - minVal)) * 90} r="3.5" fill={strokeColor} />
                      <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="4.5" fill={strokeColor} stroke="white" strokeWidth="1.5" />
                    </>
                  )}
                </svg>
                
                {/* X-axis Time Labels */}
                <div className="flex justify-between text-[9px] opacity-60 mt-2 font-mono text-gray-500 dark:text-neutral-400 pl-[35px]">
                  {timeLabels.map((time, i) => (
                    <span key={i}>{time}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs opacity-50 font-medium bg-neutral-200/20 dark:bg-zinc-800/20 rounded-xl border border-neutral-300/10 dark:border-zinc-700/10">
                Level telemetry details unavailable
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AIAssistantInterface() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [modelProvider, setModelProvider] = useState("auto");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const activeEventSourceRef = useRef(null);
  const activeStreamStateRef = useRef({ assistantId: null, userText: "", finalText: "", thinkingText: "" });

  useEffect(() => {
    const savedTheme = localStorage.getItem("rainix_theme") || "dark";
    setTheme(savedTheme);
    applyTheme(savedTheme);

    const savedProvider = localStorage.getItem("rainix_model_provider") || "auto";
    setModelProvider(savedProvider);
  }, []);

  const handleModelProviderChange = (newProvider) => {
    setModelProvider(newProvider);
    localStorage.setItem("rainix_model_provider", newProvider);
  };

  const applyTheme = (targetTheme) => {
    const root = window.document.documentElement;
    if (targetTheme === "dark") {
      root.classList.add("dark");
    } else if (targetTheme === "light") {
      root.classList.remove("dark");
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (systemPrefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("rainix_theme", newTheme);
    applyTheme(newTheme);
  };

  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const sessionIdRef = useRef(null);

  if (!sessionIdRef.current) {
    sessionIdRef.current = Math.random().toString(36).substring(7);
  }

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const getAssistantResponse = (query) => {
    const q = query.toLowerCase();
    if (q.includes("weather") || q.includes("london") || q.includes("temperature")) {
      return "The current weather in London is 18°C with light rain. Humidity is at 74% and winds are blowing from the North-East at 12 km/h. 🌧️";
    }
    if (q.includes("rain") || q.includes("precipitation") || q.includes("umbrella")) {
      return "Yes, there is a 65% chance of light showers later this evening. I'd recommend carrying an umbrella if you're heading out! ☔";
    }
    if (q.includes("snow") || q.includes("winter") || q.includes("cold")) {
      return "Current satellite mapping indicates no active snowfall in your area, but temperatures are expected to drop near freezing by midnight. ❄️";
    }
    return "Hey! 😄 What's up? I'm rainiX AI, your intelligent weather and climate assistant. Ask me anything about current atmospheric conditions or forecasts!";
  };

  const sendMessage = async (text) => {
    if (text.trim() && !isLoading) {
      const userText = text.trim();
      const userMsg = {
        id: Date.now(),
        sender: "user",
        text: userText,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsLoading(true);

      try {
        // FastAPI server URL from environment variables or fallback
        const aiApiUrl = (process.env.NEXT_PUBLIC_AI_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        // Add a streaming assistant placeholder message immediately
        const assistantId = Date.now() + 1;
        const placeholderMsg = {
          id: assistantId,
          sender: "assistant",
          text: "",
          thinking: "",
          isStructured: true,
          feedback: null,
          userQuery: userText,
          weatherData: null,
          isStreaming: true,
          status: "Working…"
        };
        setMessages((prev) => [...prev, placeholderMsg]);

        const streamUrl = `${aiApiUrl}/chat/stream?q=${encodeURIComponent(userText)}&session_id=${sessionIdRef.current}&provider=${modelProvider}`;
        const es = new EventSource(streamUrl);
        activeEventSourceRef.current = es;

        let finalText = "";
        let thinkingText = "";
        let statusLine = "Working…";
        let detectedBackendLocation = null;
        let detectedBackendIsBasin = false;
        let detectedBackendIntent = null;
        activeStreamStateRef.current = { assistantId, userText, finalText: "", thinkingText: "" };

        const updateAssistant = (patch) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m))
          );
        };

        const finish = async (thinking, final) => {
          es.close();
          thinkingText = thinking ?? thinkingText;
          finalText = final ?? finalText;

          const mappedBackendLoc = detectedBackendLocation ? detectCity(detectedBackendLocation, "") : null;
          const detected = mappedBackendLoc || detectedBackendLocation || detectCity(userText, finalText || "");
          
          let fetchedData = null;
          if (detected) {
            try {
              const nodeApiUrl = (process.env.NEXT_PUBLIC_NODE_API_URL || "http://localhost:5000").replace(/\/$/, "");
              let url = `${nodeApiUrl}/api/city/${encodeURIComponent(detected)}`;
              
              if (detectedBackendIntent === "river" && detectedBackendIsBasin) {
                  url = `${nodeApiUrl}/api/rivers/${encodeURIComponent(detected)}`;
              }
              
              const res = await fetch(url);
              const json = await res.json();
              if (json.success && json.data) fetchedData = json.data;
            } catch (fetchErr) {
              console.error("Failed to fetch weather cards for AI context:", fetchErr);
            }
          }

          const resolvedText =
            (finalText && finalText.trim())
              ? finalText
              : "AI response unavailable right now (model/provider error). Please check API keys / quota and try again.";

          updateAssistant({
            text: resolvedText,
            thinking: thinkingText || "",
            weatherData: fetchedData,
            detectedIntent: detectedBackendIntent,
            isStreaming: false,
            status: ""
          });
          
          setIsLoading(false);
        };

        es.addEventListener("meta", (e) => {
          // optional: could display provider info later
        });

        es.addEventListener("status", (e) => {
          try {
            const payload = JSON.parse(e.data);
            statusLine = payload.content || "";
            updateAssistant({ status: statusLine });
          } catch (_) {}
        });

        es.addEventListener("thinking", (e) => {
          try {
            const payload = JSON.parse(e.data);
            thinkingText = payload.content || "";
            activeStreamStateRef.current.thinkingText = thinkingText;
            updateAssistant({ thinking: thinkingText, status: thinkingText ? "Thinking…" : statusLine });
          } catch (_) {}
        });

        es.addEventListener("final_partial", (e) => {
          try {
            const payload = JSON.parse(e.data);
            finalText = payload.content || "";
            activeStreamStateRef.current.finalText = finalText;
            updateAssistant({ text: finalText });
          } catch (_) {}
        });

        es.addEventListener("detected_location", (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.location) {
              detectedBackendLocation = payload.location;
              detectedBackendIsBasin = payload.is_basin || false;
            }
          } catch (_) {}
        });

        es.addEventListener("detected_intent", (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.intent) {
              detectedBackendIntent = payload.intent;
              updateAssistant({ detectedIntent: detectedBackendIntent });
            }
          } catch (_) {}
        });

        es.addEventListener("done", async (e) => {
          try {
            const payload = JSON.parse(e.data);
            await finish(payload.thinking, payload.final);
          } catch (_) {
            await finish(thinkingText, finalText);
          }
          activeEventSourceRef.current = null;
        });

        es.addEventListener("error", async (e) => {
          es.close();
          activeEventSourceRef.current = null;
          updateAssistant({
            text: "Unable to connect to rainiX AI backend stream.",
            isStreaming: false
          });
          setIsLoading(false);
          throw new Error("Failed to connect to FastAPI backend stream");
        });
      } catch (error) {
        console.error("Error communicating with AI/main.py:", error);
        
        // Friendly developer alert/fallback
        let fallbackText = getAssistantResponse(userText);
        let fetchedData = null;
        const detected = detectCity(userText, fallbackText);
        if (detected) {
          try {
            const nodeApiUrl = (process.env.NEXT_PUBLIC_NODE_API_URL || "http://localhost:5000").replace(/\/$/, "");
            const res = await fetch(`${nodeApiUrl}/api/city/${encodeURIComponent(detected)}`);
            const json = await res.json();
            if (json.success && json.data) {
              fetchedData = json.data;
            }
          } catch (fetchErr) {
            console.error("Failed to fetch fallback weather cards:", fetchErr);
          }
        }

        const fallbackMsg = {
          id: Date.now() + 1,
          sender: "assistant",
          isError: true,
          fallbackText: fallbackText,
          feedback: null,
          userQuery: userText,
          weatherData: fetchedData
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        setIsLoading(false);
      }
    }
  };

  const stopStreaming = () => {
    const es = activeEventSourceRef.current;
    if (es) {
      try {
        es.close();
      } catch (_) {}
      activeEventSourceRef.current = null;
    }

    const { assistantId, finalText, thinkingText } = activeStreamStateRef.current || {};
    if (assistantId) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          const resolvedText = (finalText && finalText.trim()) ? finalText : "Stopped.";
          return {
            ...m,
            text: resolvedText,
            thinking: thinkingText || m.thinking || "",
            isStreaming: false,
            status: ""
          };
        })
      );
    }

    setIsLoading(false);
  };

  const handleSendMessage = () => {
    sendMessage(inputValue);
  };

  const router = useRouter();
  const { q } = router.query;
  const initialSendTriggeredRef = useRef(false);

  useEffect(() => {
    if (router.isReady && q && !initialSendTriggeredRef.current) {
      initialSendTriggeredRef.current = true;
      sendMessage(q);
    }
  }, [router.isReady, q]);

  const handleCopyText = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  const handleFeedback = async (msgId, type) => {
    // Find the message to toggle feedback locally
    let targetFeedback = null;
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId) {
          targetFeedback = msg.feedback === type ? null : type;
          return { ...msg, feedback: targetFeedback };
        }
        return msg;
      })
    );

    // Asynchronously update the LangGraph state thread history with human feedback
    if (targetFeedback) {
      try {
        const aiApiUrl = (process.env.NEXT_PUBLIC_AI_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        await fetch(`${aiApiUrl}/feedback?session_id=${sessionIdRef.current}&type=${targetFeedback}`);
      } catch (err) {
        console.error("Failed to post human feedback to backend:", err);
      }
    }
  };

  const handleRegenerate = (userQuery) => {
    if (userQuery) {
      sendMessage(userQuery);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Reusable markdown formatter helper
  const renderFormattedText = (text) => {
    if (!text) return null;
    
    const lines = text.split("\n");
    
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ");
      let cleanLine = line;
      if (isBullet) {
        cleanLine = line.trim().substring(2);
      }
      
      const parts = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      let lastIndex = 0;
      
      while ((match = boldRegex.exec(cleanLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(cleanLine.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-bold text-gray-950 dark:text-neutral-50">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < cleanLine.length) {
        parts.push(cleanLine.substring(lastIndex));
      }
      
      if (isBullet) {
        return (
          <li key={idx} className="list-disc ml-5 pl-1 mb-1 text-gray-900 dark:text-neutral-200">
            {parts}
          </li>
        );
      }
      
      return (
        <p key={idx} className="mb-2 min-h-[1.2rem]">
          {parts}
        </p>
      );
    });
  };

  // Reusable search / input bar component
  const renderInputBar = () => {
    return (
      <motion.div
        layoutId="chatGPTInputBar"
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="ai-input-bar-pill w-full bg-neutral-100 dark:bg-[#2f2f2f] rounded-full flex items-center justify-between shadow-sm border border-transparent dark:border-zinc-800 transition-colors"
      >
        {/* Input Element */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask anything"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          className="flex-1 min-w-0 text-gray-800 dark:text-neutral-100 text-base outline-none placeholder:text-gray-400 dark:placeholder:text-neutral-400 border-0 focus:ring-0 p-0 bg-transparent"
        />

        {/* Right-side utility and submit button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Custom Model Selector */}
          <div className="relative flex items-center group mr-1">
            <button
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-1 bg-transparent text-[12px] font-medium text-gray-500 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-neutral-200 transition-colors focus:outline-none"
            >
              {modelProvider === "auto" ? "Auto" : 
               modelProvider === "google" ? "Gemini 3.5 Flash" :
               modelProvider === "gem3" ? "Gemini 3.1 Lite" :
               modelProvider === "gemma" ? "Gemma 4 (31B)" : "Auto"}
              <ChevronUp className="w-3 h-3" />
            </button>
            
            <AnimatePresence>
              {isModelMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full right-0 mb-3 w-40 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-zinc-800 rounded-[12px] shadow-lg z-50 overflow-hidden flex flex-col py-1"
                  >
                    {[
                      { id: "auto", label: "Auto" },
                      { id: "google", label: "Gemini 3.5 Flash" },
                      { id: "gem3", label: "Gemini 3.1 Lite" },
                      { id: "gemma", label: "Gemma 4 (31B)" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          handleModelProviderChange(opt.id);
                          setIsModelMenuOpen(false);
                        }}
                        className={`text-left px-3 py-2 text-xs transition-colors ${
                          modelProvider === opt.id
                            ? "bg-neutral-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold"
                            : "text-gray-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          
          
          {/* White circle audio action button (ChatGPT wave representation) */}
          <button
            onClick={isLoading ? stopStreaming : handleSendMessage}
            disabled={!isLoading && !inputValue.trim()}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              (isLoading || inputValue.trim())
                ? "bg-white dark:bg-white text-black dark:text-black shadow-md hover:scale-105 active:scale-95 cursor-pointer"
                : "bg-white dark:bg-white text-black dark:text-black opacity-90 cursor-default"
            }`}
            title={isLoading ? "Stop" : "Send message"}
          >
            {isLoading ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <rect x="7" y="7" width="10" height="10" rx="2" />
              </svg>
            ) : (
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            )}
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-neutral-100 transition-colors duration-300">
      <style dangerouslySetInnerHTML={{ __html: `
        .responsive-ai-input-landing {
          width: 100% !important;
          max-width: 320px !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .responsive-ai-input-chat {
          width: 100% !important;
          max-width: 320px !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .ai-input-bar-pill {
          padding-left: 1rem !important;
          padding-right: 0.5rem !important;
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
        }
        @media (min-width: 375px) {
          .responsive-ai-input-landing, .responsive-ai-input-chat {
            max-width: 340px !important;
          }
        }
        @media (min-width: 640px) {
          .responsive-ai-input-landing, .responsive-ai-input-chat {
            max-width: 384px !important;
          }
          .ai-input-bar-pill {
            padding-left: 1.5rem !important;
            padding-right: 1rem !important;
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }
        }
        @media (min-width: 768px) {
          .responsive-ai-input-landing {
            max-width: 512px !important;
          }
          .responsive-ai-input-chat {
            max-width: 768px !important;
          }
        }
      `}} />
      
      {/* Premium Glassmorphic Navbar */}
      <nav className="w-full h-16 border-b border-neutral-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-[#0d0d0d]/70 backdrop-blur-md flex items-center justify-between px-6 z-50 sticky top-0">
        {/* Left Side: Brand Logo and Title */}
        <button 
          onClick={() => router.push("/")} 
          className="flex items-center gap-2.5 group cursor-pointer hover:opacity-90 transition-opacity"
        >
          {/* Custom Weather and Galaxy logo */}
          <div className="w-10 h-10 rounded-lg flex items-center justify-center p-1.5 transition-transform group-hover:scale-105">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 200 200"
                width="100%"
                height="100%"
                className="w-full h-full"
              >
                <g clipPath="url(#cs_clip_1_ellipse-12)">
                  <mask
                    id="cs_mask_1_ellipse-12"
                    style={{ maskType: "alpha" }}
                    width="200"
                    height="200"
                    x="0"
                    y="0"
                    maskUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 72 142 A 25 25 0 0 1 78 98 A 33 33 0 0 1 138 102 A 25 25 0 0 1 144 142"
                      stroke="#fff"
                      strokeWidth="15"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <path
                      d="M 108 108 C 108 108 126 138 126 150 C 126 160 118 168 108 168 C 98 168 90 160 90 150 C 90 138 108 108 108 108 Z"
                      fill="#fff"
                    />
                    <path
                      d="M 128 40 Q 128 48 136 48 Q 128 48 128 56 Q 128 48 120 48 Q 128 48 128 40 Z"
                      fill="#fff"
                    />
                    <path
                      d="M 145 49 Q 145 65 161 65 Q 145 65 145 81 Q 145 65 129 65 Q 145 65 145 49 Z"
                      fill="#fff"
                    />
                    <path
                      d="M 158 75 Q 158 82 165 82 Q 158 82 158 89 Q 158 82 151 82 Q 158 82 158 75 Z"
                      fill="#fff"
                    />
                  </mask>
                  <g mask="url(#cs_mask_1_ellipse-12)">
                    {/* Light mode: Blue animated gradient */}
                    <g className="dark:hidden">
                      <path fill="#fff" d="M200 0H0v200h200V0z"></path>
                      <path
                        fill="#0066FF"
                        fillOpacity="0.33"
                        d="M200 0H0v200h200V0z"
                      ></path>
                      <g
                        filter="url(#filter0_f_844_2811)"
                        className="animate-gradient"
                      >
                        <path fill="#0066FF" d="M110 32H18v68h92V32z"></path>
                        <path fill="#0044FF" d="M188-24H15v98h173v-98z"></path>
                        <path fill="#0099FF" d="M175 70H5v156h170V70z"></path>
                        <path fill="#00CCFF" d="M230 51H100v103h130V51z"></path>
                      </g>
                    </g>
                    {/* Dark mode: Solid white logo */}
                    <rect width="200" height="200" fill="#ffffff" className="hidden dark:block" />
                  </g>
                </g>
                <defs>
                  <filter
                    id="filter0_f_844_2811"
                    width="385"
                    height="410"
                    x="-75"
                    y="-104"
                    colorInterpolationFilters="sRGB"
                    filterUnits="userSpaceOnUse"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                    <feBlend
                      in="SourceGraphic"
                      in2="BackgroundImageFix"
                      result="shape"
                    ></feBlend>
                    <feGaussianBlur
                      result="effect1_foregroundBlur_844_2811"
                      stdDeviation="40"
                    ></feGaussianBlur>
                  </filter>
                  <clipPath id="cs_clip_1_ellipse-12">
                    <path fill="#fff" d="M0 0H200V200H0z"></path>
                  </clipPath>
                </defs>
                <g
                  style={{ mixBlendMode: "overlay" }}
                  mask="url(#cs_mask_1_ellipse-12)"
                >
                  <path
                    fill="gray"
                    stroke="transparent"
                    d="M200 0H0v200h200V0z"
                    filter="url(#cs_noise_1_ellipse-12)"
                  ></path>
                </g>
                <defs>
                  <filter
                    id="cs_noise_1_ellipse-12"
                    width="100%"
                    height="100%"
                    x="0%"
                    y="0%"
                    filterUnits="objectBoundingBox"
                  >
                    <feTurbulence
                      baseFrequency="0.6"
                      numOctaves="5"
                      result="out1"
                      seed="4"
                    ></feTurbulence>
                    <feComposite
                      in="out1"
                      in2="SourceGraphic"
                      operator="in"
                      result="out2"
                    ></feComposite>
                    <feBlend
                      in="SourceGraphic"
                      in2="out2"
                      mode="overlay"
                      result="out3"
                    ></feBlend>
                  </filter>
                </defs>
              </svg>
          </div>
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-neutral-400 font-poppins">
            rainiX AI
          </span>
        </button>

        {/* Right Side: Settings Toggle */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-zinc-800/80 rounded-full transition-all cursor-pointer"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </nav>
      
      {/* Scrollable Chat Area / Welcome Screen */}
      <div className="flex-1 overflow-y-auto px-4 md:px-0 py-6 flex flex-col items-center">
        {messages.length === 0 ? (
          // Welcome Screen when no messages exist (With centered layout)
          <div className="w-full max-w-3xl flex-1 flex flex-col items-center justify-center my-auto">
            {/* Logo */}
            <div className="mb-8 w-32 h-32 relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 200 200"
                width="100%"
                height="100%"
                className="w-full h-full"
              >
                <g clipPath="url(#cs_clip_1_ellipse-12)">
                  <mask
                    id="cs_mask_1_ellipse-12"
                    style={{ maskType: "alpha" }}
                    width="200"
                    height="200"
                    x="0"
                    y="0"
                    maskUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 72 142 A 25 25 0 0 1 78 98 A 33 33 0 0 1 138 102 A 25 25 0 0 1 144 142"
                      stroke="#fff"
                      strokeWidth="15"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <path
                      d="M 108 108 C 108 108 126 138 126 150 C 126 160 118 168 108 168 C 98 168 90 160 90 150 C 90 138 108 108 108 108 Z"
                      fill="#fff"
                    />
                    <path
                      d="M 128 40 Q 128 48 136 48 Q 128 48 128 56 Q 128 48 120 48 Q 128 48 128 40 Z"
                      fill="#fff"
                    />
                    <path
                      d="M 145 49 Q 145 65 161 65 Q 145 65 145 81 Q 145 65 129 65 Q 145 65 145 49 Z"
                      fill="#fff"
                    />
                    <path
                      d="M 158 75 Q 158 82 165 82 Q 158 82 158 89 Q 158 82 151 82 Q 158 82 158 75 Z"
                      fill="#fff"
                    />
                  </mask>
                  <g mask="url(#cs_mask_1_ellipse-12)">
                    {/* Light mode: Blue animated gradient */}
                    <g className="dark:hidden">
                      <path fill="#fff" d="M200 0H0v200h200V0z"></path>
                      <path
                        fill="#0066FF"
                        fillOpacity="0.33"
                        d="M200 0H0v200h200V0z"
                      ></path>
                      <g
                        filter="url(#filter0_f_844_2811)"
                        className="animate-gradient"
                      >
                        <path fill="#0066FF" d="M110 32H18v68h92V32z"></path>
                        <path fill="#0044FF" d="M188-24H15v98h173v-98z"></path>
                        <path fill="#0099FF" d="M175 70H5v156h170V70z"></path>
                        <path fill="#00CCFF" d="M230 51H100v103h130V51z"></path>
                      </g>
                    </g>
                    {/* Dark mode: Solid white logo */}
                    <rect width="200" height="200" fill="#ffffff" className="hidden dark:block" />
                  </g>
                </g>
                <defs>
                  <filter
                    id="filter0_f_844_2811"
                    width="385"
                    height="410"
                    x="-75"
                    y="-104"
                    colorInterpolationFilters="sRGB"
                    filterUnits="userSpaceOnUse"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                    <feBlend
                      in="SourceGraphic"
                      in2="BackgroundImageFix"
                      result="shape"
                    ></feBlend>
                    <feGaussianBlur
                      result="effect1_foregroundBlur_844_2811"
                      stdDeviation="40"
                    ></feGaussianBlur>
                  </filter>
                  <clipPath id="cs_clip_1_ellipse-12">
                    <path fill="#fff" d="M0 0H200V200H0z"></path>
                  </clipPath>
                </defs>
                <g
                  style={{ mixBlendMode: "overlay" }}
                  mask="url(#cs_mask_1_ellipse-12)"
                >
                  <path
                    fill="gray"
                    stroke="transparent"
                    d="M200 0H0v200h200V0z"
                    filter="url(#cs_noise_1_ellipse-12)"
                  ></path>
                </g>
                <defs>
                  <filter
                    id="cs_noise_1_ellipse-12"
                    width="100%"
                    height="100%"
                    x="0%"
                    y="0%"
                    filterUnits="objectBoundingBox"
                  >
                    <feTurbulence
                      baseFrequency="0.6"
                      numOctaves="5"
                      result="out1"
                      seed="4"
                    ></feTurbulence>
                    <feComposite
                      in="out1"
                      in2="SourceGraphic"
                      operator="in"
                      result="out2"
                    ></feComposite>
                    <feBlend
                      in="SourceGraphic"
                      in2="out2"
                      mode="overlay"
                      result="out3"
                    ></feBlend>
                  </filter>
                </defs>
              </svg>
            </div>

            {/* Welcome message */}
            <div className="text-center mb-8 w-full max-w-2xl px-4">
              <h1 className="text-3xl  mb-2">
                Welcome to rainiX AI
              </h1>
              <p className="text-gray-500 dark:text-neutral-400 max-w-md mx-auto mb-8">
                Your intelligent weather companion. Ask about current conditions, rain forecasts, or climate trends.
              </p>
              
              {/* Centered Input Bar in main landing UI */}
              <div className="responsive-ai-input-landing">
                {renderInputBar()}
              </div>
            </div>
          </div>
        ) : (
          // Conversation View
          <div className="w-full max-w-3xl flex flex-col gap-8 pb-32">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`w-full flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.sender === "user" ? (
                    // User message bubble with Edit button
                    <div className="flex flex-col items-end gap-1.5 max-w-[75%] group">
                      <div className="bg-neutral-100 dark:bg-zinc-800 text-gray-900 dark:text-neutral-100 rounded-3xl px-5 py-2.5 text-base shadow-sm break-words w-auto">
                        {msg.text}
                      </div>
                      
                      {/* Edit Button - Visible on mobile, hover-only on desktop */}
                      <button 
                        onClick={() => {
                          setInputValue(msg.text);
                          if (inputRef.current) inputRef.current.focus();
                        }}
                        className="flex items-center justify-center p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors mr-2 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        title="Edit prompt"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                    </div>
                  ) : msg.isError ? (
                    // Beautiful Error / Fallback developer console card
                    <div className="w-full max-w-2xl flex flex-col gap-4 p-4 rounded-xl border border-amber-200 dark:border-amber-950/40 bg-amber-50/50 dark:bg-amber-950/10 text-gray-800 dark:text-neutral-200 shadow-sm">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-semibold">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Unable to connect to rainiX AI backend</span>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Please make sure your Python FastAPI server is running. Activate your virtual environment and start the server:
                      </p>
                      <div className="bg-neutral-100 dark:bg-zinc-900/80 p-3.5 rounded-lg text-xs font-mono text-gray-800 dark:text-neutral-300 select-all leading-normal border border-neutral-200 dark:border-zinc-800">
                        <span className="text-gray-400"># Navigate to AI folder and activate venv</span>{"\n"}
                        cd AI{"\n"}
                        .\venv\Scripts\Activate.ps1{"\n"}
                        {"\n"}
                        <span className="text-gray-400"># Start your FastAPI server</span>{"\n"}
                        uvicorn main:app --reload
                      </div>
                      <div className="border-t border-amber-200 dark:border-zinc-800/60 pt-3 mt-1">
                        <span className="text-xs text-amber-600 dark:text-amber-500 uppercase tracking-wider font-bold block mb-1">Fallback Response</span>
                        <div className="text-base text-gray-900 dark:text-neutral-100 leading-relaxed">{renderFormattedText(msg.fallbackText)}</div>
                      </div>
                      {msg.weatherData && (
                        <div className="w-full mt-2 flex flex-row flex-wrap items-start gap-4">
                          {(() => {
                            const intent = msg.detectedIntent;
                            const query = (msg.userQuery || "").toLowerCase();
                            const hasRivers = Array.isArray(msg.weatherData) ? msg.weatherData.length > 0 : msg.weatherData.rivers?.length > 0;
                            const hasWeather = Array.isArray(msg.weatherData) ? false : !!msg.weatherData.weather;
                            
                            // If intent is purely river, show ONLY river
                            if (intent === "river" && hasRivers) {
                              return <AIRiverTelemetryCard data={msg.weatherData} />;
                            }
                            
                            // If intent is weather, figure out which card
                            if (intent === "weather" && hasWeather) {
                              const askDays = query.match(/(?:forecast|dawas|days|day)\s*(\d+)/i) || query.includes("14");
                              const askHourly = query.includes("24") || query.includes("hourly") || query.includes("peya");
                              
                              if (askDays) {
                                const daysCount = query.match(/(\d+)/)?.[1] || 14;
                                return <AIForecastDaysCard data={msg.weatherData} days={Number(daysCount)} />;
                              } else if (askHourly) {
                                return <AIHourlyForecastCard data={msg.weatherData} />;
                              } else {
                                return <AICurrentWeatherCard data={msg.weatherData} />;
                              }
                            }
                            
                            // Fallback if no intent or mixed
                            return (
                              <>
                                {hasWeather && <AICurrentWeatherCard data={msg.weatherData} />}
                                {hasRivers && <AIRiverTelemetryCard data={msg.weatherData} />}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Assistant response (Plain text with action row)
                    <div className="w-full flex flex-col items-start gap-3">
                      {msg.isStreaming && (
                        <div className="flex items-center justify-start gap-2 mb-1">
                          <p
                            className="bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] dark:bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-sm font-normal text-transparent"
                            style={{ animation: "shimmer 5s linear infinite" }}
                          >
                            {msg.status || "rainiX AI is thinking"}
                          </p>
                          <style jsx>{`
                            @keyframes shimmer {
                              0% { background-position: 200% 0; }
                              100% { background-position: -200% 0; }
                            }
                          `}</style>
                        </div>
                      )}
                      {msg.isStructured && msg.thinking && (
                        <AIThinkingToggle content={msg.thinking} defaultExpanded={false} />
                      )}
                      <div className="text-gray-900 dark:text-neutral-100 text-base max-w-2xl leading-relaxed">
                        {renderFormattedText(msg.text)}
                      </div>
                      
                      {msg.weatherData && !msg.isStreaming && (
                        <div className="w-full mt-2 flex flex-row flex-wrap items-start gap-4 animate-fade-in-up">
                          {(() => {
                            const intent = msg.detectedIntent;
                            const query = (msg.userQuery || "").toLowerCase();
                            const hasRivers = Array.isArray(msg.weatherData) ? msg.weatherData.length > 0 : msg.weatherData.rivers?.length > 0;
                            const hasWeather = Array.isArray(msg.weatherData) ? false : !!msg.weatherData.weather;
                            
                            const isExplicitWeather = query.includes("weather") || query.includes("kalanaguna") || query.includes("dawas") || query.includes("dina") || query.includes("forecast") || query.includes("wesi") || query.includes("rain");
                            const isExplicitRiver = query.includes("river") || query.includes("ganga") || query.includes("wathura") || query.includes("water") || query.includes("level") || query.includes("mattama");
                            
                            let showWeather = false;
                            let showRiver = false;

                            if (isExplicitWeather && isExplicitRiver) {
                                showWeather = hasWeather;
                                showRiver = hasRivers;
                            } else if (isExplicitWeather) {
                                showWeather = hasWeather;
                                showRiver = false;
                            } else if (isExplicitRiver) {
                                showWeather = false;
                                showRiver = hasRivers;
                            } else {
                                // Default to intent if no explicit words
                                showWeather = hasWeather;
                                showRiver = hasRivers;
                            }
                            
                            return (
                              <>
                                {showWeather && (() => {
                                  const askDays = query.match(/(?:forecast|dawas|dina|days|day)\s*(\d+)/i) || query.includes("14") || query.includes("dina 5");
                                  const askHourly = query.includes("24") || query.includes("hourly") || query.includes("peya");
                                  
                                  if (askDays) {
                                    const daysCount = query.match(/(\d+)/)?.[1] || 14;
                                    return <AIForecastDaysCard data={msg.weatherData} days={Number(daysCount)} />;
                                  } else if (askHourly) {
                                    return <AIHourlyForecastCard data={msg.weatherData} />;
                                  } else {
                                    return <AICurrentWeatherCard data={msg.weatherData} />;
                                  }
                                })()}
                                {showRiver && <AIRiverTelemetryCard data={msg.weatherData} />}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      
                      {/* Action Row */}
                      {!msg.isStreaming && (
                        <div className="flex items-center gap-3.5 mt-2 text-gray-400 dark:text-neutral-500 animate-fade-in-up">
                          <button 
                            onClick={() => handleCopyText(msg.text)} 
                            className="p-1 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors cursor-pointer" 
                            title="Copy text"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleFeedback(msg.id, 'good')} 
                            className={`p-1 transition-colors cursor-pointer ${
                              msg.feedback === 'good' 
                                ? 'text-emerald-500 dark:text-emerald-400' 
                                : 'hover:text-gray-600 dark:hover:text-neutral-300'
                            }`} 
                            title="Good response"
                          >
                            <ThumbsUp className="w-4 h-4" style={{ fill: msg.feedback === 'good' ? 'currentColor' : 'none' }} />
                          </button>
                          <button 
                            onClick={() => handleFeedback(msg.id, 'bad')} 
                            className={`p-1 transition-colors cursor-pointer ${
                              msg.feedback === 'bad' 
                                ? 'text-rose-500 dark:text-rose-400' 
                                : 'hover:text-gray-600 dark:hover:text-neutral-300'
                            }`} 
                            title="Bad response"
                          >
                            <ThumbsDown className="w-4 h-4" style={{ fill: msg.feedback === 'bad' ? 'currentColor' : 'none' }} />
                          </button>
                          <button 
                            onClick={() => handleRegenerate(msg.userQuery)} 
                            className="p-1 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors cursor-pointer" 
                            title="Regenerate"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input container at the bottom (only shown when chat is active) */}
      {messages.length > 0 && (
        <div className="w-full flex justify-center py-4 bg-gradient-to-t from-white dark:from-[#0d0d0d] via-white dark:via-[#0d0d0d] to-transparent sticky bottom-0 z-40">
          <div className="responsive-ai-input-chat px-4 flex flex-col gap-2">
            {renderInputBar()}
          </div>
        </div>
      )}
      
      {/* Settings Modal (Overlay) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="bg-white dark:bg-[#161616] border border-neutral-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl z-50 relative overflow-visible"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900 dark:text-neutral-100">
                  <Settings className="w-5 h-5 text-gray-500" />
                  Settings
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200 transition-colors p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Appearance Selector */}
              <div className="flex items-center justify-between mt-6 border-t border-neutral-200/50 dark:border-zinc-800/40 pt-5">
                <span className="text-xs uppercase tracking-wider font-semibold text-gray-400 dark:text-neutral-500 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-gray-500 dark:text-neutral-400" />
                  Appearance
                </span>
                
                <div className="relative">
                  <button
                    onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                    className="flex items-center justify-between gap-2 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-colors focus:outline-none w-28"
                  >
                    <div className="flex items-center gap-1.5">
                      {theme === "light" ? <Sun className="w-3.5 h-3.5" /> : 
                       theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : 
                       <Monitor className="w-3.5 h-3.5" />}
                      <span className="capitalize">{theme}</span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  </button>

                  <AnimatePresence>
                    {isThemeMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsThemeMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-zinc-800 rounded-[12px] shadow-lg z-50 overflow-hidden flex flex-col py-1"
                        >
                          {[
                            { id: "light", label: "Light", icon: Sun },
                            { id: "dark", label: "Dark", icon: Moon },
                            { id: "system", label: "System", icon: Monitor },
                          ].map((opt) => {
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  handleThemeChange(opt.id);
                                  setIsThemeMenuOpen(false);
                                }}
                                className={`flex items-center gap-2 text-left px-3 py-2 text-xs transition-colors font-medium ${
                                  theme === opt.id
                                    ? "bg-neutral-100 dark:bg-zinc-800 text-gray-900 dark:text-white"
                                    : "text-gray-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-zinc-800/50"
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {opt.label}
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function AIThinkingToggle({ content, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="w-full flex flex-col items-start mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors bg-neutral-100 dark:bg-zinc-800/80 hover:bg-neutral-200 dark:hover:bg-zinc-700 px-3.5 py-1.5 rounded-full shadow-sm cursor-pointer"
      >
       
        <span>{isExpanded ? "Hide thought process" : "View thought process"}</span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden w-full mt-2"
          >
            <AIThinkingBlock content={content} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveThinkingToggle() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-start mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors bg-neutral-100 dark:bg-zinc-800/80 hover:bg-neutral-200 dark:hover:bg-zinc-700 px-3.5 py-1.5 rounded-full shadow-sm cursor-pointer"
      >
        <Loader size={"xs"} className="text-neutral-500 dark:text-neutral-300" />
        <span>Thinking...</span>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
          {timer}s
        </span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden w-full mt-2"
          >
            <AIThinkingBlock content={"Waiting for live reasoning…"} isLive={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
