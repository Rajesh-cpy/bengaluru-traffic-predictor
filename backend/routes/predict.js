const express = require("express");
const axios = require("axios");
const router = express.Router();
const polyline = require("@mapbox/polyline");

require("dotenv").config();

const FLASK_API_URL = process.env.FLASK_API_URL || "http://127.0.0.1:5000/predict";
const ORS_API_KEY = process.env.ORS_API_KEY;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const WEATHER_URL = "https://api.weatherapi.com/v1/current.json";

const BUFFER_MINUTES = 10;

// 🔹 Geocode
async function geocodeLocation(location) {
  console.log(`📍 Geocoding location: ${location}`);
  const res = await axios.get(NOMINATIM_URL, {
    params: { q: `${location}, Bengaluru, India`, format: "json", limit: 1 },
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
  });
  if (!res.data.length) throw new Error(`Location not found: ${location}`);
  const coords = { lat: parseFloat(res.data[0].lat), lon: parseFloat(res.data[0].lon) };
  console.log(`✅ Geocoded ${location}:`, coords);
  return coords;
}

// 🔹 Weather API
async function getWeather(lat, lon, date, time) {
  try {
    console.log(`🌦️ Fetching FUTURE weather for: ${lat}, ${lon} at ${date} ${time}`);

    const hour = parseInt(time.split(":")[0]);

    const response = await axios.get(
      "https://api.weatherapi.com/v1/forecast.json",
      {
        params: {
          key: WEATHER_API_KEY,
          q: `${lat},${lon}`,
          dt: date,
          days: 1,
          aqi: "no"
        }
      }
    );

    const forecastDay = response.data.forecast?.forecastday?.[0];
    if (!forecastDay) {
      throw new Error("No forecast data available for selected date");
    }

    const hourData = forecastDay.hour.find(h => h.time.includes(`${date} ${String(hour).padStart(2,'0')}`));
    
    if (!hourData) {
      console.log("⚠️ Hour not found, using average of the day");
      return {
        condition: forecastDay.day.condition.text,
        temp: forecastDay.day.avgtemp_c,
        humidity: forecastDay.day.avghumidity,
        wind: forecastDay.day.maxwind_kph,
      };
    }

    console.log(`✅ Future Weather: ${hourData.condition.text}, ${hourData.temp_c}°C`);
    return {
      condition: hourData.condition.text,
      temp: hourData.temp_c,
      humidity: hourData.humidity,
      wind: hourData.wind_kph,
    };

  } catch (err) {
    console.error("⚠️ Weather forecast failed:", err.message);
    return { condition: "Clear", temp: 25, humidity: 40, wind: 8 };
  }
}


