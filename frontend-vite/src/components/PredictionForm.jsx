import React, { useState } from "react";
import {
  MapPin,
  Calendar,
  Clock,
  BarChart2,
  ShieldCheck,
  Sun,
  ArrowRight,
} from "lucide-react";

// 🔥 Bengaluru Area List (autocomplete dataset)
const AREA_SUGGESTIONS = [
  "Koramangala",
  "MG Road",
  "BTM Layout",
  "Indiranagar",
  "Whitefield",
  "Hebbal",
  "Electronic City",
  "Jayanagar",
  "Basavanagudi",
  "HSR Layout",
  "Marathahalli",
  "Rajajinagar",
  "Yelahanka",
  "Majestic",
  "Banashankari",
  "Ms Palya",
  "Marathahalli",
  "Jp Nagar",
  "Ulsoor",
  "Bellandur",
  "Richmond Town",
  "Kengeri",
];

function PredictionForm({ onPredict, isLoading }) {
  const [formData, setFormData] = useState({
    from: "Koramangala",
    to: "MG Road",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().substring(0, 5),
  });

  // Autocomplete dropdown tracking
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [error, setError] = useState("");

  // ✅ Validate location against known Bengaluru areas
  const isValidLocation = (location) => {
    return AREA_SUGGESTIONS.some(
      (area) => area.toLowerCase() === location.trim().toLowerCase()
    );
  };


  const handleAutocomplete = (value, setter) => {
    if (value.trim() === "") {
      setter([]);
      return;
    }

    const match = AREA_SUGGESTIONS.filter((area) =>
      area.toLowerCase().includes(value.toLowerCase())
    );
    setter(match.slice(0, 5)); // Top 5 results
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "from") handleAutocomplete(value, setFromSuggestions);
    if (name === "to") handleAutocomplete(value, setToSuggestions);
  };

  const handleSelect = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "from") setFromSuggestions([]);
    if (name === "to") setToSuggestions([]);
  };

  const handleSubmit = (e) => {
  e.preventDefault();
  setError("");

  // Frontend validation for wrong locations
  if (!isValidLocation(formData.from) || !isValidLocation(formData.to)) {
    const msg = "Invalid location entered. Please select a valid area.";
    setError(msg);
    console.error("Frontend Validation Error:", {
      from: formData.from,
      to: formData.to,
    });
    return;
  }

  // Call backend only if validation passes
  onPredict(formData).catch((err) => {
    // Backend / ML / Network error handling
    if (err?.response) {
      console.error("Backend Error:", err.response.data);
      setError(err.response.data.message || "Prediction failed.");
    } else {
      console.error("Unexpected Error:", err);
      setError("Prediction service temporarily unavailable.");
    }
  });
};


  return (
    <div className="animate-fadeIn">
      {/* 🟦 Main Form Card */}
      <div className="bg-slate-800 shadow-xl rounded-2xl p-6 md:p-8 border border-slate-700">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-10 gap-4 md:gap-6 items-end">
            {/* FROM FIELD */}
            <div className="md:col-span-3 relative">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                From
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  name="from"
                  value={formData.from}
                  onChange={handleChange}
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 🔽 FROM AUTOCOMPLETE */}
              {fromSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 shadow-lg">
                  {fromSuggestions.map((area, i) => (
                    <li
                      key={i}
                      onClick={() => handleSelect("from", area)}
                      className="px-4 py-2 hover:bg-slate-600 cursor-pointer text-slate-200"
                    >
                      {area}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* TO FIELD */}
            <div className="md:col-span-3 relative">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                To
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  name="to"
                  value={formData.to}
                  onChange={handleChange}
                  autoComplete="off"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 🔽 TO AUTOCOMPLETE */}
              {toSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 shadow-lg">
                  {toSuggestions.map((area, i) => (
                    <li
                      key={i}
                      onClick={() => handleSelect("to", area)}
                      className="px-4 py-2 hover:bg-slate-600 cursor-pointer text-slate-200"
                    >
                      {area}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* DATE */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg"
                />
              </div>
            </div>

            {/* TIME */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Time
              </label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className=" px-4 py-[10px] bg-slate-700 text-white border border-slate-600 rounded-lg"
              />
            </div>

            {/* BUTTON */}
            <div className="md:col-span-1">
                <button
                  type="submit"
                  disabled={isLoading || !formData.from || !formData.to}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50"
                >

                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
      {/* 🔴 ERROR MESSAGE */}
      {error && (
        <div className="mt-4 bg-red-800/40 border border-red-600 text-red-200 px-4 py-3 rounded-lg text-sm text-center">
          ⚠️ {error}
        </div>
      )}


      {/* ⭐ FEATURE SECTION — (unchanged & included as requested) */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          How This Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<BarChart2 className="w-10 h-10 text-blue-400" />}
            title="ML Model"
            description="Uses a Random Forest model trained on historical data, including traffic volume, speed, and congestion levels."
          />

          <FeatureCard
            icon={<Sun className="w-10 h-10 text-yellow-400" />}
            title="Real-Time Weather"
            description="The model prediction adjusts using real-time weather (rain, temp, wind)."
          />

          <FeatureCard
            icon={<ShieldCheck className="w-10 h-10 text-green-400" />}
            title="Live Data Factors"
            description="Simulated real-time inputs like incidents, roadwork, and public transit load."
          />
        </div>
      </div>
    </div>
  );
}

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 text-center flex flex-col items-center">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-slate-400">{description}</p>
  </div>
);

// Fade-in animation
const style = document.createElement("style");
style.innerHTML = `
.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);

export default PredictionForm;
