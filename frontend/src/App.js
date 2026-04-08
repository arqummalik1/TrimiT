import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CustomerHome from './pages/customer/CustomerHome';
import SalonDetail from './pages/customer/SalonDetail';
import BookingPage from './pages/customer/BookingPage';
import MyBookings from './pages/customer/MyBookings';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import ManageSalon from './pages/owner/ManageSalon';
import ManageServices from './pages/owner/ManageServices';
import ManageBookings from './pages/owner/ManageBookings';

// Components
import Header from './components/Header';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, profile } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const { initializeAuth, isAuthenticated, profile } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Redirect based on role
  const getHomeRoute = () => {
    if (!isAuthenticated) return '/';
    if (profile?.role === 'owner') return '/owner/dashboard';
    return '/discover';
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Customer Routes */}
          <Route 
            path="/discover" 
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerHome />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/salon/:id" 
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <SalonDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/booking/:salonId/:serviceId" 
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <BookingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-bookings" 
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <MyBookings />
              </ProtectedRoute>
            } 
          />
          
          {/* Owner Routes */}
          <Route 
            path="/owner/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/owner/salon" 
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <ManageSalon />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/owner/services" 
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <ManageServices />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/owner/bookings" 
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <ManageBookings />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