// 🚀 Main Prediction Route
router.post("/", async (req, res) => {
  try {
    console.log("🧾 Incoming Request:", req.body);
    const { from, to, date, time } = req.body;
    if (!from || !to || !date) {
      console.error("⚠️ Missing required fields:", { from, to, date });
      return res.status(400).json({ error: "Missing required fields (from, to, date)" });
    }

    console.log(`🚗 Predicting traffic from ${from} → ${to} on ${date} ${time || ""}`);

    // Step 1: Geocode both
    const [fromCoords, toCoords] = await Promise.all([
      geocodeLocation(from),
      geocodeLocation(to),
    ]);

    // Step 2: Weather
    const weatherData = await getWeather(fromCoords.lat, fromCoords.lon, date, time);
    const weather = weatherData.condition;

    // Step 3: Route
    console.log("🛰️ Fetching route from OpenRouteService...");
    const routeRes = await axios.post(
      `${ORS_URL}?api_key=${ORS_API_KEY}`,
      { coordinates: [[fromCoords.lon, fromCoords.lat], [toCoords.lon, toCoords.lat]] },
      { headers: { "Content-Type": "application/json" } }
    );
    const routeData = routeRes.data?.routes?.[0]?.summary;
    if (!routeData) throw new Error("No valid route found from OpenRouteService.");
    const distanceKm = routeData.distance / 1000;
    const durationMin = routeData.duration / 60;

    console.log(`🛣️ Distance: ${distanceKm.toFixed(2)} km`);
    console.log(`⏱️ Duration: ${durationMin.toFixed(2)} min`);

    // Step 4: Time Context
    const hour = parseInt(time?.split(":")[0] || new Date().getHours());
    const isPeakHour = hour >= 7 && hour <= 10 || hour >= 17 && hour <= 20 ? 1 : 0;
    let timeContext = "Moderate Flow (Daytime)";
    if (hour >= 7 && hour <= 10) timeContext = "Morning Peak";
    else if (hour >= 17 && hour <= 20) timeContext = "Evening Peak";
    else if (hour >= 22 || hour <= 5) timeContext = "Low Congestion (Night)";
    console.log(`🕒 Time Context: ${timeContext}`);

    // Dynamic congestion baseline
    let roadCapacity = 85;
    let congestionBase = 50;
    if (timeContext.includes("Peak")) {
      roadCapacity = 95;
      congestionBase = 70;
    } else if (timeContext.includes("Low")) {
      roadCapacity = 60;
      congestionBase = 25;
    }

    // Step 5: Prepare ML Input
    const modelFeatures = {
      Date: date,
      Hour: hour,
      Peak_Hour_Flag: isPeakHour,
      "Area Name": from,
      "Road/Intersection Name": to,
      "Average Speed": 0,
      "Travel Time Index": 1.0,
      "Congestion Level": congestionBase,
      "Road Capacity Utilization": roadCapacity,
      "Incident Reports": 1,
      "Environmental Impact": 75,
      "Public Transport Usage": 60,
      "Traffic Signal Compliance": 80,
      "Parking Usage": 65,
      "Pedestrian and Cyclist Count": 100,
      "Weather Conditions": weather,
      "Roadwork and Construction Activity": "No",
      Temp_C: weatherData.temp,
      Humidity: weatherData.humidity,
      Wind_kph: weatherData.wind,
      Time_Context: timeContext,
    };

    console.log("🚀 Sending to ML model:", modelFeatures);
    const mlRes = await axios.post(FLASK_API_URL, modelFeatures, { timeout: 10000 });
    console.log("📊 ML Response:", mlRes.data);

    // Step 6: Parse ML Output
    let { "Traffic Volume": trafficVolume, "Average Speed": averageSpeed, "Congestion Level": congestionLevel } = mlRes.data;
    trafficVolume = Number(trafficVolume) || 0;
    averageSpeed = Number(averageSpeed) || 10;
    congestionLevel = Number(congestionLevel) || 0;

    // 🧠 Step 7: Realism Adjustment
    if (timeContext.includes("Peak")) {
      trafficVolume *= 1.2;
      congestionLevel *= 1.25;
    } else if (timeContext.includes("Low")) {
      trafficVolume *= 0.8;
      congestionLevel *= 0.75;
    }

    // Bound realistic limits
    congestionLevel = Math.min(congestionLevel, 95);
    trafficVolume = Math.min(trafficVolume, 25000);
    averageSpeed = Math.max(averageSpeed, 5);

    console.log(`🎯 Adjusted for realism → Volume: ${trafficVolume.toFixed(0)}, Congestion: ${congestionLevel.toFixed(1)}%`);

    // Step 8: ETA
    const effectiveSpeed = Math.max(averageSpeed, 5);
    const travelTimeMin = (distanceKm / effectiveSpeed) * 60;
    const adjustedTime = travelTimeMin * (1 + congestionLevel / 100) + BUFFER_MINUTES;
    console.log(`🧮 ETA: ${adjustedTime.toFixed(2)} minutes`);

    // Step 9: Decode route
    let routeCoordinates = [];
    try {
      const routeObj = routeRes.data?.routes?.[0];
      if (routeObj?.geometry) {
        const decoded = polyline.decode(routeObj.geometry);
        routeCoordinates = decoded.map((pt) => [pt[0], pt[1]]);
      }
    } catch (err) {
      console.warn("⚠️ Geometry decoding failed:", err.message);
    }

    // ✅ Step 10: Final Response
    return res.status(200).json({
      success: true,
      route: {
        from, to, date,
        distance_km: Number(distanceKm.toFixed(3)),
        duration_min: Number(durationMin.toFixed(2)),
        estimated_time_min: Number(adjustedTime.toFixed(2)),
        geometry: routeCoordinates,
      },
      predictions: {
        traffic_volume: Math.round(trafficVolume),
        average_speed: Number(averageSpeed.toFixed(2)),
        congestion_level: Number(congestionLevel.toFixed(2)),
      },
      weather: weatherData,
      time_context: timeContext,
    });

  } catch (error) {
    console.error("❌ Prediction error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

module.exports = router;
