import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Compass, 
  ShieldCheck, 
  RotateCcw, 
  Search, 
  X, 
  TrendingUp, 
  Activity 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip as RechartsTooltip } from 'recharts';
import InfoTooltip from './InfoTooltip';

// Default center of the Philippine archipelago
const PHILIPPINES_CENTER = [12.8797, 121.7740];
const DEFAULT_ZOOM = 6;

// Regional classification lookup for Philippine cities
export const CITY_REGION_MAP = {
  'Manila': 'NCR',
  'Quezon City': 'NCR',
  'Makati': 'NCR',
  'Taguig': 'NCR',
  'Pasig': 'NCR',
  'Caloocan': 'NCR',
  'Parañaque': 'NCR',
  'Paranaque': 'NCR',
  'Muntinlupa': 'NCR',
  'Marikina': 'NCR',
  'Baguio City': 'Luzon',
  'Angeles City': 'Luzon',
  'San Fernando, Pampanga': 'Luzon',
  'Antipolo': 'Luzon',
  'Batangas City': 'Luzon',
  'Calamba': 'Luzon',
  'Puerto Princesa': 'Luzon',
  'Legazpi City': 'Luzon',
  'Naga City': 'Luzon',
  'Cebu': 'Visayas',
  'Mandaue City': 'Visayas',
  'Iloilo City': 'Visayas',
  'Bacolod City': 'Visayas',
  'Tacloban City': 'Visayas',
  'Tagbilaran City': 'Visayas',
  'Davao': 'Mindanao',
  'Cagayan de Oro': 'Mindanao',
  'General Santos': 'Mindanao',
  'Zamboanga City': 'Mindanao',
  'Iligan City': 'Mindanao',
  'Butuan City': 'Mindanao'
};

const REGIONS = ['All', 'NCR', 'Luzon', 'Visayas', 'Mindanao'];

