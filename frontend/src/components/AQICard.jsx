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
      backgroundColor: `${hex}20`,
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

  // Position relative to a 300 max scale
  const progressPercent = Math.min(100, Math.max(0, (aqi / 300) * 100));

  return (
    <div
      onClick={() => onSelect(city)}
      style={getBorderGlow(color_hex, isSelected)}
      className={`glass-panel glass-panel-hover rounded-2xl p-5 cursor-pointer relative grid grid-rows-[auto_auto_auto_1fr] gap-3.5 transition-all duration-300 h-full ${
        isSelected ? 'ring-1 ring-cyan-400/40 bg-slate-900/90' : 'hover:bg-slate-900/70'
      }`}
    >
      {/* Row 1: Header (City, Station Code & Category Badge) */}
      <div className="flex items-start justify-between gap-2 min-h-[44px]">
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2 className="text-xl font-bold tracking-tight text-white truncate" title={city}>
              {city}
            </h2>
          </div>
          {/* Subtle station code below city name */}
          <span className="text-[11px] font-mono text-slate-400 block tracking-tight">
            {sensor_id}
          </span>
        </div>

        {/* Dynamic Category Badge */}
        <span
          style={getBadgeStyle(color_hex)}
          className="text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm tracking-wide text-center uppercase shrink-0 whitespace-nowrap self-start"
        >
          {category}
        </span>
      </div>

      {/* Row 2: AQI Hero Gauge Display + 4px Segmented Gradient Progress Bar */}
      <div className="pb-3 border-b border-slate-800/80">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-0.5">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              <span>Air Quality Index</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                style={{ color: color_hex === '#FFFF00' ? '#FACC15' : color_hex }}
                className="text-5xl font-black tracking-tight"
              >
                {aqi}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ 300 scale</span>
            </div>
          </div>

          {/* PM Telemetry Highlights with whitespace-nowrap */}
          <div className="text-right shrink-0">
            <div className="text-xs text-slate-400 whitespace-nowrap">
              <span className="font-semibold text-slate-200">PM2.5:</span>{' '}
              <span className="font-mono text-cyan-300 font-bold whitespace-nowrap">
                {Number(pm25).toFixed(1)} µg/m³
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1.5 whitespace-nowrap">
              <span className="font-semibold text-slate-200">PM10:</span>{' '}
              <span className="font-mono text-slate-300 font-bold whitespace-nowrap">
                {Number(pm10).toFixed(1)} µg/m³
              </span>
            </div>
          </div>
        </div>

        {/* Sleek, Thin 4px Segmented Gradient Progress Bar */}
        <div className="relative w-full mt-3 pt-1">
          {/* Segmented Gradient Bar (Good -> Moderate -> USG -> Unhealthy -> Very Unhealthy -> Hazardous) */}
          <div className="h-1 w-full rounded-full bg-slate-800/90 overflow-hidden relative shadow-inner">
            <div
              className="h-full w-full"
              style={{
                background: 'linear-gradient(to right, #00E400 0%, #00E400 16.6%, #FFFF00 16.6%, #FFFF00 33.3%, #FF7E00 33.3%, #FF7E00 50%, #FF0000 50%, #FF0000 66.6%, #8F3F97 66.6%, #8F3F97 83.3%, #7E0023 83.3%, #7E0023 100%)'
              }}
            />
          </div>

          {/* Glowing indicator dot positioned relative to 300 max scale */}
          <div
            style={{
              left: `${progressPercent}%`,
              backgroundColor: color_hex === '#FFFF00' ? '#FACC15' : color_hex,
              boxShadow: `0 0 10px 2px ${color_hex === '#FFFF00' ? '#FACC15' : color_hex}`
            }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-slate-900 pointer-events-none transition-all duration-700 ease-out"
          />
        </div>
      </div>

      {/* Row 3: Secondary Metrics (Temp & Humidity with guaranteed aligned heights) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-700/40 min-h-[46px]">
          <Thermometer className="w-4 h-4 text-rose-400 shrink-0" />
          <div className="text-xs truncate">
            <span className="text-slate-400 block text-[10px]">Temperature</span>
            <span className="font-semibold text-slate-200 whitespace-nowrap">
              {Number(temperature).toFixed(1)} °C
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-700/40 min-h-[46px]">
          <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="text-xs truncate">
            <span className="text-slate-400 block text-[10px]">Humidity</span>
            <span className="font-semibold text-slate-200 whitespace-nowrap">
              {Number(humidity).toFixed(1)} %
            </span>
          </div>
        </div>
      </div>

      {/* Row 4: Health Advisory & Active Selection Tab (Fills remaining height) */}
      <div className="flex flex-col justify-between">
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 h-full flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            {health_advisory}
          </p>
        </div>

        {/* Active Pill Indicator */}
        {isSelected && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active In Trend Chart</span>
          </div>
        )}
      </div>
    </div>
  );
}
