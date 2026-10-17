import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useContextEngineStore } from '../store/useContextEngineStore';
import { VynoraLoader } from './common/VynoraLoader';

export default function ProtectedRoute() {
  const { user, authLoading } = useContextEngineStore();

  if (authLoading) {
    return (
      <VynoraLoader
        fullscreen
        message="Loading your world..."
        submessage="Securing your private dashboard..."
        timeoutMs={14000}
      />
    );
  }

  const isAuthenticated = user !== null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
