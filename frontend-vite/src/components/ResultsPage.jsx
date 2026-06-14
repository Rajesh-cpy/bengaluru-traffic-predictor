import React from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import { motion } from "framer-motion";
import L from "leaflet";
import TrafficTrendChart from "./TrafficTrendChart";
import "leaflet/dist/leaflet.css";
import {
  FaCloudSun,
  FaTrafficLight,
  FaRoute,
  FaClock,
  FaCarSide,
  FaRoad,
  FaTint,
  FaWind,
  FaMapMarkerAlt,
} from "react-icons/fa";

// Color function for congestion
const congestionColor = (value) => {
  if (value >= 50) return "#e02424"; // red
  if (value >= 30) return "#ffaa00"; // orange
  return "#00c16a"; // green
};

// Custom Leaflet markers
const StartIcon = new L.Icon({
  iconUrl:
    "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-green.png",
  iconSize: [30, 45],
  iconAnchor: [12, 41],
});
const EndIcon = new L.Icon({
  iconUrl:
    "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png",
  iconSize: [30, 45],
  iconAnchor: [12, 41],
});

export default function ResultsPage({ predictionData, onBack }) {
  const { route, predictions, weather, time_context } = predictionData || {};

  const { geometry } = route || {};

  const center =
    geometry && geometry.length
      ? geometry[Math.floor(geometry.length / 2)]
      : [12.9716, 77.5946];

  // AI summary
  const aiSummary =
    predictions.congestion_level > 50
      ? "🚨 Heavy congestion expected. Major delays possible!"
      : predictions.congestion_level > 40
      ? "⚠️ Moderate traffic — expect some slowdowns."
      : "✅ Clear route — smooth drive ahead!";

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-6 space-y-8 transition-all duration-500">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 z-50 relative">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-400 flex items-center gap-2">
            <FaMapMarkerAlt /> {route.from} → {route.to}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Distance: {route.distance_km} km • Date: {route.date}
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg transition-transform transform hover:scale-105"
        >
          ← Back
        </button>
      </div>

      {/* Summary banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-blue-600 via-cyan-500 to-green-400 text-white shadow-lg"
      >
        {aiSummary}
      </motion.div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative z-0">
        {/* Map Section */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-2 bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-300"
          style={{
            minHeight: "350px",
            overflow: "hidden",
            position: "relative",
            zIndex: 0,
          }}
        >
          <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={false}
            style={{
              height: "650px",
              width: "100%",
              zIndex: 0,
            }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution="© OpenStreetMap & CartoDB"
            />
            {geometry && geometry.length > 0 && (
              <>
                <Polyline
                  positions={geometry}
                  pathOptions={{
                    color: congestionColor(predictions.congestion_level),
                    weight: 6,
                    opacity: 0.9,
                  }}
                />
                <Marker position={geometry[0]} icon={StartIcon}>
                  <Popup>Start: {route.from}</Popup>
                </Marker>
                <Marker position={geometry[geometry.length - 1]} icon={EndIcon}>
                  <Popup>End: {route.to}</Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </motion.div>

        {/* Side analytics */}
        <div className="flex flex-col gap-6">
          {/* Weather Card */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-blue-900/70 to-blue-800/60 rounded-2xl shadow-lg p-6 border border-blue-700"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-blue-300 flex items-center gap-2">
                <FaCloudSun /> Weather Conditions
              </h3>
              <img
                src="https://cdn-icons-png.flaticon.com/512/1163/1163661.png"
                alt="weather"
                className="w-10 h-10"
              />
            </div>
            <div className="mt-3 space-y-1 text-gray-200">
              <p className="text-xl font-semibold">
                {weather.condition} • {weather.temp}°C
              </p>
              <p className="text-sm flex items-center gap-3 text-gray-300">
                <FaTint /> Humidity: {weather.humidity}% <FaWind /> Wind: {weather.wind} km/h
              </p>
            </div>
          </motion.div>
          


          {/* Traffic Analytics */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900 rounded-2xl shadow-lg border border-slate-700 p-6"
          >
            <h3 className="text-lg font-bold text-blue-300 flex items-center gap-2 mb-3">
              <FaTrafficLight /> Traffic Analytics
            </h3>
            <Metric label="Traffic Volume" value={predictions.traffic_volume.toFixed(0)} />
            <Metric label="Average Speed" value={`${predictions.average_speed.toFixed(1)} km/h`} />
            <Metric
              label="Congestion Level"
              value={`${predictions.congestion_level.toFixed(1)}%`}
              color={congestionColor(predictions.congestion_level)}
            />
          </motion.div>

          {/* Route Summary */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900 rounded-2xl shadow-lg border border-slate-700 p-6"
          >
            <h3 className="text-lg font-bold text-blue-300 flex items-center gap-2 mb-3">
              <FaRoute /> Route Summary
            </h3>
            <SummaryItem icon={<FaRoad />} label="Distance" value={`${route.distance_km.toFixed(2)} km`} />
            <SummaryItem icon={<FaCarSide />} label="Estimated Time" value={`${route.estimated_time_min.toFixed(1)} min`} />
          </motion.div>
        </div>
      </div>
      <TrafficTrendChart predictions={predictions} weather={weather} />
      {/* Route Insights Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
        <InsightCard
          title="Speed Trend"
          description={`The average speed (${predictions.average_speed.toFixed(1)} km/h) indicates ${
            predictions.average_speed < 20 ? "heavy" : predictions.average_speed < 40 ? "moderate" : "smooth"
          } traffic flow.`}
        />
        <InsightCard
          title="Congestion Analysis"
          description={`The congestion level of ${predictions.congestion_level.toFixed(
            1
          )}% suggests ${
            predictions.congestion_level > 70
              ? "high traffic density — expect delays."
              : "moderate to light flow — route is manageable."
          }`}
        />
        <InsightCard
          title="Route Suggestion"
          description="Based on real-time data, the route is stable. Avoid peak hours (8–10 AM, 6–8 PM) for smoother travel."
        />
      </div>
      
    </div>
    
  );
  
}

// Reusable small components
function Metric({ label, value, color }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="font-bold text-lg" style={{ color: color || "#fff" }}>
        {value}
      </span>
    </div>
  );
}

function SummaryItem({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between bg-slate-800/60 p-2 rounded-lg mb-2">
      <div className="flex items-center gap-2 text-sm text-gray-300">{icon} {label}</div>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function InsightCard({ title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 bg-gradient-to-br from-blue-800/40 to-slate-900/60 text-gray-200 border border-blue-700 shadow-lg"
    >
      <h4 className="text-lg font-semibold text-blue-300 mb-2">{title}</h4>
      <p className="text-sm text-gray-300 leading-relaxed">{description}</p>
    </motion.div>
  );
}


      
