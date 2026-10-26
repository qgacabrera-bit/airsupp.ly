/**
 * AirSupp.ly - Resilient API Client & Offline State Handler
 * =========================================================
 * Provides fetch wrappers for /api/live and /api/history with:
 *  - 4-second timeout protection
 *  - Automated localStorage and runtime offline fallback
 *  - Network state detection and metadata tagging (isOffline, cachedAt)
 *  - Schema normalization for FastAPI responses
 */

/**
 * Resolves current API Base URL from:
 * 1. User runtime localStorage override (airsupply_custom_api_url)
 * 2. Vite environment variable (VITE_API_URL)
 * 3. Default empty string (relative path / proxy)
 */
export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('airsupply_custom_api_url');
    if (custom && custom.trim()) {
      const clean = custom.trim().replace(/\/$/, '');
      return clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
    }
  }
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (raw) {
    const clean = raw.replace(/\/$/, '');
    return clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
  }
  return '';
}

export function setCustomApiUrl(url) {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      const clean = url.trim().replace(/\/$/, '');
      localStorage.setItem('airsupply_custom_api_url', clean);
    } else {
      localStorage.removeItem('airsupply_custom_api_url');
    }
  }
}

const TIMEOUT_MS = 5000;



// Philippine City Initial Fallbacks (if offline on first boot without cache)
export const CITY_FALLBACK_BASELINES = [
  {
    sensor_id: "PH-MNL-001",
    city: "Manila",
    country: "PH",
    latitude: 14.5995,
    longitude: 120.9842,
    pm25: 35.4,
    pm10: 62.1,
    temperature: 31.2,
    humidity: 78.5,
    aqi: 101,
    category: "Unhealthy for Sensitive Groups",
    color_hex: "#FF7E00",
    health_advisory: "Sensitive groups (asthmatics, elderly, children) should reduce prolonged outdoor exertion. Recommended to wear KF94/N95 masks on open-air jeepney/tricycle commutes.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-QC-002",
    city: "Quezon City",
    country: "PH",
    latitude: 14.6760,
    longitude: 121.0437,
    pm25: 39.8,
    pm10: 68.4,
    temperature: 30.5,
    humidity: 80.2,
    aqi: 111,
    category: "Unhealthy for Sensitive Groups",
    color_hex: "#FF7E00",
    health_advisory: "Sensitive groups should reduce prolonged outdoor exertion along EDSA. Wear well-fitted masks.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-CEB-003",
    city: "Cebu",
    country: "PH",
    latitude: 10.3157,
    longitude: 123.8854,
    pm25: 21.6,
    pm10: 41.2,
    temperature: 31.0,
    humidity: 75.0,
    aqi: 71,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Air quality is acceptable. Unusually sensitive individuals should limit prolonged outdoor exertion along congested areas.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-DVO-004",
    city: "Davao",
    country: "PH",
    latitude: 7.1907,
    longitude: 125.4553,
    pm25: 15.2,
    pm10: 29.5,
    temperature: 29.4,
    humidity: 82.4,
    aqi: 57,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Air quality is generally safe for outdoor activities.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  }
];

/**
 * Fetch wrapper with timeout abort controller
 */
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = TIMEOUT_MS } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Normalizes list results from FastAPI response object { data: [...] } or direct array [...]
 */
function normalizeData(result) {
  if (Array.isArray(result)) {
    return result;
  }
  if (result && Array.isArray(result.data)) {
    return result.data;
  }
  return [];
}

/**
 * Fetches latest 15-second city snapshots from GET /api/live
 * @returns {Promise<{ data: Array, isOffline: boolean, cachedAt: string|null, error: string|null }>}
 */
