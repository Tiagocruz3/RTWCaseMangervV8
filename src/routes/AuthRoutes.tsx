import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

// Route that requires authentication
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  
  if (!isAuthenticated) {
    // Redirect to the login page but save the current location
    return <Navigate to="/login\" state={{ from: location }} replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};

// Route that requires admin role
export const AdminRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/login\" state={{ from: location }} replace />;
  }
  
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard\" replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};

// Route for unauthenticated users only (like login page)
export const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  
  // If user is already authenticated, redirect to the dashboard or the page they were trying to access
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};