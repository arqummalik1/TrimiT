import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Scissors } from '@phosphor-icons/react';
import { useAuthStore } from './store/authStore';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CustomerHome from './pages/customer/CustomerHome';
import SalonDetail from './pages/customer/SalonDetail';
import BookingPage from './pages/customer/BookingPage';
import MyBookings from './pages/customer/MyBookings';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import ManageSalon from './pages/owner/ManageSalon';
import ManageServices from './pages/owner/ManageServices';
import ManageBookings from './pages/owner/ManageBookings';
import SettingsPage from './pages/owner/SettingsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';
import ContactPage from './pages/legal/ContactPage';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import Toast from './components/Toast';

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
  const { initializeAuth, isAuthenticated, profile, isInitializing, hasSalon } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Show loading screen while initializing auth
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-800 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Scissors size={32} weight="bold" className="text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-stone-900">TrimiT</h1>
          <p className="text-stone-500 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect based on role and salon existence
  const getHomeRoute = () => {
    if (!isAuthenticated) return '/';
    if (profile?.role === 'owner') {
      // If owner has no salon, redirect to create salon page
      return hasSalon ? '/owner/dashboard' : '/owner/salon';
    }
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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          
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
          <Route 
            path="/owner/settings" 
            element={
              <ProtectedRoute allowedRoles={['owner']}>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
        </Routes>
      </main>

      <Footer />

      {/* Toast Notifications - Global */}
      <Toast />
    </div>
  );
}

export default App;
