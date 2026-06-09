import React, { useState, useEffect } from 'react';

const RiverGaugeChart = ({ activeRiver }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const riverNameStr = `${activeRiver?.basin || ''} ${activeRiver?.name || ''} ${activeRiver?.originalName || ''} ${activeRiver?.city || ''}`.toLowerCase();
  const isKaluGanga = riverNameStr.includes("kalu") && riverNameStr.includes("ratnapura");

  useEffect(() => {
    if (!activeRiver || !isKaluGanga) return;
    const chartArr = activeRiver.chart || activeRiver.historicalData;
    if (!chartArr || chartArr.length === 0) return;

    const fetchPrediction = async () => {
      setIsPredicting(true);
      try {
        const payload = {
          river_name: `Kalu Ganga - Ratnapura`,
          historical_data: chartArr.map(d => ({ y: d.y !== undefined ? d.y : d.value })),
          weather_data: {}
        };
        // Using localhost for now since the new backend is running locally
        const res = await fetch('http://localhost:8000/api/predict/river', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data && data.predicted_level !== undefined && data.predicted_level !== null) {
          setPrediction(data.predicted_level);
        }
      } catch (err) {
        console.error("Failed to fetch AI prediction", err);
      } finally {
        setIsPredicting(false);
      }
    };
    
    fetchPrediction();
  }, [activeRiver]);

  if (!activeRiver) return null;

  const alertVal = activeRiver?.alertLevels?.find(x => x.name === 'alert')?.value || activeRiver?.levels?.alert || '--';
  const minorVal = activeRiver?.alertLevels?.find(x => x.name === 'minor')?.value || activeRiver?.levels?.minor || '--';
  const majorVal = activeRiver?.alertLevels?.find(x => x.name === 'major')?.value || activeRiver?.levels?.major || '--';

  let currentRiverLevel = '--';
  if (activeRiver.currentLevel !== null && activeRiver.currentLevel !== undefined) {
    currentRiverLevel = activeRiver.currentLevel;
  } else {
    const chartArr = activeRiver.chart || activeRiver.historicalData;
    if (chartArr && chartArr.length > 0) {
      const lastPoint = chartArr[chartArr.length - 1];
      if (lastPoint && lastPoint.y !== null && lastPoint.y !== undefined) {
        currentRiverLevel = lastPoint.y;
      } else if (lastPoint && lastPoint.value !== null && lastPoint.value !== undefined) {
        currentRiverLevel = lastPoint.value;
      }
    }
  }

  let minRiverLevel = '--';
  let maxRiverLevel = '--';
  let chartData = [];
  const chartArr = activeRiver.chart || activeRiver.historicalData;
  if (chartArr && chartArr.length > 0) {
    chartData = chartArr.filter(d => (d.y !== null && d.y !== undefined) || (d.value !== null && d.value !== undefined));
    if (chartData.length > 0) {
      const values = chartData.map(d => d.y !== undefined ? d.y : d.value);
      minRiverLevel = Math.min(...values);
      maxRiverLevel = Math.max(...values);
    }
  }

  let previousRiverLevel = null;
  let trendIcon = null;

  if (chartData.length > 1) {
    const prevPoint = chartData[chartData.length - 2];
    previousRiverLevel = prevPoint.y !== undefined ? prevPoint.y : prevPoint.value;
    
    const currentNum = parseFloat(currentRiverLevel);
    const prevNum = parseFloat(previousRiverLevel);
    
    if (!isNaN(currentNum) && !isNaN(prevNum)) {
      if (currentNum > prevNum) {
         trendIcon = 'arrow_upward';
      } else if (currentNum < prevNum) {
         trendIcon = 'arrow_downward';
      }
    }
  }

  // SVG Chart Calculation
  const chartHeight = 160;
  const chartWidth = 1000; // Virtual coordinate system
  let pathD = '';
  let areaD = '';
  let activePoints = [];
  let yMaxChart = 10; // Default fallback
  let yMinChart = 0;

  if (chartData.length > 0) {
    const values = chartData.map(d => d.y !== undefined ? d.y : d.value);
    const times = chartData.map(d => {
      let tVal = d.t !== undefined ? d.t : (d.x !== undefined ? d.x : d.time);
      if (typeof tVal === 'string') {
        tVal = tVal.substring(0, 19);
        return new Date(tVal).getTime();
      } else if (typeof tVal === 'number') {
        // If it's a numeric epoch, the API incorrectly treated local time as UTC. 
        // We subtract 5.5 hours (19800000 ms) to correct the epoch.
        return tVal - 19800000;
      }
      return tVal;
    });
    
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    
    // Determine bounds, including thresholds if available
    const thresholds = [
      parseFloat(majorVal),
      parseFloat(minorVal),
      parseFloat(alertVal),
    ].filter(v => !isNaN(v) && v > 0);
    
    const maxNeeded = Math.max(12, maxV * 1.1, ...thresholds);
    yMaxChart = Math.ceil(maxNeeded / 2) * 2;
    yMinChart = 0;

    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    
    activePoints = chartData.map((d, i) => {
      const v = d.y !== undefined ? d.y : d.value;
      let tVal = d.t !== undefined ? d.t : (d.x !== undefined ? d.x : d.time);
      let t = tVal;
      if (typeof tVal === 'string') {
        tVal = tVal.substring(0, 19);
        t = new Date(tVal).getTime();
      } else if (typeof tVal === 'number') {
        t = tVal - 19800000;
      }
      const xPos = times.length > 1 ? ((t - minT) / (maxT - minT)) * chartWidth : chartWidth / 2;
      const yPos = chartHeight - (((v - yMinChart) / (yMaxChart - yMinChart)) * chartHeight);
      return { x: xPos, y: yPos, value: v, time: t };
    });

    if (activePoints.length > 0) {
      pathD = `M ${activePoints[0].x} ${activePoints[0].y} `;
      for (let i = 1; i < activePoints.length; i++) {
        const prev = activePoints[i - 1];
        const curr = activePoints[i];
        // Smooth curve using cubic bezier
        const cp1x = prev.x + (curr.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = curr.x - (curr.x - prev.x) / 2;
        const cp2y = curr.y;
        pathD += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y} `;
      }
      areaD = `${pathD} L ${activePoints[activePoints.length - 1].x} ${chartHeight} L ${activePoints[0].x} ${chartHeight} Z`;
    }
  }

  const getYPosForValue = (val) => {
    if (val === '--' || isNaN(val)) return null;
    const v = parseFloat(val);
    if (v > yMaxChart || v < yMinChart) return null;
    return chartHeight - (((v - yMinChart) / (yMaxChart - yMinChart)) * chartHeight);
  };

  const alertY = getYPosForValue(alertVal);
  const minorY = getYPosForValue(minorVal);
  const majorY = getYPosForValue(majorVal);

  return (
    <div className="w-full max-w-[1600px] w-[95vw] mx-auto mt-6 px-2 md:px-6">
      <div className="deep-frosted-pill animate-fade-in-up rounded-3xl p-6 shadow-glass relative flex flex-col h-full overflow-hidden" style={{ animationDelay: '0.8s' }}>
        
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between w-full mb-8 relative z-20">
          <div className="flex flex-col text-white">
            <span className="text-sm md:text-lg opacity-80 uppercase tracking-widest font-normal">Nearest River Station</span>
            <span className="text-2xl md:text-5xl font-light tracking-tight mt-1">
              {activeRiver.basin && activeRiver.name && activeRiver.basin !== activeRiver.name
                ? `${activeRiver.basin} (${activeRiver.name})`
                : (activeRiver.originalName && activeRiver.city && activeRiver.originalName !== activeRiver.city 
                  ? `${activeRiver.originalName} (${activeRiver.city})` 
                  : activeRiver.name)}
            </span>
          </div>

          <div className="flex flex-col items-start md:items-end mt-4 md:mt-0 text-white">
            <div className="flex items-center gap-2">
              <span className="text-4xl md:text-6xl font-light tracking-tighter">{currentRiverLevel}</span>
              <div className="flex flex-col justify-end pb-1 md:pb-2">
                <span className="text-lg md:text-xl font-medium opacity-90">m</span>
                {trendIcon && (
                  <span className="material-symbols-outlined text-xl md:text-2xl drop-shadow-md">
                    {trendIcon}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-1 opacity-70 text-xs md:text-sm font-normal">
              <span>Min: {parseFloat(minRiverLevel).toFixed(2)}m</span>
              <span>Max: {parseFloat(maxRiverLevel).toFixed(2)}m</span>
            </div>
            {isKaluGanga && (prediction !== null || isPredicting) && (
              <div className="flex items-center gap-1 mt-1 text-xs md:text-sm font-medium text-[#eff5ff] w-fit transition-all">
                {isPredicting ? (
                  <div className="h-4 w-36 bg-white/20 animate-pulse rounded-md"></div>
                ) : (
                  <>
                    <span className="opacity-80">After 30min: ~{prediction.toFixed(2)}m</span>
                    {prediction > parseFloat(currentRiverLevel) + 0.01 && <span className="material-symbols-outlined text-[16px]">arrow_upward</span>}
                    {prediction < parseFloat(currentRiverLevel) - 0.01 && <span className="material-symbols-outlined text-[16px]">arrow_downward</span>}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 w-full min-h-[250px] relative z-20 flex flex-col">
          <div className="flex-1 relative mb-6">
            
            {hoveredPoint && (
              <div 
                className="absolute z-30 transform -translate-x-1/2 -translate-y-full pb-3 pointer-events-none transition-all duration-100 ease-out"
                style={{ 
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: `${(hoveredPoint.y / chartHeight) * 100}%`
                }}
              >
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-2 text-center shadow-xl">
                  <div className="text-white font-bold text-sm md:text-base">{hoveredPoint.value.toFixed(2)}m</div>
                  <div className="text-white/60 text-[10px] md:text-xs">
                    {new Date(hoveredPoint.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/20"></div>
              </div>
            )}

            <div className="absolute inset-0 flex">
              <div className="absolute top-0 left-0 bottom-0 flex flex-col justify-between text-[10px] md:text-xs font-semibold text-white/40 pointer-events-none pb-1">
                {Array.from({ length: (yMaxChart - yMinChart) / 2 + 1 }).map((_, i) => (
                  <span key={i}>{((yMaxChart - yMinChart) - i * 2)}m</span>
                ))}
              </div>
            </div>

            <div className="w-full h-[200px] md:h-[250px] relative">
              <svg 
                width="100%" 
                height="100%" 
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                preserveAspectRatio="none" 
                className="absolute inset-0"
                onMouseMove={(e) => {
                  if (!activePoints.length) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const scaleX = chartWidth / rect.width;
                  const mouseX = (e.clientX - rect.left) * scaleX;
                  let closest = null;
                  let minDist = Infinity;
                  activePoints.forEach(p => {
                    const dist = Math.abs(p.x - mouseX);
                    if (dist < minDist) {
                      minDist = dist;
                      closest = p;
                    }
                  });
                  setHoveredPoint(closest);
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3A82F6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3A82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {majorY !== null && (
                  <g>
                    <line x1="0" y1={majorY} x2={chartWidth} y2={majorY} stroke="#eff5ff" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="5,5" />
                  </g>
                )}
                {minorY !== null && (
                  <g>
                    <line x1="0" y1={minorY} x2={chartWidth} y2={minorY} stroke="#eff5ff" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="5,5" />
                  </g>
                )}
                {alertY !== null && (
                  <g>
                    <line x1="0" y1={alertY} x2={chartWidth} y2={alertY} stroke="#eff5ff" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="5,5" />
                  </g>
                )}

                {areaD && <path d={areaD} fill="url(#areaGradient)" />}
                {pathD && <path d={pathD} fill="none" stroke="#b3d0ffa7" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 6px rgba(58, 130, 246, 0.8))' }} />}
                
                {activePoints.map((p, i) => {
                  const isHovered = hoveredPoint && hoveredPoint.x === p.x;
                  return (
                    <circle 
                      key={i} 
                      cx={p.x} 
                      cy={p.y} 
                      r={isHovered ? "6" : (i === activePoints.length - 1 ? "4" : "2")} 
                      fill="#fff" 
                      opacity={isHovered ? "1" : (i === activePoints.length - 1 ? "1" : "0.5")} 
                      style={{ transition: 'all 0.2s ease' }}
                    />
                  );
                })}
              </svg>

              <div className="absolute inset-0 pointer-events-none z-10">
                {majorY !== null && (
                  <div 
                    className="absolute right-0 text-[9px] md:text-xs text-[#eff5ff] opacity-80 font-sans tracking-wide pr-1"
                    style={{ top: `calc(${(majorY / chartHeight) * 100}% - 14px)` }}
                  >
                    MAJOR FLOOD ({majorVal}m)
                  </div>
                )}
                {minorY !== null && (
                  <div 
                    className="absolute right-0 text-[9px] md:text-xs text-[#eff5ff] opacity-80 font-sans tracking-wide pr-1"
                    style={{ top: `calc(${(minorY / chartHeight) * 100}% - 14px)` }}
                  >
                    MINOR FLOOD ({minorVal}m)
                  </div>
                )}
                {alertY !== null && (
                  <div 
                    className="absolute right-0 text-[9px] md:text-xs text-[#eff5ff] opacity-80 font-sans tracking-wide pr-1"
                    style={{ top: `calc(${(alertY / chartHeight) * 100}% - 14px)` }}
                  >
                    ALERT ({alertVal}m)
                  </div>
                )}
              </div>
            </div>

            {activePoints.length > 1 && (
              <div className="absolute left-0 right-0 -bottom-6 flex justify-between text-[9px] md:text-[10px] font-medium text-[#eff5ff] opacity-60 pointer-events-none px-1">
                {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
                  const minT = activePoints[0].time;
                  const maxT = activePoints[activePoints.length - 1].time;
                  const t = minT + (maxT - minT) * fraction;
                  return (
                    <span key={i}>
                      {new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default RiverGaugeChart;
