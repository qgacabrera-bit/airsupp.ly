import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Compass, Layers, ShieldCheck, ZoomIn, RotateCcw } from 'lucide-react';

// Default center of the Philippine archipelago
const PHILIPPINES_CENTER = [12.8797, 121.7740];
const DEFAULT_ZOOM = 6;

export default function PhilippineMap({ cities = [], selectedCity = 'Manila', onCitySelect }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);

  // Active selected city data
  const activeFocus = cities.find(
    (c) => c.city.toLowerCase() === selectedCity.toLowerCase()
  ) || cities[0];

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
    };
  }, []);

  // Update Markers dynamically when cities or selection change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || cities.length === 0) return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    cities.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const isSelected = item.city.toLowerCase() === selectedCity.toLowerCase();
      const markerColor = item.color_hex || '#00E400';
      const aqiDisplayColor = markerColor === '#FFFF00' ? '#FACC15' : markerColor;

      // Custom pulsing radar DivIcon
      const customIcon = L.divIcon({
        className: 'custom-aqi-radar-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <!-- Outer radar pulse -->
            <div style="position: absolute; width: ${isSelected ? '38px' : '26px'}; height: ${isSelected ? '38px' : '26px'}; border-radius: 50%; background-color: ${markerColor}; opacity: 0.35; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
            <!-- Secondary halo -->
            <div style="position: absolute; width: ${isSelected ? '22px' : '16px'}; height: ${isSelected ? '22px' : '16px'}; border-radius: 50%; background-color: ${markerColor}; opacity: 0.5;"></div>
            <!-- Central solid dot -->
            <div style="position: relative; width: ${isSelected ? '12px' : '10px'}; height: ${isSelected ? '12px' : '10px'}; border-radius: 50%; background-color: ${markerColor}; border: 2px solid #ffffff; box-shadow: 0 0 12px ${markerColor};"></div>
            <!-- Floating label badge -->
            <div style="position: absolute; top: -28px; white-space: nowrap; background: rgba(15, 23, 42, 0.95); border: 1px solid ${isSelected ? markerColor : 'rgba(255,255,255,0.2)'}; padding: 2.5px 8px; border-radius: 9999px; font-size: 10px; font-family: sans-serif; font-weight: bold; color: #ffffff; display: flex; align-items: center; gap: 5px; box-shadow: 0 6px 16px rgba(0,0,0,0.6); pointer-events: none;">
              <span>${item.city}</span>
              <span style="color: ${aqiDisplayColor}; font-family: monospace; font-size: 11px;">${item.aqi}</span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -22]
      });

      const marker = L.marker([item.latitude, item.longitude], { icon: customIcon });

      // Interactive Popup
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
            <span style="font-size: 10px; color: #94a3b8;">AQI / 500</span>
          </div>
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">
            PM2.5: <strong style="color: #38bdf8;">${Number(item.pm25).toFixed(1)} µg/m³</strong>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px;">
            Temp: ${Number(item.temperature).toFixed(1)}°C | Humidity: ${Number(item.humidity).toFixed(1)}%
          </div>
          <div style="background: rgba(2, 6, 23, 0.6); padding: 6px; border-radius: 6px; font-size: 10px; color: #e2e8f0; line-height: 1.35; border: 1px solid #1e293b;">
            ${item.health_advisory}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'airsupply-leaflet-popup',
        closeButton: false
      });

      marker.on('click', () => {
        onCitySelect(item.city);
      });

      markersGroup.addLayer(marker);
    });
  }, [cities, selectedCity, onCitySelect]);

  // Smoothly fly to city when selected
  const flyToCity = (cityName) => {
    onCitySelect(cityName);
    const target = cities.find((c) => c.city.toLowerCase() === cityName.toLowerCase());
    if (target && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([target.latitude, target.longitude], 10, {
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
        className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15"
        style={{
          background: activeFocus ? activeFocus.color_hex : '#06B6D4'
        }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Philippine Air Quality Map
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Interactive Leaflet geospatial monitoring with real-time sensor radar beacons.
          </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Interactive Leaflet Map Container (7 Columns) */}
        <div className="lg:col-span-7 relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950">
          <div
            ref={mapContainerRef}
            className="w-full h-[440px] sm:h-[500px] z-10"
            style={{ background: '#0B1120' }}
          />

          {/* Map Overlay Badge */}
          <div className="absolute top-3 left-3 z-[400] bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-[11px] font-semibold text-slate-300 flex items-center gap-2 shadow-lg">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span>Leaflet Live Tiles</span>
          </div>
        </div>

        {/* Right Column: Active Station Deep Dive & Quick Selector (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {activeFocus ? (
            <div className="bg-slate-900/80 rounded-2xl p-5 sm:p-6 border border-slate-700/70 shadow-xl relative">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/60">
                    Selected Station
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">
                    {activeFocus.city}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Station Code: {activeFocus.sensor_id}
                  </span>
                </div>

                {/* AQI Dial */}
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

              {/* Category */}
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

          {/* Quick Fly-To City Station Switcher */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
              Available Telemetry Stations (Click to Fly)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {cities.map((cityItem) => {
                const isSelected = cityItem.city.toLowerCase() === selectedCity.toLowerCase();
                return (
                  <button
                    key={cityItem.city}
                    onClick={() => flyToCity(cityItem.city)}
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
