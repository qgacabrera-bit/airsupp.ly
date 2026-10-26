import React from 'react';
import InfoTooltip from './InfoTooltip';

const AQI_LEVELS = [
  { range: '0 - 50', label: 'Good', color: '#10B981', darkText: '#34d399', lightText: '#047857', desc: 'Satisfactory, safe for all outdoor activities' },
  { range: '51 - 100', label: 'Moderate', color: '#F59E0B', darkText: '#fbbf24', lightText: '#b45309', desc: 'Acceptable; sensitive individuals take caution' },
  { range: '101 - 150', label: 'Sensitive', color: '#FB923C', darkText: '#fb923c', lightText: '#c2410c', desc: 'Wear KF94/N95 masks on open-air commutes' },
  { range: '151 - 200', label: 'Unhealthy', color: '#F87171', darkText: '#f87171', lightText: '#b91c1c', desc: 'Avoid prolonged outdoor exposure along EDSA' },
  { range: '201 - 300', label: 'Very Unhealthy', color: '#C084FC', darkText: '#c084fc', lightText: '#7e22ce', desc: 'Health alert: seal windows and stay indoors' },
  { range: '301 - 500', label: 'Hazardous', color: '#E11D48', darkText: '#fb7185', lightText: '#9f1239', desc: 'Emergency conditions: severe health risk' },
];

export default function AQIScaleReference() {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 mb-8 border border-slate-200/80 dark:border-white/[0.06] shadow-xl transition-colors duration-200">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center">
          Philippine DENR / US EPA Air Quality Index Reference Scale
          <InfoTooltip text="PM2.5 Breakpoint Standard categorized according to Philippine DENR and US EPA environmental health guidelines." />
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {AQI_LEVELS.map((lvl) => (
          <div
            key={lvl.label}
            className="rounded-xl p-3 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/[0.05] shadow-sm flex flex-col justify-between transition-colors duration-200"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{lvl.range}</span>
              <span
                style={{ backgroundColor: lvl.color, boxShadow: `0 0 8px ${lvl.color}40` }}
                className="w-2.5 h-2.5 rounded-full inline-block"
              />
            </div>
            <div
              style={{ color: lvl.color }}
              className="text-xs font-bold uppercase tracking-tight"
            >
              {lvl.label}
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-tight">
              {lvl.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
