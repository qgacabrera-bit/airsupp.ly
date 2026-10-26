import React from 'react';
import InfoTooltip from './InfoTooltip';

const AQI_LEVELS = [
  { range: '0 - 50', label: 'Good', color: '#00E400', desc: 'Satisfactory, safe for all outdoor activities' },
  { range: '51 - 100', label: 'Moderate', color: '#FFFF00', textColor: '#FACC15', desc: 'Acceptable; sensitive individuals take caution' },
  { range: '101 - 150', label: 'Sensitive', color: '#FF7E00', desc: 'Wear KF94/N95 masks on open-air commutes' },
  { range: '151 - 200', label: 'Unhealthy', color: '#FF0000', desc: 'Avoid prolonged outdoor exposure along EDSA' },
  { range: '201 - 300', label: 'Very Unhealthy', color: '#8F3F97', desc: 'Health alert: seal windows and stay indoors' },
  { range: '301 - 500', label: 'Hazardous', color: '#7E0023', desc: 'Emergency conditions: severe health risk' },
];

export default function AQIScaleReference() {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 mb-8">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center">
          Philippine DENR / US EPA Air Quality Index Reference Scale
          <InfoTooltip text="PM2.5 Breakpoint Standard categorized according to Philippine DENR and US EPA environmental health guidelines." />
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {AQI_LEVELS.map((lvl) => (
          <div
            key={lvl.label}
            className="rounded-xl p-2.5 bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono text-slate-400">{lvl.range}</span>
              <span
                style={{ backgroundColor: lvl.color }}
                className="w-2.5 h-2.5 rounded-full inline-block"
              />
            </div>
            <div
              style={{ color: lvl.textColor || lvl.color }}
              className="text-xs font-bold uppercase tracking-tight"
            >
              {lvl.label}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
              {lvl.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
