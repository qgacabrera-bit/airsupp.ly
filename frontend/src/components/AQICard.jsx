import React from 'react';
import { Thermometer, Droplets, ShieldAlert, Sparkles, MapPin, Gauge } from 'lucide-react';

// Refined, desaturated semantic status palette (editorial SaaS styling)
const STATUS_TINTS = {
  good: {
    bg: 'bg-emerald-950/30',
    border: 'border-emerald-800/40',
    text: 'text-emerald-300',
    dotHex: '#10B981',
    glow: 'rgba(16, 185, 129, 0.3)'
  },
  moderate: {
    bg: 'bg-amber-950/30',
    border: 'border-amber-800/40',
    text: 'text-amber-300',
    dotHex: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.3)'
  },
  sensitive: {
    bg: 'bg-orange-950/30',
    border: 'border-orange-800/40',
    text: 'text-orange-300',
    dotHex: '#FB923C',
    glow: 'rgba(251, 146, 60, 0.3)'
  },
  unhealthy: {
    bg: 'bg-rose-950/30',
    border: 'border-rose-800/40',
    text: 'text-rose-300',
    dotHex: '#F87171',
    glow: 'rgba(248, 113, 113, 0.3)'
  },
  veryunhealthy: {
    bg: 'bg-purple-950/30',
    border: 'border-purple-800/40',
    text: 'text-purple-300',
    dotHex: '#C084FC',
    glow: 'rgba(192, 132, 252, 0.3)'
  },
  hazardous: {
    bg: 'bg-rose-950/50',
    border: 'border-rose-800/60',
    text: 'text-rose-200',
    dotHex: '#E11D48',
    glow: 'rgba(225, 29, 72, 0.35)'
  }
};

function getStatusConfig(aqi = 0, category = '') {
  const cat = (category || '').toLowerCase();
  if (cat.includes('good') || aqi <= 50) return STATUS_TINTS.good;
  if (cat.includes('moderate') || aqi <= 100) return STATUS_TINTS.moderate;
  if (cat.includes('sensitive') || aqi <= 150) return STATUS_TINTS.sensitive;
  if (cat.includes('very') || aqi <= 300) return STATUS_TINTS.veryunhealthy;
  if (cat.includes('unhealthy') || aqi <= 200) return STATUS_TINTS.unhealthy;
  return STATUS_TINTS.hazardous;
}

// Compact category label formatter to prevent awkward horizontal card blowup
function formatCategoryLabel(cat = '') {
  const lower = cat.toLowerCase();
  if (lower.includes('sensitive')) return 'Sensitive (USG)';
  if (lower.includes('very unhealthy')) return 'Very Unhealthy';
  if (lower.includes('unhealthy')) return 'Unhealthy';
  if (lower.includes('moderate')) return 'Moderate';
  if (lower.includes('good')) return 'Good';
  if (lower.includes('hazardous')) return 'Hazardous';
  return cat;
}

