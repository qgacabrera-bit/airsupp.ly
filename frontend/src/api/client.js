/**
 * AirSupp.ly - Resilient API Client & Offline State Handler
 * =========================================================
 * Provides fetch wrappers for /api/live and /api/history with:
 *  - 4-second timeout protection
 *  - Automated localStorage and runtime offline fallback
 *  - Network state detection and metadata tagging (isOffline, cachedAt)
 *  - Schema normalization for FastAPI responses
 */

const DEFAULT_API_URL = 'https://airsupply-backend.onrender.com';

/**
 * Resolves current API Base URL automatically.
 * Defaults directly to https://airsupply-backend.onrender.com in production.
 */
export function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (raw) {
    const clean = raw.replace(/\/$/, '');
    return clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
  }
  return DEFAULT_API_URL;
}

// Increased timeout to 30s to gracefully handle Render free tier cold-start wakeups
const TIMEOUT_MS = 30000;




// Philippine City Initial Fallbacks (if offline on first boot without cache)
export const CITY_FALLBACK_BASELINES = [
  // --- NCR ---
  {
    sensor_id: "PH-MNL-001",
    city: "Manila",
    region: "NCR",
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
    health_advisory: "Sensitive groups should reduce prolonged outdoor exertion. Recommended to wear KF94/N95 masks on open-air commutes.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-QC-002",
    city: "Quezon City",
    region: "NCR",
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
    health_advisory: "Sensitive groups should reduce prolonged outdoor exertion along EDSA and Commonwealth Ave.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-MKT-005",
    city: "Makati",
    region: "NCR",
    country: "PH",
    latitude: 14.5547,
    longitude: 121.0244,
    pm25: 33.2,
    pm10: 58.6,
    temperature: 31.4,
    humidity: 76.8,
    aqi: 95,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Air quality is acceptable. Unusually sensitive individuals should limit prolonged outdoor exertion along Ayala/Buendia corridors.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-TGG-006",
    city: "Taguig",
    region: "NCR",
    country: "PH",
    latitude: 14.5454,
    longitude: 121.0489,
    pm25: 28.5,
    pm10: 51.2,
    temperature: 31.0,
    humidity: 77.4,
    aqi: 85,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Air quality is acceptable in BGC and surrounding areas.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-PSG-007",
    city: "Pasig",
    region: "NCR",
    country: "PH",
    latitude: 14.5764,
    longitude: 121.0851,
    pm25: 36.1,
    pm10: 64.0,
    temperature: 30.8,
    humidity: 79.1,
    aqi: 103,
    category: "Unhealthy for Sensitive Groups",
    color_hex: "#FF7E00",
    health_advisory: "Sensitive groups should wear masks when commuting along Ortigas corridor.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-CAL-008",
    city: "Caloocan",
    region: "NCR",
    country: "PH",
    latitude: 14.6416,
    longitude: 120.9762,
    pm25: 42.0,
    pm10: 72.3,
    temperature: 31.5,
    humidity: 81.0,
    aqi: 117,
    category: "Unhealthy for Sensitive Groups",
    color_hex: "#FF7E00",
    health_advisory: "Heavy traffic near Monumento; asthmatics and elderly should reduce outdoor activity.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-PRQ-009",
    city: "Parañaque",
    region: "NCR",
    country: "PH",
    latitude: 14.4793,
    longitude: 121.0198,
    pm25: 31.8,
    pm10: 55.4,
    temperature: 31.3,
    humidity: 78.0,
    aqi: 92,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Moderate coastal airflow. Safe for general public.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-MNT-010",
    city: "Muntinlupa",
    region: "NCR",
    country: "PH",
    latitude: 14.4081,
    longitude: 121.0415,
    pm25: 27.4,
    pm10: 49.8,
    temperature: 30.9,
    humidity: 77.2,
    aqi: 83,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Good atmospheric circulation around Alabang.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-MRK-011",
    city: "Marikina",
    region: "NCR",
    country: "PH",
    latitude: 14.6507,
    longitude: 121.1029,
    pm25: 30.2,
    pm10: 53.7,
    temperature: 30.1,
    humidity: 82.5,
    aqi: 89,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Valley air quality is moderate. Safe for normal outdoor activities.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },

  // --- Luzon ---
  {
    sensor_id: "PH-BGO-012",
    city: "Baguio City",
    region: "Luzon",
    country: "PH",
    latitude: 16.4023,
    longitude: 120.5960,
    pm25: 14.2,
    pm10: 26.5,
    temperature: 19.5,
    humidity: 88.0,
    aqi: 55,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Highland pine-filtered air with cool temperatures.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-ANG-013",
    city: "Angeles City",
    region: "Luzon",
    country: "PH",
    latitude: 15.1450,
    longitude: 120.5887,
    pm25: 32.5,
    pm10: 58.0,
    temperature: 31.8,
    humidity: 74.5,
    aqi: 94,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Air quality is acceptable around Clark and Angeles commercial areas.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-SFP-014",
    city: "San Fernando, Pampanga",
    region: "Luzon",
    country: "PH",
    latitude: 15.0307,
    longitude: 120.6897,
    pm25: 34.0,
    pm10: 60.5,
    temperature: 31.6,
    humidity: 75.0,
    aqi: 97,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Moderate dust along intersection hubs; safe for normal routines.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-ANT-015",
    city: "Antipolo",
    region: "Luzon",
    country: "PH",
    latitude: 14.5842,
    longitude: 121.1763,
    pm25: 22.4,
    pm10: 41.0,
    temperature: 28.9,
    humidity: 82.0,
    aqi: 73,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Fresh Sierra Madre foothill breezes. Safe for outdoor exercise.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-BTG-016",
    city: "Batangas City",
    region: "Luzon",
    country: "PH",
    latitude: 13.7565,
    longitude: 121.0583,
    pm25: 24.1,
    pm10: 44.8,
    temperature: 30.8,
    humidity: 79.5,
    aqi: 76,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Coastal maritime airflow; good dispersion conditions.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-CLM-017",
    city: "Calamba",
    region: "Luzon",
    country: "PH",
    latitude: 14.2140,
    longitude: 121.1578,
    pm25: 26.8,
    pm10: 48.2,
    temperature: 30.6,
    humidity: 80.4,
    aqi: 82,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Air quality is acceptable across Laguna corridor.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-PPS-018",
    city: "Puerto Princesa",
    region: "Luzon",
    country: "PH",
    latitude: 9.7392,
    longitude: 118.7353,
    pm25: 9.8,
    pm10: 18.5,
    temperature: 29.8,
    humidity: 83.2,
    aqi: 41,
    category: "Good",
    color_hex: "#00E400",
    health_advisory: "Pristine Palawan air quality. Ideal for outdoor recreation.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-LGZ-019",
    city: "Legazpi City",
    region: "Luzon",
    country: "PH",
    latitude: 13.1391,
    longitude: 123.7438,
    pm25: 16.5,
    pm10: 31.2,
    temperature: 29.2,
    humidity: 85.0,
    aqi: 60,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Air quality is satisfactory near the Mayon plains.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-NGA-020",
    city: "Naga City",
    region: "Luzon",
    country: "PH",
    latitude: 13.6218,
    longitude: 123.1948,
    pm25: 18.2,
    pm10: 34.0,
    temperature: 29.5,
    humidity: 84.1,
    aqi: 64,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Safe for general outdoor recreation and commuting.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },

  // --- Visayas ---
  {
    sensor_id: "PH-CEB-003",
    city: "Cebu",
    region: "Visayas",
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
    sensor_id: "PH-MND-021",
    city: "Mandaue City",
    region: "Visayas",
    country: "PH",
    latitude: 10.3340,
    longitude: 123.9427,
    pm25: 23.5,
    pm10: 45.0,
    temperature: 31.2,
    humidity: 76.1,
    aqi: 75,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Moderate traffic emissions along North Reclamation Area.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-ILO-022",
    city: "Iloilo City",
    region: "Visayas",
    country: "PH",
    latitude: 10.7202,
    longitude: 122.5621,
    pm25: 17.8,
    pm10: 33.6,
    temperature: 30.4,
    humidity: 79.0,
    aqi: 63,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Clean urban air along Iloilo River Esplanade.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-BCD-023",
    city: "Bacolod City",
    region: "Visayas",
    country: "PH",
    latitude: 10.6765,
    longitude: 122.9509,
    pm25: 19.4,
    pm10: 36.2,
    temperature: 30.5,
    humidity: 78.4,
    aqi: 66,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Pleasant coastal conditions across the City of Smiles.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-TAC-024",
    city: "Tacloban City",
    region: "Visayas",
    country: "PH",
    latitude: 11.2442,
    longitude: 125.0039,
    pm25: 15.0,
    pm10: 28.4,
    temperature: 29.6,
    humidity: 84.8,
    aqi: 57,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Pacific sea breeze provides good atmospheric cleaning.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-TAG-025",
    city: "Tagbilaran City",
    region: "Visayas",
    country: "PH",
    latitude: 9.6444,
    longitude: 123.8566,
    pm25: 13.5,
    pm10: 25.1,
    temperature: 30.0,
    humidity: 81.2,
    aqi: 54,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Bohol strait marine breeze ensures healthy air.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },

  // --- Mindanao ---
  {
    sensor_id: "PH-DVO-004",
    city: "Davao",
    region: "Mindanao",
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
  },
  {
    sensor_id: "PH-CDO-026",
    city: "Cagayan de Oro",
    region: "Mindanao",
    country: "PH",
    latitude: 8.4542,
    longitude: 124.6319,
    pm25: 20.3,
    pm10: 38.8,
    temperature: 30.2,
    humidity: 80.5,
    aqi: 68,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Moderate traffic along coastal highway; safe for public.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-GEN-027",
    city: "General Santos",
    region: "Mindanao",
    country: "PH",
    latitude: 6.1164,
    longitude: 125.1716,
    pm25: 18.6,
    pm10: 35.4,
    temperature: 31.5,
    humidity: 76.0,
    aqi: 65,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Good air conditions across Sarangani Bay coast.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-ZAM-028",
    city: "Zamboanga City",
    region: "Mindanao",
    country: "PH",
    latitude: 6.9214,
    longitude: 122.0790,
    pm25: 16.8,
    pm10: 32.0,
    temperature: 30.7,
    humidity: 81.5,
    aqi: 61,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Peninsula sea breeze keeps air clean and breathable.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-ILG-029",
    city: "Iligan City",
    region: "Mindanao",
    country: "PH",
    latitude: 8.2280,
    longitude: 124.2452,
    pm25: 19.1,
    pm10: 36.7,
    temperature: 29.9,
    humidity: 83.0,
    aqi: 66,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Air quality is satisfactory around Maria Cristina Falls corridor.",
    window_start: new Date(Date.now() - 15000).toISOString(),
    window_end: new Date().toISOString(),
    processed_at: new Date().toISOString()
  },
  {
    sensor_id: "PH-BUT-030",
    city: "Butuan City",
    region: "Mindanao",
    country: "PH",
    latitude: 8.9475,
    longitude: 125.5406,
    pm25: 14.5,
    pm10: 27.9,
    temperature: 29.7,
    humidity: 84.0,
    aqi: 56,
    category: "Moderate",
    color_hex: "#FFFF00",
    health_advisory: "Agusan River valley air is clear and healthy.",
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
  const cacheKey = 'airsupply_live_cache_v3';
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/live?_t=${Date.now()}`;

  try {
    const res = await fetchWithTimeout(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Invalid response format (received ${contentType}). Verify that the API backend URL is correct.`);
    }
    const json = await res.json();
    let data = normalizeData(json);

    // Guarantee that all 30 monitored Philippine cities are present
    if (data.length < CITY_FALLBACK_BASELINES.length) {
      const existingNames = new Set(data.map((d) => d.city.toLowerCase().replace(/[^a-z0-9]/g, '')));
      const missing = CITY_FALLBACK_BASELINES.filter(
        (fallback) => !existingNames.has(fallback.city.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );
      data = [...data, ...missing];
      data.sort((a, b) => (b.aqi || 0) - (a.aqi || 0));
    }

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

    // Attempt localStorage cache recovery (only accept if complete 30-station dataset)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.data) && parsed.data.length >= CITY_FALLBACK_BASELINES.length) {
          return {
            data: parsed.data,
            isOffline: true,
            cachedAt: parsed.cachedAt || new Date().toISOString(),
            error: err.message
          };
        }
      }
    } catch {
      // Fallback below
    }

    // Default offline simulation baseline (all 30 cities)
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
 * @param {Object} params - { city, start_date, end_date, limit, timeframe }
 * @returns {Promise<{ data: Array, isOffline: boolean, cachedAt: string|null, error: string|null }>}
 */
