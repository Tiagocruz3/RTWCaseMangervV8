import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute, PublicRoute, AdminRoute } from './routes/AuthRoutes';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseView from './pages/CaseView';
import CreateCase from './pages/CreateCase';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Login from './pages/Login';
import PIAWECalculatorPage from './pages/PIAWECalculatorPage';
import AdminDashboard from './pages/AdminDashboard';
import QualityControl from './pages/QualityControl';
import Reports from './pages/Reports';
import LoadingSpinner from './components/common/LoadingSpinner';
import Profile from './pages/Profile';
import Users from './pages/Users';

function App() {
  const { isAuthenticated, user, isLoading, initialize, error } = useAuthStore();
  
  // Initialize auth state on app load
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        await initialize();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      }
    };
    
    if (mounted) {
      initAuth();
    }
    
    return () => {
      mounted = false;
    };
  }, []);

  // Show loading spinner while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading RTW Case Manager...</p>
          {error && (
            <p className="mt-2 text-error-600 text-sm">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/new" element={<CreateCase />} />
            <Route path="/cases/:id" element={<CaseView />} />
            <Route path="/cases/:id/piawe" element={<PIAWECalculatorPage />} />
            <Route path="/piawe" element={<PIAWECalculatorPage />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/quality-control" element={<QualityControl />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
        
        {/* Admin routes */}
        <Route element={<AdminRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/users" element={<Users />} />
          </Route>
        </Route>
        
        {/* Redirect root to dashboard or login */}
        <Route path="/" element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        } />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;