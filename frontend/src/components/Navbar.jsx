import React from 'react';
import { Wind, Activity, Wifi, WifiOff, RotateCw } from 'lucide-react';

export default function Navbar({ isOffline, lastUpdated, onRefresh, isRefreshing }) {
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
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
            <Wind className="w-6 h-6 animate-pulse-slow" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                AirSupp.ly
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                PH Stream
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium italic">
              "All Out of Smog" — Real-Time Environmental Health
            </p>
          </div>
        </div>

        {/* Telemetry Status Indicators */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Stream Connection Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            !isOffline
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60 shadow-sm shadow-emerald-900/30'
              : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
          }`}>
            {!isOffline ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi className="w-3.5 h-3.5" />
                <span>Live 15s Stream</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline Cached Mode</span>
              </>
            )}
          </div>

          {/* Timestamp Indicator */}
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Last 15s Cycle</span>
            <span className="text-xs font-mono text-slate-200">{formatTime(lastUpdated)}</span>
          </div>

          {/* Manual Refresh Trigger */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Poll fresh 15s snapshot"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs text-slate-200 border border-slate-700 transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>
    </header>
  );
}
