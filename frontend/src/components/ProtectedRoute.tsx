import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1] || '')) as { exp?: number };
    if (payload?.exp && Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return <Navigate to="/" replace />;
    }
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;