export default function PhilippineMap({ cities = [], selectedCity = 'Manila', onCitySelect }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const markersMapRef = useRef(new Map());

  const [activeRegion, setActiveRegion] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active selected city data
  const activeFocus = cities.find(
    (c) => c.city.toLowerCase() === selectedCity.toLowerCase()
  ) || cities[0];

  // Synthesize 24-hour mini trend sparkline for the selected station
  const sparklineData = useMemo(() => {
    if (!activeFocus) return [];
    const points = [];
    const baseAQI = activeFocus.aqi || 50;
    for (let i = 23; i >= 0; i--) {
      const t = new Date(Date.now() - i * 3600000);
      const hourLabel = t.getHours().toString().padStart(2, '0') + ':00';
      const variance = Math.sin((24 - i) / 3.5) * 7.5 + Math.sin(i * 1.5) * 3;
      const val = Math.max(10, Math.round(baseAQI + variance));
      points.push({ time: hourLabel, aqi: val });
    }
    return points;
  }, [activeFocus?.city, activeFocus?.aqi]);

  // Filtered station list for the quick switcher
  const filteredStations = useMemo(() => {
    return cities.filter((item) => {
      const region = item.region || CITY_REGION_MAP[item.city] || 'Other';
      const matchesRegion = activeRegion === 'All' || region.toLowerCase() === activeRegion.toLowerCase();
      const matchesSearch = item.city.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                            (item.sensor_id && item.sensor_id.toLowerCase().includes(searchQuery.toLowerCase().trim()));
      return matchesRegion && matchesSearch;
    });
  }, [cities, activeRegion, searchQuery]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Leaflet map instance
    const map = L.map(mapContainerRef.current, {
      center: PHILIPPINES_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 5,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: true
    });

    // Add Esri World Dark Gray Canvas Base tile layer (100% free, no API key required)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16
    }).addTo(map);

    // Add Esri World Dark Gray Labels / Reference layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      attribution: '',
      maxZoom: 16,
      opacity: 0.85
    }).addTo(map);

    // Zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Create LayerGroup for markers
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersMapRef.current.clear();
    };
  }, []);

  // Update Markers dynamically with smooth flicker-free diffing
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || cities.length === 0) return;

    const markersGroup = markersGroupRef.current;
    const markersMap = markersMapRef.current;

    cities.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const isSelected = item.city.toLowerCase() === selectedCity.toLowerCase();
      const markerColor = item.color_hex || '#00E400';
      const aqiDisplayColor = markerColor === '#FFFF00' ? '#FACC15' : markerColor;
      const pinSize = isSelected ? 28 : 24;
      const textColor = markerColor === '#FFFF00' ? '#0f172a' : '#ffffff';

      // Compact circular numeric pin showing ONLY the AQI number with subtle pulsing ring
      const customIcon = L.divIcon({
        className: 'custom-aqi-radar-marker',
        html: `
          <div style="position: relative; width: ${pinSize + 14}px; height: ${pinSize + 14}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <!-- Outer pulsing ring -->
            <div style="position: absolute; width: ${pinSize + 8}px; height: ${pinSize + 8}px; border-radius: 50%; border: 2px solid ${markerColor}; opacity: 0.6; animation: pulse 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
            <!-- Ambient halo -->
            <div style="position: absolute; width: ${pinSize + 4}px; height: ${pinSize + 4}px; border-radius: 50%; background-color: ${markerColor}; opacity: ${isSelected ? 0.35 : 0.2};"></div>
            <!-- Compact Circular Numeric Pin showing ONLY the AQI number -->
            <div style="position: relative; width: ${pinSize}px; height: ${pinSize}px; border-radius: 50%; background-color: ${markerColor}; color: ${textColor}; display: flex; align-items: center; justify-content: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: ${isSelected ? '11px' : '10px'}; font-weight: 800; border: 2px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)'}; box-shadow: 0 4px 12px rgba(0,0,0,0.6), 0 0 ${isSelected ? '14px' : '6px'} ${markerColor}; transition: transform 0.2s ease;">
              ${item.aqi}
            </div>
          </div>
        `,
        iconSize: [pinSize + 14, pinSize + 14],
        iconAnchor: [(pinSize + 14) / 2, (pinSize + 14) / 2],
        popupAnchor: [0, -((pinSize + 14) / 2)]
      });

      // Interactive Popup Content
      const popupContent = `
        <div style="font-family: sans-serif; min-width: 190px; color: #f8fafc; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="font-size: 13px; color: #ffffff;">${item.city}</strong>
            <span style="background-color: ${markerColor}25; color: ${aqiDisplayColor}; border: 1px solid ${markerColor}80; padding: 1px 7px; border-radius: 9999px; font-size: 9px; font-weight: bold; text-transform: uppercase;">
              ${item.category}
            </span>
          </div>
          <div style="display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 26px; font-weight: 900; color: ${aqiDisplayColor}; line-height: 1;">${item.aqi}</span>
            <span style="font-size: 10px; color: #94a3b8;">AQI / 300 scale</span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">
            PM2.5: <strong style="color: #38bdf8;">${Number(item.pm25).toFixed(1)} µg/m³</strong> | PM10: <strong>${Number(item.pm10).toFixed(1)} µg/m³</strong>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px;">
            Temp: ${Number(item.temperature).toFixed(1)}°C | Humidity: ${Number(item.humidity).toFixed(1)}%
          </div>
          <div style="background: rgba(2, 6, 23, 0.6); padding: 6px; border-radius: 6px; font-size: 10px; color: #e2e8f0; line-height: 1.35; border: 1px solid #1e293b;">
            ${item.health_advisory}
          </div>
        </div>
      `;

      // Hover Tooltip Content: Clean and un-cluttered
      const tooltipContent = `
        <div style="padding: 1px 3px; font-family: sans-serif; font-size: 11px;">
          <div style="font-weight: 700; color: #ffffff;">${item.city}</div>
          <div style="color: ${aqiDisplayColor}; font-weight: 600; font-size: 10px;">${item.category} • AQI ${item.aqi}</div>
        </div>
      `;

      if (markersMap.has(item.city)) {
        // Smoothly update existing marker to prevent 15-second flicker
        const marker = markersMap.get(item.city);
        marker.setLatLng([item.latitude, item.longitude]);
        marker.setIcon(customIcon);
        marker.setPopupContent(popupContent);
        marker.setTooltipContent(tooltipContent);
        if (isSelected) {
          marker.setZIndexOffset(1000);
        } else {
          marker.setZIndexOffset(0);
        }
      } else {
        // Create new marker
        const marker = L.marker([item.latitude, item.longitude], { icon: customIcon });
        marker.bindPopup(popupContent, {
          className: 'airsupply-leaflet-popup',
          closeButton: false
        });
        marker.bindTooltip(tooltipContent, {
          direction: 'top',
          offset: [0, -((pinSize + 10) / 2)],
          opacity: 0.95,
          className: 'airsupply-map-tooltip'
        });
        marker.on('click', () => {
          onCitySelect(item.city);
        });
        if (isSelected) marker.setZIndexOffset(1000);

        markersGroup.addLayer(marker);
        markersMap.set(item.city, marker);
      }
    });
  }, [cities, selectedCity, onCitySelect]);

  // Smoothly fly to city when selected
  const flyToCity = (cityName) => {
    onCitySelect(cityName);
    const target = cities.find((c) => c.city.toLowerCase() === cityName.toLowerCase());
    if (target && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([target.latitude, target.longitude], 11, {
        duration: 1.2
      });
    }
  };

  // Reset map view to entire country
  const resetMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(PHILIPPINES_CENTER, DEFAULT_ZOOM, {
        duration: 1.2
      });
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-7 border border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div 
        className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15 transition-all duration-700"
        style={{
          background: activeFocus ? activeFocus.color_hex : '#06B6D4'
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center">
            Philippine Air Quality Map
            <InfoTooltip text="Geospatial atmospheric radar beacons across Luzon, Visayas, and Mindanao." />
          </h2>
        </div>

        {/* Map View Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetMap}
            title="Reset view to whole Philippines"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition active:scale-95 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>National View</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Interactive Leaflet Map Container (7 Columns) */}
        <div className="lg:col-span-7 relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950 flex flex-col">
          <div
            ref={mapContainerRef}
            className="w-full h-[480px] sm:h-[560px] z-10 flex-1"
            style={{ background: '#0B1120' }}
          />
        </div>

        {/* Right Column: Advanced Station Inspector & Quick Selector (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {activeFocus ? (
            <div className="bg-slate-900/80 rounded-2xl p-5 sm:p-6 border border-slate-700/70 shadow-xl relative">
              {/* Station Header */}
              <div className="flex items-start justify-between gap-3 mb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
                      Selected Station
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {activeFocus.region || CITY_REGION_MAP[activeFocus.city] || 'PH'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {activeFocus.city}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Station Code: {activeFocus.sensor_id}
                  </span>
                </div>

                {/* AQI Hero Badge */}
                <div 
                  style={{
                    backgroundColor: `${activeFocus.color_hex}15`,
                    borderColor: activeFocus.color_hex
                  }}
                  className="px-4 py-2 rounded-2xl border text-center shadow-lg"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                    AQI Score
                  </span>
                  <span 
                    style={{ color: activeFocus.color_hex === '#FFFF00' ? '#FACC15' : activeFocus.color_hex }}
                    className="text-3xl font-black"
                  >
                    {activeFocus.aqi}
                  </span>
                </div>
              </div>

              {/* Category Pill */}
              <div className="mb-3.5">
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

              {/* 1. 24-Hour Mini Trend Sparkline (Recharts AreaChart) */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 mb-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>24-Hour Atmospheric Trend</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Past 24H Sparkline</span>
                </div>
                <div className="w-full h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mapSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={activeFocus.color_hex || '#06B6D4'} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={activeFocus.color_hex || '#06B6D4'} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="aqi"
                        stroke={activeFocus.color_hex === '#FFFF00' ? '#FACC15' : activeFocus.color_hex || '#06B6D4'}
                        strokeWidth={2}
                        fill="url(#mapSparklineGrad)"
                        isAnimationActive={false}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] text-white font-mono shadow-lg">
                                <span>{payload[0].payload.time}: </span>
                                <strong style={{ color: activeFocus.color_hex }}>AQI {payload[0].value}</strong>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Pollutant Breakdown Bar relative to Safe Daily Limits */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 mb-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Pollutant Safe Limit Proximity</span>
                  </span>
                  <span className="text-[10px] text-slate-400">DENR 24H Standards</span>
                </div>

                {/* PM2.5 Safe Limit Bar (Safe standard = 35 µg/m³) */}
                {(() => {
                  const val = Number(activeFocus.pm25) || 0;
                  const limit = 35.0;
                  const pct = Math.round((val / limit) * 100);
                  const isExceeded = val > limit;
                  const barColor = isExceeded ? '#EF4444' : val > 25 ? '#F59E0B' : '#10B981';

                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: barColor }}></span>
                          PM2.5: <strong className="text-white">{val.toFixed(1)}</strong> µg/m³
                        </span>
                        <span className={`text-[11px] font-bold ${isExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {pct}% of Limit (35 µg/m³)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 relative overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (pct / 150) * 100)}%`, backgroundColor: barColor }}
                          className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* PM10 Safe Limit Bar (Safe standard = 50 µg/m³) */}
                {(() => {
                  const val = Number(activeFocus.pm10) || 0;
                  const limit = 50.0;
                  const pct = Math.round((val / limit) * 100);
                  const isExceeded = val > limit;
                  const barColor = isExceeded ? '#EF4444' : val > 35 ? '#F59E0B' : '#10B981';

                  return (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: barColor }}></span>
                          PM10: <strong className="text-white">{val.toFixed(1)}</strong> µg/m³
                        </span>
                        <span className={`text-[11px] font-bold ${isExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {pct}% of Limit (50 µg/m³)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 relative overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, (pct / 150) * 100)}%`, backgroundColor: barColor }}
                          className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Compact Ambient Indicators */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  <span>Temp: <strong className="text-slate-200">{Number(activeFocus.temperature).toFixed(1)}°C</strong></span>
                  <span>Humidity: <strong className="text-slate-200">{Number(activeFocus.humidity).toFixed(1)}%</strong></span>
                </div>
              </div>

              {/* Health Guidance Box */}
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

          {/* Quick Fly-To City Station Switcher with Search & Region Filters */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Quick Station Selector ({filteredStations.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Click to fly
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search station or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Region Pill Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              {REGIONS.map((reg) => (
                <button
                  key={reg}
                  onClick={() => setActiveRegion(reg)}
                  className={`px-2.5 py-1 rounded-md font-medium transition whitespace-nowrap ${
                    activeRegion === reg
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>

            {/* Scrollable Station Grid */}
            <div className="grid grid-cols-2 gap-1.5 max-h-[190px] overflow-y-auto pr-1">
              {filteredStations.length > 0 ? (
                filteredStations.map((cityItem) => {
                  const isSelected = cityItem.city.toLowerCase() === selectedCity.toLowerCase();
                  return (
                    <button
                      key={cityItem.city}
                      onClick={() => flyToCity(cityItem.city)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold border transition text-left ${
                        isSelected
                          ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 shadow-sm'
                          : 'bg-slate-850/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate mr-1">
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span className="truncate">{cityItem.city}</span>
                      </div>
                      <span 
                        style={{ color: cityItem.color_hex === '#FFFF00' ? '#FACC15' : cityItem.color_hex }}
                        className="font-mono text-[11px] shrink-0 font-bold"
                      >
                        {cityItem.aqi}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                  No stations match "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
