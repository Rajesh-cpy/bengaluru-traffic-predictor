import React, { useState } from 'react';
import { MapPin, Calendar, Clock, BarChart2, ShieldCheck, Sun, ArrowRight } from 'lucide-react';

// This component shows the main input form.
function PredictionForm({ onPredict, isLoading }) {
  const [formData, setFormData] = useState({
    from: 'Koramangala',
    to: 'MG Road',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().substring(0, 5),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onPredict(formData);
  };

  return (
    <div className="animate-fadeIn">
      {/* Form Card */}
      <div className="bg-slate-800 shadow-xl rounded-2xl p-6 md:p-8 border border-slate-700">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-10 gap-4 md:gap-6 items-end">
            
            <div className="md:col-span-3">
              <label htmlFor="from" className="block text-sm font-medium text-slate-300 mb-2">From</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" id="from" name="from" value={formData.from} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
              </div>
            </div>

            <div className="md:col-span-3">
              <label htmlFor="to" className="block text-sm font-medium text-slate-300 mb-2">To</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" id="to" name="to" value={formData.to} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-2">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
              </div>
            </div>

            <div className="md:col-span-1">
              <label htmlFor="time" className="block text-sm font-medium text-slate-300 mb-2">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="time" id="time" name="time" value={formData.time} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
              </div>
            </div>
            
            <div className="md:col-span-1">
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-300 transform hover:scale-105 flex items-center justify-center">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Features Section */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold text-white text-center mb-8">How This Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<BarChart2 className="w-10 h-10 text-blue-400" />}
            title="ML Model"
            description="Uses a Random Forest model trained on historical data, including traffic volume, speed, and congestion levels."
          />
          <FeatureCard
            icon={<Sun className="w-10 h-10 text-yellow-400" />}
            title="Real-Time Weather"
            description="The model's prediction is adjusted based on current and forecasted weather conditions, a key factor in traffic flow."
          />
          <FeatureCard
            icon={<ShieldCheck className="w-10 h-10 text-green-400" />}
            title="Live Data Factors"
            description="Our backend simulates real-time inputs like incident reports, roadwork, and public transport usage for your model."
          />
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 text-center flex flex-col items-center">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-slate-400">{description}</p>
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


export default PredictionForm;