import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import AQICard from './components/AQICard';
import HistoryChart from './components/HistoryChart';
import AQIScaleReference from './components/AQIScaleReference';
import PhilippineMap, { CITY_REGION_MAP } from './components/PhilippineMap';
import InfoTooltip from './components/InfoTooltip';
import { getLiveMetrics, getHistoryMetrics, CITY_FALLBACK_BASELINES } from './api/client';

import { 
  MapPin, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  Sparkles, 
  Filter, 
  ArrowUpDown, 
  ChevronDown, 
  ChevronUp, 
  ChevronsDown 
} from 'lucide-react';

const LIVE_POLL_INTERVAL_MS = 15000;

export default function App() {
  // State: Live Stream initialized with full 30 Philippine stations
  const [liveCities, setLiveCities] = useState(CITY_FALLBACK_BASELINES);
  const [cardRegion, setCardRegion] = useState('All');
  const [visibleCount, setVisibleCount] = useState(4);
  const [sortBy, setSortBy] = useState('aqi_desc');
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State: Historical Analytics with Dual-City Comparison
  const [selectedCity, setSelectedCity] = useState('Manila');
  const [compareCity, setCompareCity] = useState('Quezon City');
  const [historyData, setHistoryData] = useState([]);
  const [compareHistoryData, setCompareHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(50);
  const [timeframe, setTimeframe] = useState('live');
  const [selectionTimestamp, setSelectionTimestamp] = useState(0);

  /**
   * Fetch latest live metrics from GET /api/live
   */
  const fetchLive = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const result = await getLiveMetrics();
      setLiveCities(result.data);
      setIsOffline(result.isOffline);
      setLastUpdated(result.cachedAt || new Date().toISOString());
    } catch (err) {
      console.error('Error fetching live metrics:', err);
      setIsOffline(true);
    } finally {
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  /**
   * Fetch historical time series for active city (and optional comparison city) from GET /api/history
   */
  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        getHistoryMetrics({ city: selectedCity, startDate, endDate, limit, timeframe }),
        compareCity && compareCity !== 'none' && compareCity.toLowerCase() !== selectedCity.toLowerCase()
          ? getHistoryMetrics({ city: compareCity, startDate, endDate, limit, timeframe })
          : Promise.resolve({ data: [] })
      ]);
      setHistoryData(res1.data || []);
      setCompareHistoryData(res2.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [selectedCity, compareCity, startDate, endDate, limit, timeframe]);

  // Initial load and 15-second polling loop
  useEffect(() => {
    fetchLive();
    const interval = setInterval(() => {
      fetchLive();
    }, LIVE_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchLive]);

  // Sync historical chart whenever the active city, compare city, or parameters change
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCitySelect = (cityName) => {
    setSelectedCity(cityName);
    setSelectionTimestamp(Date.now());
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1329] text-slate-100">
      {/* Platform Navigation */}
      <Navbar
        lastUpdated={lastUpdated}
        onRefresh={() => fetchLive(true)}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">

        {/* Section 1: Real-Time City Telemetry Dashboard */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-400" />
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center">
                  Real-Time Philippine City Telemetry
                  <InfoTooltip text="Real-time atmospheric monitoring across major urban centers. Click any card to visualize its historical trend." />
                </h2>
              </div>
            </div>

            {/* Interactive Sorting Dropdown */}
            <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/80 p-1.5 rounded-xl border border-white/[0.06] shadow-sm">
              <label htmlFor="card-sort" className="text-xs text-slate-400 flex items-center gap-1.5 pl-1.5 font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">Sort:</span>
              </label>
              <select
                id="card-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-800/90 hover:bg-slate-800 border border-white/[0.08] text-teal-300 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-400/50 cursor-pointer transition shadow-sm"
              >
                <option value="aqi_desc" className="bg-slate-900 text-slate-200">AQI: Highest First</option>
                <option value="aqi_asc" className="bg-slate-900 text-slate-200">AQI: Lowest First (Cleanest)</option>
                <option value="name_asc" className="bg-slate-900 text-slate-200">Alphabetical: A → Z</option>
                <option value="name_desc" className="bg-slate-900 text-slate-200">Alphabetical: Z → A</option>
              </select>
            </div>
          </div>

          {/* Region Tabs with Soft Teal Branding */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 text-xs font-semibold">
            {['All', 'NCR', 'Luzon', 'Visayas', 'Mindanao'].map((reg) => {
              const count = reg === 'All' 
                ? liveCities.length 
                : liveCities.filter((c) => (c.region || CITY_REGION_MAP[c.city] || '') === reg).length;
              const isActive = cardRegion === reg;
              return (
                <button
                  key={reg}
                  onClick={() => {
                    setCardRegion(reg);
                    setVisibleCount(4); // Reset to top 4 cards on region switch
                  }}
                  className={`px-3 py-1.5 rounded-xl border transition whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold shadow-md shadow-teal-950/20'
                      : 'bg-slate-900/60 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  {reg} ({count})
                </button>
              );
            })}
          </div>

          {/* Responsive Grid of City Cards (Clean 4-column responsive layout without horizontal overlap) */}
          {(() => {
            // Filter by selected region
            const regionList = liveCities.filter((metric) => {
              if (cardRegion === 'All') return true;
              const reg = metric.region || CITY_REGION_MAP[metric.city] || '';
              return reg.toLowerCase() === cardRegion.toLowerCase();
            });

            // Sort according to user preference
            const sortedList = [...regionList].sort((a, b) => {
              if (sortBy === 'aqi_desc') return (b.aqi || 0) - (a.aqi || 0);
              if (sortBy === 'aqi_asc') return (a.aqi || 0) - (b.aqi || 0);
              if (sortBy === 'name_asc') return a.city.localeCompare(b.city);
              if (sortBy === 'name_desc') return b.city.localeCompare(a.city);
              return 0;
            });

            const displayed = sortedList.slice(0, visibleCount);

            return (
              <div className="space-y-4 w-full min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full min-w-0">
                  {displayed.map((metric) => (
                    <AQICard
                      key={metric.city}
                      metric={metric}
                      isSelected={selectedCity.toLowerCase() === metric.city.toLowerCase()}
                      onSelect={handleCitySelect}
                    />
                  ))}
                </div>

                {/* Progressive Expansion and Collapse Controls */}
                {sortedList.length > 4 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/60">
                    <span className="text-xs text-slate-400 font-medium order-2 sm:order-1">
                      Showing <strong className="text-teal-300 font-bold">{displayed.length}</strong> of{' '}
                      <strong className="text-white font-bold">{sortedList.length}</strong> stations
                    </span>

                    <div className="flex flex-wrap items-center gap-2 order-1 sm:order-2">
                      {/* See More Button */}
                      {visibleCount < sortedList.length && (
                        <button
                          onClick={() => setVisibleCount((prev) => Math.min(prev + 8, sortedList.length))}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/[0.08] text-xs font-semibold text-teal-300 hover:text-teal-200 transition active:scale-95 shadow-sm"
                        >
                          <ChevronDown className="w-4 h-4 text-teal-400" />
                          <span>See More</span>
                        </button>
                      )}

                      {/* See All Button */}
                      {visibleCount < sortedList.length && (
                        <button
                          onClick={() => setVisibleCount(sortedList.length)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white transition active:scale-95 shadow-md shadow-teal-950/40"
                        >
                          <ChevronsDown className="w-4 h-4" />
                          <span>See All ({sortedList.length})</span>
                        </button>
                      )}

                      {/* Collapse Back to Top 4 */}
                      {visibleCount > 4 && (
                        <button
                          onClick={() => setVisibleCount(4)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition active:scale-95 shadow-sm"
                        >
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                          <span>Collapse to Top 4</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        {/* Section 2: Interactive Philippine Air Quality Map */}
        <section>
          <PhilippineMap
            cities={liveCities}
            selectedCity={selectedCity}
            selectionTimestamp={selectionTimestamp}
            onCitySelect={handleCitySelect}
          />
        </section>

        {/* Section 3: Reference AQI Scale (DENR & US EPA Standard) */}
        <AQIScaleReference />

        {/* Section 4: Interactive Historical Trend & Client-Side Exports */}

        <section>
          <HistoryChart
            historyData={historyData}
            compareHistoryData={compareHistoryData}
            selectedCity={selectedCity}
            compareCity={compareCity}
            onCityChange={setSelectedCity}
            onCompareCityChange={setCompareCity}
            isLoading={isHistoryLoading}
            onRefreshHistory={fetchHistory}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            limit={limit}
            onLimitChange={setLimit}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
          />
        </section>
      </main>

      {/* Footer & Telemetry Provenance */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 px-4 sm:px-8 text-xs text-slate-400 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">AirSupp.ly</span>
            <span>—</span>
            <span className="italic">"All Out of Smog"</span>
          </div>
          <div className="text-slate-400">
            Engineered with Apache Kafka KRaft, PySpark Structured Streaming, MongoDB 7.0 & FastAPI.
          </div>
          <div className="text-slate-400 font-mono">
            Philippine Standard Time (PST / UTC+8)
          </div>
        </div>
      </footer>
    </div>
  );
}
