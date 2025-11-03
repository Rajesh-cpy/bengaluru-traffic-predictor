import React from 'react';
import { ArrowLeft, MapPin, ArrowRight, Cloud, Wind, BarChart2, Zap, Shield, TrafficCone } from 'lucide-react';

// This component shows the results after a prediction.
function ResultsPage({ predictionData, onBack }) {
  // The data structure is new and includes AI-found features
  const { prediction, route, weather, realFeatures } = predictionData;

  const congestion = realFeatures['Congestion Level'];
  let congestionColor = 'bg-green-600';
  let congestionText = 'Low';
  if (congestion > 0.4 && congestion <= 0.7) {
    congestionColor = 'bg-yellow-600';
    congestionText = 'Medium';
  }
  if (congestion > 0.7) {
    congestionColor = 'bg-red-600';
    congestionText = 'High';
  }

  return (
    <div className="animate-fadeIn">
      <button
        onClick={onBack}
        className="flex items-center text-blue-400 hover:text-blue-300 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
        New Prediction
      </button>

      {/* Main Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Map & Route */}
        <div className="lg:col-span-2 bg-slate-800 shadow-2xl rounded-2xl p-6 border border-slate-700">
          <h2 className="text-2xl font-semibold text-white mb-4">Your Route</h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-lg text-slate-300 mb-6">
            <span className="flex items-center font-medium text-white"><MapPin className="w-5 h-5 mr-2 text-green-400" /> {route.from}</span>
            <ArrowRight className="w-6 h-6 text-slate-500 my-2 sm:my-0" />
            <span className="flex items-center font-medium text-white"><MapPin className="w-5 h-5 mr-2 text-red-400" /> {route.to}</span>
          </div>
          
          {/* Map Placeholder */}
          <div className="w-full h-80 md:h-96 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600 overflow-hidden">
            <img 
              src="https://placehold.co/800x600/334155/94a3b8?text=Google%20Maps%20API%20Placeholder" 
              alt="Map placeholder showing route"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        {/* Right Column: Metrics */}
        <div className="flex flex-col gap-6">
          
          {/* Estimated Time Card */}
          <div className="bg-slate-800 shadow-2xl rounded-2xl p-6 border border-slate-700 text-center">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Estimated Travel Time</h3>
            <p className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              {Math.round(prediction.estimated_time_minutes)}
            </p>
            <p className="text-lg text-white">minutes</p>
            <div className={`mt-4 px-4 py-2 rounded-full inline-block text-white font-semibold text-sm ${congestionColor}`}>
              {congestionText} Congestion ({(congestion * 100).toFixed(0)}%)
            </div>
          </div>

          {/* AI-Powered Feature Card */}
          <div className="bg-slate-800 shadow-2xl rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <Zap className="w-6 h-6 text-yellow-400 mr-3" />
              <h3 className="text-xl font-semibold text-white">Live AI-Powered Data</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">Gemini AI found this live data to feed your model:</p>
            <div className="space-y-2 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="flex items-center"><Cloud className="w-5 h-5 mr-2 text-slate-400" /> Weather</span>
                <span className="font-medium text-white">{weather.main}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><Shield className="w-5 h-5 mr-2 text-slate-400" /> Incidents</span>
                <span className="font-medium text-white">{realFeatures['Incident Reports']}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center"><TrafficCone className="w-5 h-5 mr-2 text-slate-400" /> Roadwork</span>
                <span className="font-medium text-white">{realFeatures['Roadwork and Construction Activity']}</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Other Metrics Section */}
      <div className="mt-6 bg-slate-800 shadow-2xl rounded-2xl p-6 border border-slate-700">
        <h2 className="text-2xl font-semibold text-white mb-6">Model Input Features (Found by AI)</h2>
        <p className="text-slate-400 mb-6">Your ML model used these features (found by Gemini AI) to make its prediction:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard title="Route Distance" value={route.distance.toFixed(1)} unit="km" />
          <MetricCard title="Traffic Volume" value={realFeatures['Traffic Volume']} unit="vehicles/hr" />
          <MetricCard title="Avg Speed" value={realFeatures['Average Speed'].toFixed(1)} unit="km/h" />
          <MetricCard title="Parking Usage" value={(realFeatures['Parking Usage'] * 100).toFixed(0)} unit="%" />
        </div>
      </div>

    </div>
  );
}

const MetricCard = ({ title, value, unit }) => (
  <div className="bg-slate-700 p-4 rounded-lg text-center">
    <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider">{title}</h4>
    <p className="text-3xl font-bold text-white mt-2">
      {value} {unit && <span className="text-lg font-medium text-slate-300">{unit}</span>}
    </p>
  </div>
);

// Add this animation style
const style = document.createElement('style');
style.innerHTML = `
.animate-fadeIn {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;
document.head.appendChild(style);

export default ResultsPage;