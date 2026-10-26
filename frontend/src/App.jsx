import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import AQICard from './components/AQICard';
import HistoryChart from './components/HistoryChart';
import AQIScaleReference from './components/AQIScaleReference';
import { getLiveMetrics, getHistoryMetrics } from './api/client';
import { MapPin, RefreshCw, AlertCircle, Info, Sparkles } from 'lucide-react';

const LIVE_POLL_INTERVAL_MS = 15000;

export default function App() {
  // State: Live Stream
  const [liveCities, setLiveCities] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State: Historical Analytics
  const [selectedCity, setSelectedCity] = useState('Manila');
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(50);


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
   * Fetch historical time series for the active city from GET /api/history
   */
  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const result = await getHistoryMetrics({
        city: selectedCity,
        startDate,
        endDate,
        limit
      });
      setHistoryData(result.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [selectedCity, startDate, endDate, limit]);

  // Initial load and 15-second polling loop
  useEffect(() => {
    fetchLive();
    const interval = setInterval(() => {
      fetchLive();
    }, LIVE_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchLive]);

  // Sync historical chart whenever the active city or parameters change
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCitySelect = (cityName) => {
    setSelectedCity(cityName);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120] text-slate-100">
      {/* Platform Navigation */}
      <Navbar
        lastUpdated={lastUpdated}
        onRefresh={() => fetchLive(true)}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">
        {/* Reconnecting Notice Banner (only if network fails) */}
        {isOffline && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3 text-amber-200 text-xs sm:text-sm animate-fade-in shadow-md">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>Connecting to Server:</strong> Synchronizing air quality telemetry. Serving cached data while connecting.
              </span>
            </div>
            <button
              onClick={() => fetchLive(true)}
              disabled={isRefreshing}
              className="px-3 py-1 bg-amber-900/60 hover:bg-amber-800/80 rounded-lg text-xs font-semibold text-amber-100 border border-amber-700/60 transition shrink-0 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Section 1: Real-Time City Telemetry Dashboard */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Real-Time Philippine City Telemetry
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Real-time atmospheric monitoring across major urban centers. Click any card to visualize its historical trend.
              </p>
            </div>


            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sorted by AQI Descending</span>
            </div>
          </div>

          {/* Responsive 4-Column Grid for Manila, Quezon City, Cebu, Davao */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {liveCities.map((metric) => (
              <AQICard
                key={metric.city}
                metric={metric}
                isSelected={selectedCity.toLowerCase() === metric.city.toLowerCase()}
                onSelect={handleCitySelect}
              />
            ))}
          </div>
        </section>

        {/* Section 2: Reference AQI Scale (DENR & US EPA Standard) */}
        <AQIScaleReference />

        {/* Section 3: Interactive Historical Trend & Client-Side Exports */}
        <section>
          <HistoryChart
            historyData={historyData}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            isLoading={isHistoryLoading}
            onRefreshHistory={fetchHistory}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            limit={limit}
            onLimitChange={setLimit}
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
