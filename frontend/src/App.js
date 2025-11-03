import React, { useState } from 'react';
import axios from 'axios';
import PredictionForm from './components/PredictionForm';
import ResultsPage from './components/ResultsPage';
import { Zap } from 'lucide-react';

function App() {
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePrediction = async (formData) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    try {
      // We are now bypassing the proxy and calling the backend directly
      const response = await axios.post('http://localhost:8080/api/predict', formData);
      setPrediction(response.data);
    } catch (err) {
      console.error("Error fetching prediction:", err);
      let errorMsg = "Failed to get prediction.";
      if (err.response && err.response.status === 500) {
        errorMsg = "The ML service (Python) is not responding. Is it running?";
      } else if (err.code === "ERR_NETWORK") {
        errorMsg = "The backend service (Node.js) is not responding. Is it running?";
      }
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setPrediction(null);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-8 bg-slate-900 text-slate-100 font-sans">
      <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Zap className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            Bengaluru Traffic Predictor
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-white p-4 rounded-lg mb-6 text-center">
            <strong>Error:</strong> {error}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-800 rounded-lg shadow-xl">
            <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-blue-400"></div>
            <p className="mt-4 text-xl font-semibold">Calculating Route & Predicting Traffic...</p>
            <p className="text-slate-400">Fetching real-time data and running model...</p>
          </div>
        )}

        {!prediction && !isLoading && (
          <PredictionForm onPredict={handlePrediction} />
        )}

        {prediction && !isLoading && (
          <ResultsPage predictionData={prediction} onBack={handleBack} />
        )}
      </main>

      <footer className="text-center p-8 text-slate-500 max-w-6xl mx-auto mt-8 border-t border-slate-700">
        Powered by MERN + Python Random Forest Model
      </footer>
    </div>
  );
}

export default App;