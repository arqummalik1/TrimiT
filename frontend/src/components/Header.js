import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  User, 
  SignOut, 
  House, 
  CalendarCheck,
  Storefront,
  ChartBar,
  List
} from '@phosphor-icons/react';
import DownloadAppButton from './DownloadAppButton';
import TrimitLogo from './brand/TrimitLogo';

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
  const isExploreActive = location.pathname === '/explore' || location.pathname === '/discover';

  const navClass = (active) =>
    `nav-glass-pill ${active ? 'nav-glass-pill--active' : 'nav-glass-pill--idle'}`;

  return (
    <header className="liquid-glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <TrimitLogo variant="icon-text" iconClassName="h-10 w-10" />

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {!isAuthenticated && (
              <>
                <Link to="/explore" className={navClass(isExploreActive)}>
                  Explore
                </Link>
                <Link
                  to="/for-salons"
                  className={navClass(isActive('/for-salons'))}
                >
                  For Salons
                </Link>
              </>
            )}
            {isAuthenticated && isCustomer && (
              <>
                <Link
                  to="/explore"
                  data-testid="nav-discover"
                  className={navClass(isExploreActive)}
                >
                  <span className="flex items-center gap-2">
                    <House size={18} weight={isExploreActive ? 'fill' : 'regular'} />
                    Discover
                  </span>
                </Link>
                <Link
                  to="/account"
                  data-testid="nav-account"
                  className={navClass(isActive('/account'))}
                >
                  <span className="flex items-center gap-2">
                    <User size={18} weight={isActive('/account') ? 'fill' : 'regular'} />
                    Account
                  </span>
                </Link>
                <Link
                  to="/my-bookings"
                  data-testid="nav-my-bookings"
                  className={navClass(isActive('/my-bookings'))}
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
                  className={navClass(isActive('/owner/dashboard'))}
                >
                  <span className="flex items-center gap-2">
                    <ChartBar size={18} weight={isActive('/owner/dashboard') ? 'fill' : 'regular'} />
                    Dashboard
                  </span>
                </Link>
                <Link
                  to="/owner/salon"
                  data-testid="nav-salon"
                  className={navClass(isActive('/owner/salon'))}
                >
                  <span className="flex items-center gap-2">
                    <Storefront size={18} weight={isActive('/owner/salon') ? 'fill' : 'regular'} />
                    My Salon
                  </span>
                </Link>
                <Link
                  to="/owner/services"
                  data-testid="nav-services"
                  className={navClass(isActive('/owner/services'))}
                >
                  <span className="flex items-center gap-2">
                    <List size={18} weight={isActive('/owner/services') ? 'fill' : 'regular'} />
                    Services
                  </span>
                </Link>
                <Link
                  to="/owner/settings"
                  data-testid="nav-settings"
                  className={navClass(isActive('/owner/settings'))}
                >
                  <span className="flex items-center gap-2">
                    <User size={18} weight={isActive('/owner/settings') ? 'fill' : 'regular'} />
                    Settings
                  </span>
                </Link>
                <Link
                  to="/owner/bookings"
                  data-testid="nav-bookings"
                  className={navClass(isActive('/owner/bookings'))}
                >
                  <span className="flex items-center gap-2">
                    <CalendarCheck size={18} weight={isActive('/owner/bookings') ? 'fill' : 'regular'} />
                    Bookings
                  </span>
                </Link>
              </>
            )}
          </nav>

          {/* Download + auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            <DownloadAppButton />
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass-chip">
                  <User size={18} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-700">
                    {profile?.name || 'User'}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-orange-800/15 text-orange-900 border border-orange-800/20 rounded-full capitalize backdrop-blur-sm">
                    {profile?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  data-testid="logout-btn"
                  className="nav-glass-pill nav-glass-pill--idle flex items-center gap-2"
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
                  className="nav-glass-pill nav-glass-pill--idle"
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
