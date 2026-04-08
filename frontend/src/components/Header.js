import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  Scissors, 
  User, 
  SignOut, 
  House, 
  CalendarCheck,
  Storefront,
  ChartBar,
  List
} from '@phosphor-icons/react';

const Header = () => {
  const { isAuthenticated, profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isOwner = profile?.role === 'owner';
  const isCustomer = profile?.role === 'customer';

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 glass border-b border-stone-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-orange-800 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
              <Scissors size={24} weight="bold" className="text-white" />
            </div>
            <span className="font-heading text-xl font-bold text-stone-900 tracking-tight">
              TrimiT
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {isAuthenticated && isCustomer && (
              <>
                <Link
                  to="/discover"
                  data-testid="nav-discover"
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive('/discover')
                      ? 'bg-orange-100 text-orange-800'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <House size={18} weight={isActive('/discover') ? 'fill' : 'regular'} />
                    Discover
                  </span>
                </Link>
                <Link
                  to="/my-bookings"
                  data-testid="nav-my-bookings"
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive('/my-bookings')
                      ? 'bg-orange-100 text-orange-800'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CalendarCheck size={18} weight={isActive('/my-bookings') ? 'fill' : 'regular'} />
                    My Bookings
                  </span>
                </Link>
              </>
            )}
            
            {isAuthenticated && isOwner && (
              <>
                <Link
                  to="/owner/dashboard"
                  data-testid="nav-dashboard"
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive('/owner/dashboard')
                      ? 'bg-orange-100 text-orange-800'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ChartBar size={18} weight={isActive('/owner/dashboard') ? 'fill' : 'regular'} />
                    Dashboard
                  </span>
                </Link>
                <Link
                  to="/owner/salon"
                  data-testid="nav-salon"
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive('/owner/salon')
                      ? 'bg-orange-100 text-orange-800'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Storefront size={18} weight={isActive('/owner/salon') ? 'fill' : 'regular'} />
                    My Salon
                  </span>
                </Link>
                <Link
                  to="/owner/services"
                  data-testid="nav-services"
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive('/owner/services')
                      ? 'bg-orange-100 text-orange-800'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <List size={18} weight={isActive('/owner/services') ? 'fill' : 'regular'} />
                    Services
                  </span>
                </Link>
                <Link
                  to="/owner/bookings"
                  data-testid="nav-bookings"
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive('/owner/bookings')
                      ? 'bg-orange-100 text-orange-800'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CalendarCheck size={18} weight={isActive('/owner/bookings') ? 'fill' : 'regular'} />
                    Bookings
                  </span>
                </Link>
              </>
            )}
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-full">
                  <User size={18} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-700">
                    {profile?.name || 'User'}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full capitalize">
                    {profile?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  data-testid="logout-btn"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <SignOut size={18} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  data-testid="login-btn"
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  data-testid="signup-btn"
                  className="btn-primary text-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