export default function AQICard({ metric, isSelected, onSelect }) {
  const {
    city = 'Unknown',
    sensor_id = 'PH-STA-000',
    aqi = 0,
    category = 'Good',
    pm25 = 0,
    pm10 = 0,
    temperature = 0,
    humidity = 0,
    health_advisory = 'Satisfactory air quality.'
  } = metric;

  const status = getStatusConfig(aqi, category);
  const displayCategory = formatCategoryLabel(category);
  const progressPercent = Math.min(100, Math.max(0, (aqi / 300) * 100));

  // Multi-layered ambient glow for active card, ultra-subtle border for standard cards
  const cardStyle = isSelected
    ? {
        borderColor: 'rgba(45, 212, 191, 0.45)',
        boxShadow: '0 12px 35px -5px rgba(0, 0, 0, 0.5), 0 0 25px -4px rgba(45, 212, 191, 0.20), inset 0 0 15px -8px rgba(45, 212, 191, 0.12)'
      }
    : {
        borderColor: 'rgba(255, 255, 255, 0.06)'
      };

  return (
    <div
      onClick={() => onSelect(city)}
      style={cardStyle}
      className={`glass-panel glass-panel-hover rounded-2xl p-4 sm:p-5 cursor-pointer relative grid grid-rows-[auto_auto_auto_1fr] gap-3 w-full min-w-0 overflow-hidden transition-all duration-300 h-full ${
        isSelected ? 'bg-slate-900/90 ring-1 ring-teal-500/30' : 'hover:bg-slate-900/60'
      }`}
    >
      {/* Row 1: Header (City, Station Code & Desaturated Status Pill) */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1 pr-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white truncate" title={city}>
              {city}
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400 block truncate mt-0.5">
            {sensor_id}
          </span>
        </div>

        {/* Muted, Desaturated Surface Status Pill */}
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm tracking-wide text-center uppercase shrink-0 whitespace-nowrap self-start ${status.bg} ${status.border} ${status.text}`}
        >
          {displayCategory}
        </span>
      </div>

      {/* Row 2: AQI Hero Gauge Display + 4px Segmented Gradient Progress Bar */}
      <div className="pb-2.5 border-b border-slate-800/60 min-w-0">
        <div className="flex items-baseline justify-between gap-2 min-w-0">
          <div>
            <div className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
              <Gauge className="w-3 h-3 text-slate-400" />
              <span>Air Quality</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-4xl sm:text-5xl font-black tracking-tight ${status.text}`}>
                {aqi}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">/ 300</span>
            </div>
          </div>

          {/* PM Telemetry Highlights */}
          <div className="text-right shrink-0">
            <div className="text-[11px] text-slate-400 whitespace-nowrap">
              <span className="text-slate-300 font-medium">PM2.5:</span>{' '}
              <span className="font-mono text-teal-300 font-bold">{Number(pm25).toFixed(1)}</span>{' '}
              <span className="text-[10px] text-slate-400">µg/m³</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 whitespace-nowrap">
              <span className="text-slate-300 font-medium">PM10:</span>{' '}
              <span className="font-mono text-slate-300 font-semibold">{Number(pm10).toFixed(1)}</span>{' '}
              <span className="text-[10px] text-slate-400">µg/m³</span>
            </div>
          </div>
        </div>

        {/* Restrained 4px Segmented Gradient Progress Bar */}
        <div className="relative w-full mt-2.5 pt-1">
          <div className="h-1 w-full rounded-full bg-slate-800/80 overflow-hidden relative shadow-inner">
            <div
              className="h-full w-full"
              style={{
                background: 'linear-gradient(to right, #10B981 0%, #10B981 16.6%, #EAB308 16.6%, #EAB308 33.3%, #F97316 33.3%, #F97316 50%, #EF4444 50%, #EF4444 66.6%, #A855F7 66.6%, #A855F7 83.3%, #881337 83.3%, #881337 100%)'
              }}
            />
          </div>

          {/* Glowing indicator dot on 300 max scale */}
          <div
            style={{
              left: `${progressPercent}%`,
              backgroundColor: status.dotHex,
              boxShadow: `0 0 8px 1px ${status.glow}`
            }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border border-slate-900 pointer-events-none transition-all duration-700 ease-out"
          />
        </div>
      </div>

      {/* Row 3: Secondary Metrics (Temp & Humidity with guaranteed equal row alignment) */}
      <div className="grid grid-cols-2 gap-2 min-w-0">
        <div className="flex items-center gap-2 bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-white/[0.04] min-w-0">
          <Thermometer className="w-3.5 h-3.5 text-rose-300/80 shrink-0" />
          <div className="text-[11px] min-w-0 truncate">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Temp</span>
            <span className="font-semibold text-slate-200 whitespace-nowrap">
              {Number(temperature).toFixed(1)} °C
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-white/[0.04] min-w-0">
          <Droplets className="w-3.5 h-3.5 text-teal-300/80 shrink-0" />
          <div className="text-[11px] min-w-0 truncate">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Humidity</span>
            <span className="font-semibold text-slate-200 whitespace-nowrap">
              {Number(humidity).toFixed(1)} %
            </span>
          </div>
        </div>
      </div>

      {/* Row 4: Health Advisory & Active Selection Tab (Fills remaining height) */}
      <div className="flex flex-col justify-between min-w-0">
        <div className="bg-slate-950/50 rounded-xl p-2.5 border border-white/[0.04] h-full flex items-start gap-2 min-w-0">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300/90 leading-relaxed line-clamp-2">
            {health_advisory}
          </p>
        </div>

        {/* Signature Soft Teal Active Indicator */}
        {isSelected && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-teal-300 uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>Active In Trend Chart</span>
          </div>
        )}
      </div>
    </div>
  );
}
