import React, { useEffect, useState } from "react";
import { Sun, Moon, Zap } from "lucide-react";

export default function Navbar() {
  const [darkMode, setDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  // Apply/remove dark mode on body
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  return (
    <nav className="w-full flex justify-between items-center px-6 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm fixed top-0 left-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600/20 rounded-lg">
          <Zap className="w-6 h-6 text-blue-500 dark:text-blue-400" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          Bengaluru Traffic Predictor
        </h1>
      </div>

    </nav>
  );
}
