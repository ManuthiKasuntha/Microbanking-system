import React from 'react';
import { Navigate } from 'react-router-dom';
import { endSession, hasValidSession } from './session';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  if (!hasValidSession()) {
    endSession();
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