export async function getLiveMetrics() {
  const cacheKey = 'airsupply_live_cache';
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/live`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Invalid response format (received ${contentType}). Verify that the API backend URL is correct.`);
    }
    const json = await res.json();
    const data = normalizeData(json);

    // Save fresh snapshot to localStorage cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        cachedAt: new Date().toISOString()
      }));
    } catch {
      // Ignore storage quota errors
    }

    return {
      data,
      isOffline: false,
      cachedAt: null,
      error: null
    };
  } catch (err) {
    console.warn(`[AirSupp.ly API] Live fetch failed (${err.message}) on ${url}. Serving cached fallback...`);

    // Attempt localStorage cache recovery
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          data: parsed.data || CITY_FALLBACK_BASELINES,
          isOffline: true,
          cachedAt: parsed.cachedAt || new Date().toISOString(),
          error: err.message
        };
      }
    } catch {
      // Fallback below
    }

    // Default offline simulation baseline
    return {
      data: CITY_FALLBACK_BASELINES,
      isOffline: true,
      cachedAt: new Date().toISOString(),
      error: err.message
    };
  }
}

/**
 * Queries historical time-series data from GET /api/history
 * @param {Object} params - { city, start_date, end_date, limit }
 * @returns {Promise<{ data: Array, isOffline: boolean, cachedAt: string|null, error: string|null }>}
 */
export async function getHistoryMetrics({ city = 'Manila', startDate = '', endDate = '', limit = 100 } = {}) {
  const queryParams = new URLSearchParams();
  if (city) queryParams.set('city', city);
  if (startDate) queryParams.set('start_date', startDate);
  if (endDate) queryParams.set('end_date', endDate);
  if (limit) queryParams.set('limit', String(limit));

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/history?${queryParams.toString()}`;
  const cacheKey = `airsupply_history_cache_${city || 'ALL'}`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Invalid response format (received ${contentType}). Verify that the API backend URL is correct.`);
    }
    const json = await res.json();
    const data = normalizeData(json);


    // Cache historical batch
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        cachedAt: new Date().toISOString()
      }));
    } catch {
      // Ignore storage errors
    }

    return {
      data,
      isOffline: false,
      cachedAt: null,
      error: null
    };
  } catch (err) {
    console.warn(`[AirSupp.ly API] History fetch failed (${err.message}). Recovering from cache...`);

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          data: parsed.data || [],
          isOffline: true,
          cachedAt: parsed.cachedAt || new Date().toISOString(),
          error: err.message
        };
      }
    } catch {
      // Ignore
    }

    // Generate synthesized chronological trend for offline demonstration if no history cached yet
    const mockPoints = generateOfflineHistory(city, limit);
    return {
      data: mockPoints,
      isOffline: true,
      cachedAt: new Date().toISOString(),
      error: err.message
    };
  }
}

/**
 * Synthesizes realistic 15-second chronological data points for offline demo view
 */
function generateOfflineHistory(city, count = 24) {
  const baseline = CITY_FALLBACK_BASELINES.find(c => c.city.toLowerCase() === city.toLowerCase()) || CITY_FALLBACK_BASELINES[0];
  const points = [];
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const timeOffset = i * 15000;
    const windowStart = new Date(now - timeOffset).toISOString();
    const windowEnd = new Date(now - timeOffset + 15000).toISOString();
    const jitter = (Math.sin(i / 3) * 6) + (Math.random() * 2 - 1);
    const pm25 = Math.max(5, +(baseline.pm25 + jitter).toFixed(1));
    const aqi = Math.max(10, Math.round(baseline.aqi + jitter * 2.2));

    points.push({
      city: baseline.city,
      pm25,
      pm10: +(baseline.pm10 + jitter * 1.5).toFixed(1),
      temperature: +(baseline.temperature + (Math.random() * 0.4 - 0.2)).toFixed(1),
      humidity: +(baseline.humidity + (Math.random() * 1.0 - 0.5)).toFixed(1),
      aqi,
      category: aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : aqi <= 150 ? "Unhealthy for Sensitive Groups" : "Unhealthy",
      color_hex: aqi <= 50 ? "#00E400" : aqi <= 100 ? "#FFFF00" : aqi <= 150 ? "#FF7E00" : "#FF0000",
      health_advisory: baseline.health_advisory,
      window_start: windowStart,
      window_end: windowEnd,
      processed_at: windowEnd
    });
  }
  return points;
}
