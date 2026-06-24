import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  User,
  SignOut,
  CalendarCheck,
  Storefront,
  ChartBar,
  List,
  X,
} from '@phosphor-icons/react';
import DownloadAppButton from './DownloadAppButton';
import TrimitLogo from './brand/TrimitLogo';
import { PLAY_STORE_URL } from '../config/storeLinks';
import { PROMO, isOfferActive } from '../config/promotions';

const MARKETING_LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/for-salons', label: 'For Salons' },
];

const openPlayStore = () => {
  window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
};

const Header = () => {
  const { isAuthenticated, profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const isOwner = profile?.role === 'owner';
  const isCustomer = profile?.role === 'customer';

  const marketingLinks = MARKETING_LINKS.filter(
    (link) => !(isAuthenticated && isOwner && link.to === '/for-salons')
  );

  const isActive = (path) => location.pathname === path;
  const isExploreActive =
    location.pathname === '/explore' || location.pathname === '/discover';

  const navClass = (active) =>
    `nav-glass-pill ${active ? 'nav-glass-pill--active' : 'nav-glass-pill--idle'}`;

  const mobileNavClass = (active) =>
    `block w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-colors ${
      active
        ? 'bg-orange-50 text-orange-900'
        : 'text-stone-700 hover:bg-stone-100'
    }`;

  return (
    <header className="liquid-glass-header relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          <TrimitLogo
            variant="icon-text"
            iconClassName="h-8 w-8 sm:h-10 sm:w-10"
            className="shrink-0 min-w-0"
          />

          <nav
            className="hidden lg:flex items-center gap-1 flex-1 justify-center"
            aria-label="Main"
          >
            {marketingLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={navClass(to === '/explore' ? isExploreActive : isActive(to))}
              >
                {label}
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

          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <DownloadAppButton onClick={openPlayStore} />
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
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  data-testid="login-btn"
                  className="nav-glass-pill nav-glass-pill--idle text-sm hidden xl:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  to={PROMO.ctaPath}
                  data-testid="signup-btn"
                  className="btn-primary text-sm px-5 py-2.5 font-bold"
                >
                  {isOfferActive() ? PROMO.ctaLabel : 'Sign up free'}
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl border border-stone-200/80 bg-white/80 text-stone-700 shrink-0"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="lg:hidden fixed inset-0 top-14 sm:top-16 bg-stone-900/30 z-40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-nav-panel"
            className="lg:hidden absolute left-0 right-0 top-full z-50 border-b border-stone-200/80 bg-white shadow-lg max-h-[calc(100vh-3.5rem)] overflow-y-auto"
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1" aria-label="Mobile">
              {marketingLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={mobileNavClass(to === '/explore' ? isExploreActive : isActive(to))}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}

              {isAuthenticated && isCustomer && (
                <>
                  <Link
                    to="/account"
                    className={mobileNavClass(isActive('/account'))}
                    onClick={() => setMenuOpen(false)}
                  >
                    Account
                  </Link>
                  <Link
                    to="/my-bookings"
                    className={mobileNavClass(isActive('/my-bookings'))}
                    onClick={() => setMenuOpen(false)}
                  >
                    My bookings
                  </Link>
                </>
              )}

              {isAuthenticated && isOwner && (
                <>
                  <Link
                    to="/owner/dashboard"
                    className={mobileNavClass(isActive('/owner/dashboard'))}
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/owner/salon"
                    className={mobileNavClass(isActive('/owner/salon'))}
                    onClick={() => setMenuOpen(false)}
                  >
                    Salon
                  </Link>
                  <Link
                    to="/owner/bookings"
                    className={mobileNavClass(isActive('/owner/bookings'))}
                    onClick={() => setMenuOpen(false)}
                  >
                    Bookings
                  </Link>
                  <Link
                    to="/owner/services"
                    className={mobileNavClass(isActive('/owner/services'))}
                    onClick={() => setMenuOpen(false)}
                  >
                    Services
                  </Link>
                </>
              )}

              <div className="pt-3 mt-2 border-t border-stone-100">
                <DownloadAppButton 
                  className="w-full justify-center" 
                  onClick={() => {
                    setMenuOpen(false);
                    openPlayStore();
                  }}
                />
              </div>

              <div className="pt-3 flex flex-col gap-2">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-stone-200 text-stone-700 font-medium"
                  >
                    <SignOut size={18} />
                    Sign out
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="w-full text-center px-4 py-3 rounded-xl border border-stone-200 text-stone-700 font-medium"
                      onClick={() => setMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Link
                      to={PROMO.ctaPath}
                      className="w-full text-center btn-primary py-3 font-bold"
                      onClick={() => setMenuOpen(false)}
                    >
                      {isOfferActive() ? PROMO.ctaLabel : 'Sign up free'}
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
};

export default Header;
