import React from 'react';
import { Wind, RotateCw } from 'lucide-react';

export default function Navbar({ lastUpdated, onRefresh, isRefreshing }) {
  const formatTime = (isoString) => {
    if (!isoString) return '--:--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-PH', { hour12: false, timeZone: 'Asia/Manila' }) + ' PHT';
    } catch {
      return isoString;
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Clean Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20 text-white">
            <Wind className="w-5 h-5 animate-pulse-slow" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              AirSupp.ly
            </h1>
          </div>
        </div>

        {/* Clean Status & Refresh */}
        <div className="flex items-center gap-3">
          <div className="text-xs sm:text-sm text-slate-300">
            Air quality as of <span className="font-semibold text-white font-mono">{formatTime(lastUpdated)}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh air quality readings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs text-slate-200 border border-slate-700 transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
