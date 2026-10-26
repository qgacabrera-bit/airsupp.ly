import React from 'react';

/**
 * Modern Glassmorphic Info Tooltip Tag (?)
 * Renders a compact question mark circle that reveals explanatory text on hover.
 */
export default function InfoTooltip({ text }) {
  if (!text) return null;

  return (
    <div className="relative group inline-flex items-center ml-1.5 align-middle">
      <span
        tabIndex={0}
        aria-label="Information guide"
        className="w-4 h-4 rounded-full border border-slate-600/90 bg-slate-800/90 hover:bg-slate-700 text-slate-300 group-hover:text-cyan-300 group-hover:border-cyan-400 flex items-center justify-center text-[10px] font-bold cursor-help transition-all shadow-sm select-none"
      >
        ?
      </span>
      {/* Tooltip Popup Bubble */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 hidden group-hover:flex flex-col z-50 w-64 sm:w-72 p-2.5 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl backdrop-blur-md text-xs text-slate-200 font-normal leading-relaxed pointer-events-none transition animate-fade-in">
        <span>{text}</span>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-slate-700" />
      </div>
    </div>
  );
}
