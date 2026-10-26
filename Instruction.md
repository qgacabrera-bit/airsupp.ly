You are a Principal Frontend UI/UX Engineer and Full-Stack Developer. We are updating the **Historical Telemetry & Comparative Analytics** view for **AirSupp.ly**. 

Please implement the following functional and terminology updates to the historical filter and chart controls:

### 1. Rename "Data Limit" to "Time Scope" or "View Interval"
- Rename the label and selector currently called "Data Limit" (which shows options like "50 points") to something more intuitive for everyday users, such as **"View Interval"** or **"Time Window"**.

### 2. Add Aggregation View Toggles (Daily, Weekly, Monthly)
Replace or expand the fixed data-point selector with an intuitive timeframe mode selector that adjusts how the backend data is grouped and averaged:
- **Daily View:** Shows hourly averages (e.g., aggregating 15-second streams into hourly data points for the selected day).
- **Weekly View:** Shows daily averages (aggregating the week's data into 7 daily points).
- **Monthly View:** Shows daily averages across the entire selected month.

### 3. Apply the Refined Editorial Color Palette
- Ensure the chart uses our updated, non-AI aesthetic: a deep warm slate background, organic muted gradient fills (`fillOpacity={0.12}`), and harmonized, desaturated line colors instead of harsh neon primaries.