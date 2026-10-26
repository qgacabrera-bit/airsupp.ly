import React, { useState } from 'react';
import { MapPin, Navigation, Compass, Layers, ShieldCheck, AlertTriangle } from 'lucide-react';

// Projection helper to convert Lat/Lon to SVG 600x800 coordinate space
function projectCoordinates(lat, lon) {
  // Bounding box for Philippine Archipelago:
  // Lon: 116.0 to 127.5 (width span: 11.5)
  // Lat: 4.5 to 21.5 (height span: 17.0)
  const x = ((lon - 116.0) / 11.5) * 600;
  const y = ((21.5 - lat) / 17.0) * 800;
  return { x: Math.round(x), y: Math.round(y) };
}

// Major Philippine Island Geographic SVG Paths (stylized high-definition vector contours)
const ISLAND_PATHS = [
  // Northern & Central Luzon Mainland + Bicol
  {
    id: 'luzon-main',
    name: 'Luzon',
    d: `M 220 120 
        C 240 100, 290 90, 310 115 
        C 330 135, 335 180, 320 220 
        C 335 240, 350 270, 330 300 
        C 310 320, 275 320, 260 305 
        C 255 295, 235 290, 230 310 
        C 220 330, 240 360, 280 370 
        C 320 380, 370 370, 395 390 
        C 415 410, 420 440, 390 460 
        C 370 470, 345 440, 340 420 
        C 320 420, 290 410, 270 390 
        C 250 375, 235 340, 235 305 
        C 220 280, 215 250, 220 220 
        C 210 180, 205 140, 220 120 Z`
  },
  // Palawan
  {
    id: 'palawan',
    name: 'Palawan',
    d: `M 150 420 
        C 160 410, 175 425, 165 460 
        C 150 500, 130 550, 110 590 
        C 95 620, 80 635, 75 625 
        C 70 615, 95 560, 120 510 
        C 135 470, 145 435, 150 420 Z`
  },
  // Mindoro
  {
    id: 'mindoro',
    name: 'Mindoro',
    d: `M 230 370 
        C 250 365, 265 380, 260 410 
        C 255 435, 240 450, 225 440 
        C 215 430, 215 395, 225 375 Z`
  },
  // Panay
  {
    id: 'panay',
    name: 'Panay',
    d: `M 320 465 
        C 345 460, 360 480, 355 510 
        C 345 525, 325 530, 315 515 
        C 305 495, 310 475, 320 465 Z`
  },
  // Negros
  {
    id: 'negros',
    name: 'Negros',
    d: `M 360 505 
        C 375 500, 385 525, 380 560 
        C 375 585, 360 595, 350 585 
        C 345 565, 355 530, 360 505 Z`
  },
  // Cebu Island
  {
    id: 'cebu-island',
    name: 'Cebu',
    d: `M 405 500 
        C 415 495, 420 520, 415 550 
        C 410 575, 400 585, 395 575 
        C 390 555, 398 520, 405 500 Z`
  },
  // Bohol
  {
    id: 'bohol',
    name: 'Bohol',
    d: `M 430 545 
        C 450 540, 460 555, 455 570 
        C 445 585, 430 580, 425 565 
        C 420 555, 425 548, 430 545 Z`
  },
  // Samar & Leyte
  {
    id: 'samar-leyte',
    name: 'Samar & Leyte',
    d: `M 430 420 
        C 450 410, 475 425, 480 460 
        C 460 485, 445 510, 440 545 
        C 430 550, 420 535, 425 505 
        C 430 475, 445 450, 430 420 Z`
  },
  // Mindanao Mainland
  {
    id: 'mindanao',
    name: 'Mindanao',
    d: `M 370 600 
        C 410 590, 470 590, 500 620 
        C 525 645, 520 680, 515 720 
        C 505 750, 470 765, 440 755 
        C 410 745, 420 710, 390 710 
        C 365 710, 340 735, 310 730 
        C 290 725, 300 690, 325 680 
        C 350 670, 360 635, 370 600 Z`
  }
];

