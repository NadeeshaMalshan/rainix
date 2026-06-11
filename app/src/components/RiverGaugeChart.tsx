import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle as SvgCircle } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';

export default function RiverGaugeChart({ activeRiver }: { activeRiver: any }) {
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [chartLayoutWidth, setChartLayoutWidth] = useState(0);

  if (!activeRiver) return null;

  const chartArr = activeRiver.chart || activeRiver.historicalData || activeRiver.history;
  if (!chartArr || chartArr.length === 0) return null;

  const alertVal = activeRiver?.alertLevels?.find((x:any) => x.name === 'alert')?.value || activeRiver?.levels?.alert || '--';
  const minorVal = activeRiver?.alertLevels?.find((x:any) => x.name === 'minor')?.value || activeRiver?.levels?.minor || '--';
  const majorVal = activeRiver?.alertLevels?.find((x:any) => x.name === 'major')?.value || activeRiver?.levels?.major || '--';

  let currentRiverLevel: any = '--';
  if (activeRiver.currentLevel !== null && activeRiver.currentLevel !== undefined) {
    currentRiverLevel = activeRiver.currentLevel;
  } else {
    const lastPoint = chartArr[chartArr.length - 1];
    if (lastPoint && (lastPoint.y !== undefined || lastPoint.value !== undefined || lastPoint.level !== undefined)) {
      currentRiverLevel = lastPoint.y ?? lastPoint.value ?? lastPoint.level;
    }
  }

  let minRiverLevel = 0;
  let maxRiverLevel = 0;
  const values = chartArr.map((d:any) => d.y ?? d.value ?? d.level);
  if (values.length > 0) {
    minRiverLevel = Math.min(...values);
    maxRiverLevel = Math.max(...values);
  }

  let trendIcon: any = null;
  if (values.length > 1) {
    const currentNum = parseFloat(currentRiverLevel as string);
    const prevNum = parseFloat(values[values.length - 2] as string);
    if (!isNaN(currentNum) && !isNaN(prevNum)) {
      if (currentNum > prevNum) trendIcon = 'arrow-upward';
      else if (currentNum < prevNum) trendIcon = 'arrow-downward';
    }
  }

  const chartHeight = 160;
  const chartWidth = 1000;
  let pathD = '';
  let areaD = '';
  let activePoints: any[] = [];
  let yMaxChart = 10;
  let yMinChart = 0;

  const times = chartArr.map((d:any) => {
    let tVal = d.t ?? d.x ?? d.time ?? d.timestamp;
    if (typeof tVal === 'string') {
      return new Date(tVal.substring(0, 19)).getTime();
    }
    if (typeof tVal === 'number') {
      return tVal - 19800000;
    }
    return tVal;
  });

  const thresholds = [parseFloat(majorVal), parseFloat(minorVal), parseFloat(alertVal)].filter(v => !isNaN(v) && v > 0);
  const maxNeeded = Math.max(12, maxRiverLevel * 1.1, ...thresholds);
  yMaxChart = Math.ceil(maxNeeded / 2) * 2;

  const minT = Math.min(...times);
  const maxT = Math.max(...times);

  activePoints = chartArr.map((d:any, i:number) => {
    const v = values[i];
    const t = times[i];
    const xPos = times.length > 1 ? ((t - minT) / (maxT - minT)) * chartWidth : chartWidth / 2;
    const yPos = chartHeight - (((v - yMinChart) / (yMaxChart - yMinChart)) * chartHeight);
    return { x: xPos, y: yPos, value: v, time: t };
  });

  if (activePoints.length > 0) {
    pathD = `M ${activePoints[0].x} ${activePoints[0].y} `;
    for (let i = 1; i < activePoints.length; i++) {
      const prev = activePoints[i - 1];
      const curr = activePoints[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      pathD += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y} `;
    }
    areaD = `${pathD} L ${activePoints[activePoints.length - 1].x} ${chartHeight} L ${activePoints[0].x} ${chartHeight} Z`;
  }

  const getYPosForValue = (val:any) => {
    if (val === '--' || isNaN(parseFloat(val))) return null;
    const v = parseFloat(val);
    if (v > yMaxChart || v < yMinChart) return null;
    return chartHeight - (((v - yMinChart) / (yMaxChart - yMinChart)) * chartHeight);
  };

  const alertY = getYPosForValue(alertVal);
  const minorY = getYPosForValue(minorVal);
  const majorY = getYPosForValue(majorVal);

  return (
    <View className="w-full mt-2">
      <View className="bg-white/10 rounded-3xl p-6 mb-4 h-96 overflow-hidden relative">
        <View className="flex-row justify-between w-full mb-6 z-20 flex-wrap">
          <View className="flex-col w-[60%]">
            <Text className="text-xs opacity-80 uppercase tracking-widest font-normal text-white">Nearest River Station</Text>
            <Text className="text-xl font-light tracking-tight mt-1 text-white">
              {activeRiver.basin && activeRiver.name && activeRiver.basin !== activeRiver.name
                ? `${activeRiver.basin} (${activeRiver.name})`
                : (activeRiver.originalName && activeRiver.city && activeRiver.originalName !== activeRiver.city 
                  ? `${activeRiver.originalName} (${activeRiver.city})` 
                  : (activeRiver.name || activeRiver.station))}
            </Text>
          </View>
          <View className="flex-col items-end w-[40%]">
            <View className="flex-row items-center gap-1">
              <Text className="text-4xl font-light tracking-tighter text-white">
                {typeof currentRiverLevel === 'number' ? currentRiverLevel.toFixed(2) : currentRiverLevel}
              </Text>
              <View className="flex-col justify-end pb-1">
                <Text className="text-lg font-medium opacity-90 text-white">m</Text>
                {trendIcon && <MaterialIcons name={trendIcon} size={18} color="white" />}
              </View>
            </View>
            <View className="flex-row gap-2 mt-1 opacity-70">
              <Text className="text-[10px] text-white">Min: {parseFloat(minRiverLevel as any).toFixed(2)}m</Text>
              <Text className="text-[10px] text-white">Max: {parseFloat(maxRiverLevel as any).toFixed(2)}m</Text>
            </View>
          </View>
        </View>

        <View className="flex-1 w-full min-h-[200px] relative z-20">
          <View className="absolute inset-0 flex-col justify-between pb-1" pointerEvents="none">
            {Array.from({ length: (yMaxChart - yMinChart) / 2 + 1 }).map((_, i) => (
              <Text key={i} className="text-[9px] font-semibold text-white/40">
                {((yMaxChart - yMinChart) - i * 2)}m
              </Text>
            ))}
          </View>

          <View 
            className="w-full h-full absolute inset-0 pl-6 pt-1"
            onLayout={(e) => setChartLayoutWidth(e.nativeEvent.layout.width)}
            onTouchStart={(e) => {
              if (chartLayoutWidth <= 24 || activePoints.length === 0) return;
              const fraction = (e.nativeEvent.locationX - 24) / (chartLayoutWidth - 24);
              let closest = activePoints[0];
              let minDiff = Math.abs((closest.x / chartWidth) - fraction);
              for (let i = 1; i < activePoints.length; i++) {
                const diff = Math.abs((activePoints[i].x / chartWidth) - fraction);
                if (diff < minDiff) {
                  minDiff = diff;
                  closest = activePoints[i];
                }
              }
              setSelectedPoint(closest);
            }}
            onTouchMove={(e) => {
              if (chartLayoutWidth <= 24 || activePoints.length === 0) return;
              const fraction = (e.nativeEvent.locationX - 24) / (chartLayoutWidth - 24);
              let closest = activePoints[0];
              let minDiff = Math.abs((closest.x / chartWidth) - fraction);
              for (let i = 1; i < activePoints.length; i++) {
                const diff = Math.abs((activePoints[i].x / chartWidth) - fraction);
                if (diff < minDiff) {
                  minDiff = diff;
                  closest = activePoints[i];
                }
              }
              setSelectedPoint(closest);
            }}
          >
            <Svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" pointerEvents="none">
              <Defs>
                <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#3A82F6" stopOpacity="0.4" />
                  <Stop offset="100%" stopColor="#3A82F6" stopOpacity="0.0" />
                </LinearGradient>
              </Defs>
              {majorY !== null && <Line x1="0" y1={majorY} x2={chartWidth} y2={majorY} stroke="#eff5ff" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="5,5" />}
              {minorY !== null && <Line x1="0" y1={minorY} x2={chartWidth} y2={minorY} stroke="#eff5ff" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="5,5" />}
              {alertY !== null && <Line x1="0" y1={alertY} x2={chartWidth} y2={alertY} stroke="#eff5ff" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="5,5" />}
              
              {areaD && <Path d={areaD} fill="url(#areaGradient)" />}
              {pathD && <Path d={pathD} fill="none" stroke="#b3d0ff" strokeWidth="4" strokeOpacity="0.7" />}
              
              {activePoints.map((p, i) => (
                <React.Fragment key={i}>
                  <SvgCircle cx={p.x} cy={p.y} r={i === activePoints.length - 1 ? "6" : "3"} fill={selectedPoint === p ? "#60a5fa" : "#fff"} opacity={i === activePoints.length - 1 || selectedPoint === p ? "1" : "0.5"} />
                  <SvgCircle cx={p.x} cy={p.y} r="20" fill="transparent" onPress={() => setSelectedPoint(selectedPoint === p ? null : p)} />
                </React.Fragment>
              ))}
            </Svg>

            <View className="absolute inset-0 pointer-events-none z-10 pl-6">
              {majorY !== null && (
                <Text className="absolute right-0 text-[8px] text-[#eff5ff] opacity-80" style={{ top: `${(majorY / chartHeight) * 100}%`, marginTop: -10 }}>
                  MAJOR ({majorVal}m)
                </Text>
              )}
              {minorY !== null && (
                <Text className="absolute right-0 text-[8px] text-[#eff5ff] opacity-80" style={{ top: `${(minorY / chartHeight) * 100}%`, marginTop: -10 }}>
                  MINOR ({minorVal}m)
                </Text>
              )}
              {alertY !== null && (
                <Text className="absolute right-0 text-[8px] text-[#eff5ff] opacity-80" style={{ top: `${(alertY / chartHeight) * 100}%`, marginTop: -10 }}>
                  ALERT ({alertVal}m)
                </Text>
              )}
            </View>

            {/* Tooltip Overlay */}
            <View className="absolute inset-0 pointer-events-none z-30 pl-6 pt-1">
              {selectedPoint && (() => {
                const fraction = selectedPoint.x / chartWidth;
                let boxTranslateX = -40;
                if (fraction < 0.15) boxTranslateX = -10;
                else if (fraction > 0.85) boxTranslateX = -70;

                return (
                  <View
                    className="absolute z-30"
                    style={{
                      left: `${fraction * 100}%`,
                      top: `${(selectedPoint.y / chartHeight) * 100}%`,
                    }}
                  >
                    <View 
                      className="absolute bottom-[10px] bg-[#0f172a]/95 px-3 py-1.5 rounded-lg border border-blue-400/30 shadow-lg items-center min-w-[80px]"
                      style={{ transform: [{ translateX: boxTranslateX }] }}
                    >
                      <Text className="text-white text-xs font-bold">{(typeof selectedPoint.value === 'number' ? selectedPoint.value.toFixed(2) : selectedPoint.value)}m</Text>
                      <Text className="text-white/70 text-[9px]">{new Date(selectedPoint.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View 
                      className="absolute bottom-[4px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-blue-400/30"
                      style={{ transform: [{ translateX: -6 }] }}
                    />
                  </View>
                );
              })()}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
