import React from 'react';
import { Thermometer, Droplets, ShieldAlert, Sparkles, MapPin, Gauge } from 'lucide-react';

export default function AQICard({ metric, isSelected, onSelect }) {
  const {
    city = 'Unknown',
    sensor_id = 'PH-STA-000',
    aqi = 0,
    category = 'Good',
    color_hex = '#00E400',
    pm25 = 0,
    pm10 = 0,
    temperature = 0,
    humidity = 0,
    health_advisory = 'Satisfactory air quality.'
  } = metric;

  // Determine text color contrast for badge
  const getBadgeStyle = (hex) => {
    return {
      backgroundColor: `${hex}20`, // 12% opacity
      borderColor: `${hex}80`,
      color: hex === '#FFFF00' ? '#FACC15' : hex
    };
  };

  const getBorderGlow = (hex, selected) => {
    if (selected) {
      return {
        borderColor: hex,
        boxShadow: `0 0 25px -4px ${hex}50, inset 0 0 15px -8px ${hex}30`
      };
    }
    return {
      borderColor: 'rgba(255, 255, 255, 0.08)'
    };
  };

  return (
    <div
      onClick={() => onSelect(city)}
      style={getBorderGlow(color_hex, isSelected)}
      className={`glass-panel glass-panel-hover rounded-2xl p-5 cursor-pointer relative flex flex-col justify-between transition-all duration-300 ${
        isSelected ? 'ring-1 ring-cyan-400/40 bg-slate-900/90' : 'hover:bg-slate-900/70'
      }`}
    >
      {/* Top Bar: City Name & Selection Indicator */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">{city}</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{sensor_id}</span>
        </div>

        {/* Dynamic Category Badge */}
        <span
          style={getBadgeStyle(color_hex)}
          className="text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm tracking-wide text-center uppercase"
        >
          {category}
        </span>
      </div>

      {/* Middle Row: AQI Hero Gauge Display */}
      <div className="flex items-baseline justify-between mb-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-0.5">
            <Gauge className="w-3.5 h-3.5" />
            <span>Air Quality Index</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              style={{ color: color_hex === '#FFFF00' ? '#FACC15' : color_hex }}
              className="text-5xl font-black tracking-tight"
            >
              {aqi}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 500</span>
          </div>
        </div>

        {/* PM Telemetry Highlights */}
        <div className="text-right">
          <div className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">PM2.5:</span>{' '}
            <span className="font-mono text-cyan-300 font-bold">{Number(pm25).toFixed(1)}</span> µg/m³
          </div>
          <div className="text-xs text-slate-400 mt-1">
            <span className="font-semibold text-slate-200">PM10:</span>{' '}
            <span className="font-mono text-slate-300">{Number(pm10).toFixed(1)}</span> µg/m³
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Temp & Humidity */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-2 bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-700/40">
          <Thermometer className="w-4 h-4 text-rose-400" />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px]">Temperature</span>
            <span className="font-semibold text-slate-200">{Number(temperature).toFixed(1)} °C</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-700/40">
          <Droplets className="w-4 h-4 text-cyan-400" />
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px]">Humidity</span>
            <span className="font-semibold text-slate-200">{Number(humidity).toFixed(1)} %</span>
          </div>
        </div>
      </div>

      {/* Health & Commute Guidance Advisory */}
      <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            {health_advisory}
          </p>
        </div>
      </div>

      {/* Active Tab Pill Indicator */}
      {isSelected && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Active In Trend Chart</span>
        </div>
      )}
    </div>
  );
}