export default function PhilippineMap({ cities = [], selectedCity = 'Manila', onCitySelect }) {
  const [hoveredCity, setHoveredCity] = useState(null);

  // Group cities by region for quick summary statistics
  const activeCitiesData = cities.map((cityObj) => {
    const coords = projectCoordinates(cityObj.latitude, cityObj.longitude);
    return {
      ...cityObj,
      x: coords.x,
      y: coords.y
    };
  });

  const activeFocus = activeCitiesData.find(
    (c) => c.city.toLowerCase() === selectedCity.toLowerCase()
  ) || activeCitiesData[0];

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-7 border border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div 
        className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{
          background: activeFocus ? activeFocus.color_hex : '#06B6D4'
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Philippine Air Quality Geospatial Overview
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time atmospheric telemetry beacons mapped across the Philippine archipelago.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/60 text-slate-300">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click any marker to inspect city trends</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Interactive Vector Map (7 Columns on Large Screens) */}
        <div className="lg:col-span-7 flex justify-center relative bg-slate-950/40 rounded-2xl p-4 border border-slate-800/80">
          <svg
            viewBox="50 80 500 700"
            className="w-full max-w-[460px] h-auto drop-shadow-2xl select-none"
            style={{ filter: 'drop-shadow(0px 8px 24px rgba(0, 0, 0, 0.6))' }}
          >
            {/* Coordinate Grid Guidelines */}
            <g opacity="0.12" stroke="#38BDF8" strokeWidth="0.5" strokeDasharray="4 4">
              <line x1="50" y1="200" x2="550" y2="200" />
              <line x1="50" y1="400" x2="550" y2="400" />
              <line x1="50" y1="600" x2="550" y2="600" />
              <line x1="200" y1="80" x2="200" y2="780" />
              <line x1="350" y1="80" x2="350" y2="780" />
              <line x1="500" y1="80" x2="500" y2="780" />
            </g>

            {/* Geographic Landmass Shapes */}
            <g className="transition-all duration-500">
              {ISLAND_PATHS.map((island) => (
                <path
                  key={island.id}
                  d={island.d}
                  fill="#1E293B"
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  className="hover:fill-slate-700/60 transition-colors duration-300 cursor-default"
                />
              ))}
            </g>

            {/* Philippine Sea Labeling */}
            <text x="430" y="240" fill="#475569" fontSize="11" fontFamily="sans-serif" fontWeight="bold" opacity="0.6">
              PHILIPPINE SEA
            </text>
            <text x="80" y="470" fill="#475569" fontSize="10" fontFamily="sans-serif" fontWeight="bold" opacity="0.6">
              WEST PHILIPPINE SEA
            </text>
            <text x="420" y="740" fill="#475569" fontSize="10" fontFamily="sans-serif" fontWeight="bold" opacity="0.6">
              CELEBES SEA
            </text>

            {/* City Sensor Station Radar Beacons */}
            {activeCitiesData.map((item) => {
              const isSelected = item.city.toLowerCase() === selectedCity.toLowerCase();
              const isHovered = hoveredCity && hoveredCity.city === item.city;
              const markerColor = item.color_hex || '#00E400';

              // Offsets for Manila vs Quezon City to avoid visual overlap
              let offsetX = 0;
              let offsetY = 0;
              if (item.city === 'Quezon City') {
                offsetX = 14;
                offsetY = -12;
              } else if (item.city === 'Manila') {
                offsetX = -12;
                offsetY = 10;
              }

              const beaconX = item.x + offsetX;
              const beaconY = item.y + offsetY;

              return (
                <g
                  key={item.city}
                  transform={`translate(${beaconX}, ${beaconY})`}
                  onClick={() => onCitySelect(item.city)}
                  onMouseEnter={() => setHoveredCity(item)}
                  onMouseLeave={() => setHoveredCity(null)}
                  className="cursor-pointer group"
                >
                  {/* Outer Pulsing Wave Ring */}
                  <circle
                    r={isSelected ? "22" : "15"}
                    fill={markerColor}
                    opacity="0.25"
                    className="animate-ping"
                  />

                  {/* Secondary Glow */}
                  <circle
                    r={isSelected ? "14" : "9"}
                    fill={markerColor}
                    opacity="0.4"
                  />

                  {/* Core Radar Dot */}
                  <circle
                    r={isSelected ? "7" : "5"}
                    fill={markerColor}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? "2.5" : "1.5"}
                    className="drop-shadow-lg"
                  />

                  {/* City Name Badge on Map */}
                  <g transform={`translate(${item.city === 'Manila' ? -40 : 16}, -2)`}>
                    <rect
                      x="-6"
                      y="-12"
                      width={item.city.length * 6.5 + 44}
                      height="20"
                      rx="10"
                      fill="#0F172A"
                      fillOpacity="0.9"
                      stroke={isSelected ? markerColor : 'rgba(255, 255, 255, 0.2)'}
                      strokeWidth={isSelected ? "1.5" : "0.8"}
                    />
                    <text
                      x="0"
                      y="2"
                      fill="#F8FAFC"
                      fontSize="9.5"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      {item.city}
                    </text>
                    <text
                      x={item.city.length * 6.5 + 4}
                      y="2"
                      fill={markerColor === '#FFFF00' ? '#FACC15' : markerColor}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {item.aqi}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Compass Rose Indicator */}
          <div className="absolute top-6 right-6 flex flex-col items-center opacity-60 pointer-events-none">
            <span className="text-[10px] font-bold text-slate-400 font-mono">N</span>
            <div className="w-0.5 h-6 bg-gradient-to-b from-cyan-400 to-transparent my-0.5" />
          </div>
        </div>

        {/* Right Column: Active Station Deep Dive & Regional Summary (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {activeFocus ? (
            <div className="bg-slate-900/80 rounded-2xl p-5 sm:p-6 border border-slate-700/70 shadow-xl relative">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
                    Active Station
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {activeFocus.city}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Station Code: {activeFocus.sensor_id}
                  </span>
                </div>

                {/* AQI Score Dial */}
                <div 
                  style={{
                    backgroundColor: `${activeFocus.color_hex}15`,
                    borderColor: activeFocus.color_hex
                  }}
                  className="px-4 py-2.5 rounded-2xl border text-center"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    AQI
                  </span>
                  <span 
                    style={{ color: activeFocus.color_hex === '#FFFF00' ? '#FACC15' : activeFocus.color_hex }}
                    className="text-3xl font-black"
                  >
                    {activeFocus.aqi}
                  </span>
                </div>
              </div>

              {/* Category & Status */}
              <div className="mb-4">
                <span 
                  style={{ 
                    backgroundColor: `${activeFocus.color_hex}25`,
                    borderColor: `${activeFocus.color_hex}60`,
                    color: activeFocus.color_hex === '#FFFF00' ? '#FACC15' : activeFocus.color_hex
                  }}
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full border tracking-wide uppercase"
                >
                  {activeFocus.category}
                </span>
              </div>

              {/* Sensor Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-4 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">PM2.5 Concentration</span>
                  <span className="text-base font-bold text-cyan-300 font-mono">
                    {Number(activeFocus.pm25).toFixed(1)} <span className="text-[10px] font-sans text-slate-400">µg/m³</span>
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">PM10 Concentration</span>
                  <span className="text-base font-bold text-slate-200 font-mono">
                    {Number(activeFocus.pm10).toFixed(1)} <span className="text-[10px] font-sans text-slate-400">µg/m³</span>
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Temperature</span>
                  <span className="text-base font-bold text-rose-300 font-mono">
                    {Number(activeFocus.temperature).toFixed(1)} °C
                  </span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Humidity</span>
                  <span className="text-base font-bold text-blue-300 font-mono">
                    {Number(activeFocus.humidity).toFixed(1)} %
                  </span>
                </div>
              </div>

              {/* Health Guidance */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>{activeFocus.health_advisory}</p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
              Select a station on the map to inspect live metrics.
            </div>
          )}

          {/* Regional Island Group Station Quick Picker */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              Archipelago Station Network
            </span>
            <div className="grid grid-cols-2 gap-2">
              {activeCitiesData.map((cityItem) => {
                const isSelected = cityItem.city.toLowerCase() === selectedCity.toLowerCase();
                return (
                  <button
                    key={cityItem.city}
                    onClick={() => onCitySelect(cityItem.city)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-sm'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                      <span>{cityItem.city}</span>
                    </div>
                    <span 
                      style={{ color: cityItem.color_hex === '#FFFF00' ? '#FACC15' : cityItem.color_hex }}
                      className="font-mono text-[11px]"
                    >
                      {cityItem.aqi}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
