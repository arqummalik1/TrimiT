import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  User,
  SignOut,
  CalendarCheck,
  Storefront,
  ChartBar,
  List,
} from '@phosphor-icons/react';
import DownloadAppButton from './DownloadAppButton';
import TrimitLogo from './brand/TrimitLogo';

const MARKETING_LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/for-salons', label: 'For Salons' },
];

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
  const isExploreActive =
    location.pathname === '/explore' || location.pathname === '/discover';

  const navClass = (active) =>
    `nav-glass-pill ${active ? 'nav-glass-pill--active' : 'nav-glass-pill--idle'}`;

  return (
    <header className="liquid-glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          <TrimitLogo variant="icon-text" iconClassName="h-9 w-9 sm:h-10 sm:w-10" />

          <nav
            className="flex items-center gap-0.5 sm:gap-1 min-w-0 flex-1 justify-center"
            aria-label="Main"
          >
            {MARKETING_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={navClass(
                  to === '/explore' ? isExploreActive : isActive(to)
                )}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{to === '/for-salons' ? 'Salons' : label}</span>
              </Link>
            ))}
          </nav>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Account">
            {isAuthenticated && isCustomer && (
              <>
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
                    <CalendarCheck
                      size={18}
                      weight={isActive('/my-bookings') ? 'fill' : 'regular'}
                    />
                    Bookings
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
                    <ChartBar
                      size={18}
                      weight={isActive('/owner/dashboard') ? 'fill' : 'regular'}
                    />
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
                    Salon
                  </span>
                </Link>
                <Link
                  to="/owner/bookings"
                  data-testid="nav-bookings"
                  className={navClass(isActive('/owner/bookings'))}
                >
                  <span className="flex items-center gap-2">
                    <CalendarCheck
                      size={18}
                      weight={isActive('/owner/bookings') ? 'fill' : 'regular'}
                    />
                    Bookings
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
              </>
            )}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden sm:block">
              <DownloadAppButton />
            </div>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full glass-chip">
                  <User size={18} className="text-stone-600" />
                  <span className="text-sm font-medium text-stone-700 max-w-[120px] truncate">
                    {profile?.name || 'User'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                  className="nav-glass-pill nav-glass-pill--idle flex items-center gap-2"
                  aria-label="Sign out"
                >
                  <SignOut size={18} />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/login"
                  data-testid="login-btn"
                  className="nav-glass-pill nav-glass-pill--idle text-sm"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  data-testid="signup-btn"
                  className="btn-primary text-sm px-4 py-2 sm:px-5 sm:py-2.5"
                >
                  Sign up
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
