import React from 'react';
import { Wind, RotateCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ lastUpdated, onRefresh, isRefreshing }) {
  const { theme, toggleTheme } = useTheme();

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
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/80 dark:border-white/[0.06] px-4 sm:px-8 py-3 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Signature Editorial Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20 text-white">
            <Wind className="w-5 h-5 animate-pulse-slow" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors duration-200">
                AirSupp.ly
              </h1>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-teal-700 dark:text-teal-400/80 bg-teal-500/10 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-500/20 dark:border-teal-800/30">
                PH Stream
              </span>
            </div>
          </div>
        </div>

        {/* Status, Theme Toggle & Refresh Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-300 hidden md:block">
            Air quality as of <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono">{formatTime(lastUpdated)}</span>
          </div>

          {/* Theme Toggle Button with Smooth Rotate/Scale Icon Transition */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/[0.08] transition-all duration-200 active:scale-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400/40 text-slate-700 dark:text-teal-400"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 transition-transform duration-300 -rotate-12 hover:rotate-0 text-slate-700" />
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh air quality readings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-95 text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] transition-all duration-200 shadow-sm"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
