import React, { useState } from "react";
import axios from "axios";
import PredictionForm from "./components/PredictionForm";
import ResultsPage from "./components/ResultsPage";
import Navbar from "./components/Navbar";
import { motion, AnimatePresence } from "framer-motion";

function App() {
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePrediction = async (formData) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const response = await axios.post("http://localhost:8080/api/predict", formData);
      setPrediction(response.data);
    } catch (err) {
      console.error("Error fetching prediction:", err);
      let errorMsg = "Failed to get prediction.";
      if (err.response && err.response.status === 500) {
        errorMsg = "The ML service (Python) is not responding.";
      } else if (err.code === "ERR_NETWORK") {
        errorMsg = "The backend service (Node.js) is not running.";
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500">
      <Navbar />


      <main className="pt-20 max-w-7xl mx-auto p-4">
        {error && (
          <div className="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-lg mb-6 text-center">
            <strong>Error:</strong> {error}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-100 dark:bg-slate-800 rounded-lg shadow-xl">
            <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
            <p className="mt-4 text-xl font-semibold text-blue-600 dark:text-blue-400">
              Calculating Route & Predicting Traffic...
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Fetching live data and AI model predictions...
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!prediction && !isLoading && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <PredictionForm onPredict={handlePrediction} />
            </motion.div>
          )}

          {prediction && !isLoading && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <ResultsPage predictionData={prediction} onBack={handleBack} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm border-t border-slate-200 dark:border-slate-700 mt-8">
        ⚙️ Powered by MERN + Python ML • Designed by Rajesh
      </footer>
    </div>
  );
}

export default App;