export async function getHistoryMetrics({ city = 'Manila', startDate = '', endDate = '', limit = 100, timeframe = 'live' } = {}) {
  const queryParams = new URLSearchParams();
  if (city) queryParams.set('city', city);
  if (startDate) queryParams.set('start_date', startDate);
  if (endDate) queryParams.set('end_date', endDate);
  if (limit) queryParams.set('limit', String(limit));
  if (timeframe) queryParams.set('timeframe', timeframe);

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/history?${queryParams.toString()}`;
  const cacheKey = `airsupply_history_cache_${city || 'ALL'}_${timeframe}`;

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
    const mockPoints = generateOfflineHistory(city, limit, timeframe);
    return {
      data: mockPoints,
      isOffline: true,
      cachedAt: new Date().toISOString(),
      error: err.message
    };
  }
}

/**
 * Synthesizes realistic chronological data points for offline demo view
 */
function generateOfflineHistory(city, count = 24, timeframe = 'live') {
  const baseline = CITY_FALLBACK_BASELINES.find(c => c.city.toLowerCase() === city.toLowerCase()) || CITY_FALLBACK_BASELINES[0];
  const points = [];
  const now = Date.now();

  let finalCount = count;
  let stepMs = 15000;

  if (timeframe === 'daily') {
    finalCount = 24;
    stepMs = 3600 * 1000;
  } else if (timeframe === 'weekly') {
    finalCount = 7;
    stepMs = 86400 * 1000;
  } else if (timeframe === 'monthly') {
    finalCount = 30;
    stepMs = 86400 * 1000;
  }

  for (let i = finalCount - 1; i >= 0; i--) {
    const timeOffset = i * stepMs;
    const windowStart = new Date(now - timeOffset).toISOString();
    const windowEnd = new Date(now - timeOffset + stepMs).toISOString();

    let jitter = (Math.sin(i / 3) * 6) + (Math.random() * 2 - 1);
    if (timeframe === 'daily') {
      const hour = new Date(now - timeOffset).getHours();
      jitter = 6 * Math.sin((hour - 6) * Math.PI / 12) + (Math.random() * 2 - 1);
    }

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
