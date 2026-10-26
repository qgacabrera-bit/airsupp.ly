You are a Principal Frontend UI/UX Engineer. We are refining the React PWA dashboard for **AirSupp.ly** (Tagline: *"All Out of Smog"*), our real-time Philippine air quality platform. 

Review the existing frontend code and apply the following **5 UI/UX Polish Upgrades** to enhance visual hierarchy, eliminate clutter, and fix layout grid alignments:

### 1. Fix Telemetry Card Grid Alignment & Text Wrapping
- **Card Grid Layout:** Ensure all city status cards use consistent flex/grid heights (`grid-rows-[auto_auto_auto_1fr]`) so the interior weather boxes and advisory footers align neatly across rows.
- **No Awkward Wrapping:** Wrap PM2.5 and PM10 numeric displays and units in `whitespace-nowrap` containers so values like `35.4 µg/m³` never break onto two lines.
- **Keep Station Codes:** Leave the subtle station code (e.g., `PH-MNL-001`) below the city name as requested.

### 2. Add Visual AQI Progress Bars
- Add a sleek, thin 4px segmented gradient progress bar (`Good` -> `Moderate` -> `USG` -> `Unhealthy` -> `Hazardous`) directly beneath the AQI score inside every telemetry card.
- Position a subtle glowing indicator dot on the bar corresponding to the city's current AQI score relative to a 300 max scale.

### 3. Clean Up Map Marker Overlaps (National View)
- On the **Philippine Air Quality Map**, replace bulky floating text labels (`San Fernando, Pampanga 97`, `Calamba 82`, etc.) in the default national view with **compact circular numeric pins** showing *only* the AQI number (e.g., orange circle with `101`) and a subtle pulsing outer ring.
- Configure full city name/status tooltips to appear cleanly on hover or when a pin is actively selected.

### 4. Remove Redundancy in the Map Station Inspector
- Prevent the right-hand panel of the map section from duplicating the exact same 4 weather/AQI cards shown at the top.
- Turn the "Selected Station" inspector panel into an advanced detail view featuring:
  - A clean 24-hour mini trend sparkline (Recharts `<AreaChart>` with a subtle gradient fill).
  - A pollutant breakdown bar showing how close PM2.5 and PM10 are relative to safe daily limits.

### 5. Smooth State Transitions & Polish
- Ensure all live polling updates (`/api/live` every 15s) transition smoothly without layout shifting or abrupt flashing.
- Keep the dark-mode palette (`#0a0e17` slate background with vibrant status accents) clean, high-contrast, and mobile-responsive.