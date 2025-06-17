import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

// Route that requires authentication
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();
  
  // ✅ Wait for auth initialization to complete
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // ✅ FIXED: Removed escaped quotes
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};

// Route that requires admin role
export const AdminRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const location = useLocation();
  
  // ✅ Wait for auth initialization to complete
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // ✅ FIXED: Removed escaped quotes
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (user?.role !== 'admin') {
    // ✅ FIXED: Removed escaped quotes
    return <Navigate to="/dashboard" replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};

// Route for unauthenticated users only (like login page)
export const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  
  // ✅ Wait for auth initialization to complete
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If user is already authenticated, redirect to the dashboard or the page they were trying to access
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }
  
  return children ? <>{children}</> : <Outlet />;
};
