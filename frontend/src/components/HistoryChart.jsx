import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { exportToPDF, exportToExcel, exportToCSV } from '../utils/exportUtils';

const CITIES = [
  // NCR
  'Manila', 'Quezon City', 'Makati', 'Taguig', 'Pasig', 'Caloocan', 'Parañaque', 'Muntinlupa', 'Marikina',
  // Luzon
  'Baguio City', 'Angeles City', 'San Fernando, Pampanga', 'Antipolo', 'Batangas City', 'Calamba', 'Puerto Princesa', 'Legazpi City', 'Naga City',
  // Visayas
  'Cebu', 'Mandaue City', 'Iloilo City', 'Bacolod City', 'Tacloban City', 'Tagbilaran City',
  // Mindanao
  'Davao', 'Cagayan de Oro', 'General Santos', 'Zamboanga City', 'Iligan City', 'Butuan City'
];

// Custom Glassmorphic Tooltip for Recharts
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-panel p-3.5 rounded-xl border border-slate-700/80 shadow-2xl text-xs space-y-1.5 min-w-[180px]">
        <div className="font-mono text-[11px] text-slate-400 border-b border-slate-800 pb-1">
          {label}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-300 font-medium">City:</span>
          <span className="font-bold text-white">{data.city}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-300 font-medium">AQI Score:</span>
          <span
            style={{ color: data.color_hex || '#00E400' }}
            className="font-bold text-sm"
          >
            {data.aqi} ({data.category})
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-300 font-medium">PM2.5:</span>
          <span className="font-mono font-semibold text-cyan-400">{data.pm25} µg/m³</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-300 font-medium">PM10:</span>
          <span className="font-mono text-slate-300">{data.pm10} µg/m³</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
          <span>Temp / Hum:</span>
          <span>{data.temperature}°C | {data.humidity}%</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function HistoryChart({
  historyData,
  selectedCity,
  onCityChange,
  isLoading,
  onRefreshHistory,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  limit,
  onLimitChange
}) {
  const [activeMetric, setActiveMetric] = useState('both'); // 'both', 'aqi', 'pm25'

  // Format timestamp for X-Axis tick (shows HH:mm:ss in Philippine time or UTC)
  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    try {
      const parts = tickItem.split('T');
      if (parts.length > 1) {
        return parts[1].replace('Z', '').slice(0, 8);
      }
      return tickItem.slice(-8);
    } catch {
      return tickItem;
    }
  };

  const handleExportPDF = () => {
    exportToPDF(historyData, { city: selectedCity, startDate, endDate });
  };

  const handleExportExcel = () => {
    exportToExcel(historyData, { city: selectedCity });
  };

  const handleExportCSV = () => {
    exportToCSV(historyData, { city: selectedCity });
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-7 border border-slate-800 shadow-xl">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Historical Windowed Telemetry & Trends
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregated over 15-second tumbling windows with 30-second watermarking via Apache Spark.
          </p>
        </div>

        {/* 3 Prominent Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={handleExportPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-95 text-xs font-semibold text-white shadow-md shadow-rose-900/20 transition"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF Report</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        {/* City Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" />
            <span>City Focus</span>
          </label>
          <select
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full bg-slate-800/90 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-cyan-400 focus:outline-none"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date-Time */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>Start Date (UTC)</span>
          </label>
          <input
            type="text"
            placeholder="YYYY-MM-DD or ISO"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full bg-slate-800/90 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-1 focus:ring-cyan-400 focus:outline-none"
          />
        </div>

        {/* End Date-Time */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>End Date (UTC)</span>
          </label>
          <input
            type="text"
            placeholder="YYYY-MM-DD or ISO"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full bg-slate-800/90 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-1 focus:ring-cyan-400 focus:outline-none"
          />
        </div>

        {/* Limit & Filter Action */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Data Limit
            </label>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="w-full bg-slate-800/90 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-cyan-400 focus:outline-none"
            >
              <option value={20}>20 points</option>
              <option value={50}>50 points</option>
              <option value={100}>100 points</option>
              <option value={250}>250 points</option>
            </select>
          </div>

          <button
            onClick={onRefreshHistory}
            disabled={isLoading}
            className="px-3.5 py-1.5 h-[34px] rounded-lg bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-xs font-semibold text-white flex items-center gap-1 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* Chart Metric Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveMetric('both')}
            className={`px-3 py-1 rounded-md transition ${
              activeMetric === 'both' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            AQI & PM2.5 Combined
          </button>
          <button
            onClick={() => setActiveMetric('aqi')}
            className={`px-3 py-1 rounded-md transition ${
              activeMetric === 'aqi' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            AQI Index Only
          </button>
          <button
            onClick={() => setActiveMetric('pm25')}
            className={`px-3 py-1 rounded-md transition ${
              activeMetric === 'pm25' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            PM2.5 Only (µg/m³)
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {historyData.length} timeline points
        </span>
      </div>

      {/* Recharts ResponsiveContainer */}
      <div className="w-full h-[360px] sm:h-[420px]">
        {historyData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
            <BarChart3 className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm">No historical telemetry points available for this range.</p>
            <span className="text-xs text-slate-500 mt-1">
              Ensure Spark Structured Streaming is sinking to MongoDB collection `history_logs`.
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={historyData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="pm25Gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />

              <XAxis
                dataKey="window_start"
                tickFormatter={formatXAxis}
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
              />

              <YAxis
                yAxisId="left"
                domain={[0, 'auto']}
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
              />

              {activeMetric === 'both' && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 'auto']}
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                />
              )}

              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />

              {/* Standard EPA Reference Breakpoints */}
              <ReferenceLine
                yAxisId="left"
                y={50}
                stroke="#00E400"
                strokeDasharray="4 4"
                label={{ value: 'Good (50)', fill: '#00E400', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                yAxisId="left"
                y={100}
                stroke="#FFFF00"
                strokeDasharray="4 4"
                label={{ value: 'Moderate (100)', fill: '#FFFF00', fontSize: 10, position: 'right' }}
              />
              <ReferenceLine
                yAxisId="left"
                y={150}
                stroke="#FF7E00"
                strokeDasharray="4 4"
                label={{ value: 'Sensitive (150)', fill: '#FF7E00', fontSize: 10, position: 'right' }}
              />

              {(activeMetric === 'both' || activeMetric === 'aqi') && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="aqi"
                  name="AQI Score"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#aqiGradient)"
                />
              )}

              {(activeMetric === 'both' || activeMetric === 'pm25') && (
                <Line
                  yAxisId={activeMetric === 'both' ? 'right' : 'left'}
                  type="monotone"
                  dataKey="pm25"
                  name="PM2.5 (µg/m³)"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#F59E0B' }}
                  activeDot={{ r: 5 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
