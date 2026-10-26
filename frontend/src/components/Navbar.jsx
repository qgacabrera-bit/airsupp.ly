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
    <header className="sticky top-0 z-50 glass-panel border-b border-white/[0.06] px-4 sm:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Signature Editorial Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20 text-white">
            <Wind className="w-5 h-5 animate-pulse-slow" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                AirSupp.ly
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-teal-400/80 bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-800/30">
                PH Stream
              </span>
            </div>
          </div>
        </div>

        {/* Status & Refresh Controls */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-300">
            Air quality as of <span className="font-semibold text-slate-100 font-mono">{formatTime(lastUpdated)}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh air quality readings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 active:scale-95 text-xs text-slate-200 border border-white/[0.08] transition shadow-sm"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
