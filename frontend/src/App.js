import React, { useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { parseAuthCallbackFromUrl } from "./lib/authCallbackParams";
import TrimitLogo from "./components/brand/TrimitLogo";
import { useAuthStore } from "./store/authStore";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import EmailConfirmedPage from "./pages/EmailConfirmedPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import SalonDetail from "./pages/customer/SalonDetail";
import BookingPage from "./pages/customer/BookingPage";
import PaymentWaitingPage from "./pages/customer/PaymentWaitingPage";
import MyBookings from "./pages/customer/MyBookings";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import ManageSalon from "./pages/owner/ManageSalon";
import ManageServices from "./pages/owner/ManageServices";
import ManageCategories from "./pages/owner/ManageCategories";
import ManageBookings from "./pages/owner/ManageBookings";
import SettingsPage from "./pages/owner/SettingsPage";
import SubscriptionPage from "./pages/owner/SubscriptionPage";
import UpiSettingsPage from "./pages/owner/UpiSettingsPage";
import OwnerSubscriptionGate from "./components/owner/OwnerSubscriptionGate";import PrivacyPage from "./pages/legal/PrivacyPage";
import TermsPage from "./pages/legal/TermsPage";
import ContactPage from "./pages/legal/ContactPage";
import AccountPage from "./pages/customer/AccountPage";
import ExplorePage from "./pages/ExplorePage";
import ForSalonsPage from "./pages/ForSalonsPage";
import PaymentsHelpPage from "./pages/PaymentsHelpPage";
import SeoCategoryPage from "./pages/seo/SeoCategoryPage";
import BlogIndexPage from "./pages/blog/BlogIndexPage";
import BlogPostPage from "./pages/blog/BlogPostPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { SEO_PAGE_PATHS } from "./config/seoPages";
import { usePageviewTracker } from "./hooks/usePageviewTracker";

// Components
import Header from "./components/Header";
import MobileBreadcrumbs from "./components/MobileBreadcrumbs";
import Footer from "./components/Footer";
import Toast from "./components/Toast";
import SeoHead from "./components/SeoHead";
import GoogleAnalytics from "./components/GoogleAnalytics";
import PromoBanner from "./components/PromoBanner";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, profile, isInitializing } = useAuthStore();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <TrimitLogo
            variant="icon"
            asLink={false}
            iconClassName="h-16 w-16 mx-auto mb-4 animate-pulse"
            showWordmark={false}
            className="justify-center"
          />
          <p className="text-stone-500 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but no profile row yet (new user mid-signup, or a broken
  // account). Force them through CompleteProfile before any protected page —
  // same gate as the mobile app.
  if (!profile?.role) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AUTH_CALLBACK_PATHS = ["/auth/email-confirmed", "/reset-password", "/auth/callback"];

function App() {
  const { initializeAuth, isAuthenticated, profile, isInitializing, hasSalon } =
    useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthCallbackPage = AUTH_CALLBACK_PATHS.includes(location.pathname);
  // Founder-only admin dashboard: standalone shell, never tracked, no global chrome.
  const isAdminPage = location.pathname.startsWith("/admin");

  // Fire-and-forget page-view analytics on route change (skips /admin internally).
  usePageviewTracker();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // If Supabase still redirects to Site URL (/) with tokens in hash, forward to the confirm page.
  useEffect(() => {
    if (isAuthCallbackPage) return;
    const { error, accessToken, tokenHash, isEmailConfirmation } =
      parseAuthCallbackFromUrl();
    const hasCallback =
      Boolean(error && window.location.hash) ||
      (Boolean(accessToken || tokenHash) && isEmailConfirmation);
    if (!hasCallback) return;
    const suffix = `${window.location.search || ""}${window.location.hash || ""}`;
    navigate(`/auth/email-confirmed${suffix}`, { replace: true });
  }, [isAuthCallbackPage, location.pathname, navigate]);

  // Admin dashboard is fully isolated from user auth + global chrome. Render it
  // standalone so a slow/failed user-auth init never blocks the founder console.
  if (isAdminPage) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </div>
    );
  }

  // Show loading screen while initializing auth
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <TrimitLogo
            variant="icon"
            asLink={false}
            iconClassName="h-16 w-16 mx-auto mb-4 animate-pulse"
            showWordmark={false}
            className="justify-center"
          />
          <h1 className="font-heading text-2xl font-bold text-stone-900">
            TrimiT
          </h1>
          <p className="text-stone-500 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect based on role and salon existence
  const getHomeRoute = () => {
    if (!isAuthenticated) return "/";
    if (isAuthenticated && !profile?.role) return "/complete-profile";
    if (profile?.role === "owner") {
      // If owner has no salon, redirect to create salon page
      return hasSalon ? "/owner/dashboard" : "/owner/salon";
    }
    return "/explore";
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <SeoHead />
      <GoogleAnalytics />
      {!isAuthCallbackPage && <PromoBanner />}
      {!isAuthCallbackPage && <Header />}
      {!isAuthCallbackPage && <MobileBreadcrumbs />}
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route
            path="/auth/email-confirmed"
            element={<EmailConfirmedPage />}
          />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/for-salons" element={<ForSalonsPage />} />
          <Route path="/help/payments" element={<PaymentsHelpPage />} />
          <Route path="/blog" element={<BlogIndexPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          {SEO_PAGE_PATHS.map((path) => (
            <Route key={path} path={path} element={<SeoCategoryPage />} />
          ))}

          <Route
            path="/discover"
            element={<Navigate to="/explore" replace />}
          />

          {/* Public salon browse; booking requires auth */}
          <Route path="/salon/:id" element={<SalonDetail />} />

          {/* Customer Routes */}
          <Route
            path="/booking/:salonId/:serviceId"
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <BookingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/:bookingId/waiting"
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <PaymentWaitingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <AccountPage />
              </ProtectedRoute>
            }
          />

          {/* Owner Routes */}
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <OwnerSubscriptionGate>
                  <OwnerDashboard />
                </OwnerSubscriptionGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/salon"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <OwnerSubscriptionGate>
                  <ManageSalon />
                </OwnerSubscriptionGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/services"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <OwnerSubscriptionGate>
                  <ManageServices />
                </OwnerSubscriptionGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/categories"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <OwnerSubscriptionGate>
                  <ManageCategories />
                </OwnerSubscriptionGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/bookings"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <OwnerSubscriptionGate>
                  <ManageBookings />
                </OwnerSubscriptionGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/settings"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/subscription"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/bank-account"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <UpiSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={getHomeRoute()} replace />} />
        </Routes>
      </main>

      {!isAuthCallbackPage && <Footer />}

      {/* Toast Notifications - Global */}
      <Toast />
    </div>
  );
}

export default App;
