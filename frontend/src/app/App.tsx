import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '@/features/dashboard/Dashboard';
import LoginPage from '@/features/auth/LoginPage';
import ProtectedRoute from '@/features/auth/ProtectedRoute';
import { hasValidSession } from '@/features/auth/session';
import Toaster from '@/components/ui/Toaster';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import '@/styles/app.css';
import '@/styles/ui.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(hasValidSession);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard onLogout={() => setIsAuthenticated(false)} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <ConfirmDialog />
    </Router>
  );
}

export default App;
