import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import Global3DBackground from './components/Global3DBackground';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in by checking token in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black/90 backdrop-blur-3xl z-50 fixed inset-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-16 h-16 border-t-4 border-r-4 border-transparent border-t-indigo-500 border-r-purple-500 rounded-full mb-6 filter drop-shadow-[0_0_15px_rgba(139,92,246,0.6)]"
        />
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-bold tracking-[0.2em] text-sm"
        >
          CONNECTING...
        </motion.p>
      </div>
    );
  }

  return (
    <>
      <Global3DBackground />
      <Router>
        <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/" replace />}
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </>
  );
}

export default App;