import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, authLoading } = useContextEngineStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-16 h-16 rounded-full border-t-2 border-primary border-r-2 border-transparent flex items-center justify-center">
          <Sparkles className="text-primary absolute animate-pulse" size={24} />
        </motion.div>
        <p className="text-textMuted mt-4 tracking-wider animate-pulse font-mono">INITIALIZING PEOPLE OS...</p>
      </div>
    );
  }

  const isAuthenticated = user !== null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
