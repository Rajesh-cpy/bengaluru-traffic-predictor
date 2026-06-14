import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function TrafficTrendChart({ predictions, weather }) {
  if (!predictions || !weather) return null;

  const base = predictions.congestion_level;

  // ✔ FIX: Read correct hour field
  const hour =
    predictions.hour ||
    predictions.hour_evaluated ||
    new Date().getHours();

  const weatherImpact = {
    "Partly cloudy": 1.05,
    "Sunny": 0.95,
    "Rainy": 1.25,
    "Thunderstorm": 1.35,
    "Overcast": 1.10,
  };

  const w = weatherImpact[weather.condition] || 1.0;

  const hourlyPattern = {
    6: 0.6,
    8: 1.35,
    10: 1.15,
    12: 0.9,
    14: 0.75,
    16: 1.2,
    18: 1.5,
    20: 0.85,
    22: 0.55,
  };

  const data = Object.entries(hourlyPattern).map(([t, factor]) => ({
    time: `${t} ${t < 12 ? "AM" : "PM"}`,
    congestion: Math.min(base * factor * w, 100),
    speed: Math.max(10, 60 - base * factor * 0.3),
  }));

  return (
    <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-700 p-6 mt-10">
      <h3 className="text-lg font-bold text-blue-300 mb-4">
        📊 AI-Based Hourly Traffic Trend (Model-Inferred)
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "10px",
              color: "white",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="congestion"
            stroke="#f43f5e"
            strokeWidth={3}
            dot={false}
            name="Congestion Level (%)"
          />
          <Line
            type="monotone"
            dataKey="speed"
            stroke="#0ea5e9"
            strokeWidth={3}
            dot={false}
            name="Avg Speed (km/h)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
