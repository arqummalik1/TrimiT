/**
 * TrimiT — Founder Admin Dashboard (PIN-gated, web-only, /admin).
 *
 * Reachable ONLY by typing the URL. Not linked anywhere, not prerendered.
 * Standalone shell (own dark theme, no customer Navbar/Footer). Unlock with a
 * PIN exchanged for the admin bearer token (kept in sessionStorage). All data
 * goes through `adminService`. A 401/403 on any call clears the token and
 * returns to the PIN screen.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LockKey,
  ShieldCheck,
  SignOut,
  ArrowsClockwise,
  MagnifyingGlass,
  UsersThree,
  Storefront,
  CalendarCheck,
  CurrencyInr,
  ChartLineUp,
  Eye,
  Buildings,
  Wallet,
  Clock,
  CheckCircle,
  WarningCircle,
  Spinner,
  CaretDown,
  Sparkle,
  UserCircle,
} from '@phosphor-icons/react';
import adminService from '../../services/adminService';
import { getAdminToken, setAdminToken, clearAdminToken } from '../../lib/adminAuth';
import { getApiErrorMessage } from '../../lib/utils';

// ── helpers ───────────────────────────────────────────────────────────────────
function formatINR(value, currency = 'INR') {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${n.toLocaleString('en-IN')}`;
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatDateShort(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function timeAgo(value) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return formatDateShort(value);
}

const STATUS_META = {
  active: { label: 'Active', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  trial: { label: 'Trial', cls: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' },
  grace_period: { label: 'Grace period', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  past_due: { label: 'Past due', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  payment_failed: { label: 'Payment failed', cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  expired: { label: 'Expired', cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  none: { label: 'None', cls: 'bg-slate-600/20 text-slate-300 ring-slate-500/30' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.none;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {meta.label}
    </span>
  );
}

function isAuthError(err) {
  const s = err?.response?.status;
  return s === 401 || s === 403;
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => getAdminToken());

  const handleUnlocked = useCallback((newToken) => {
    setAdminToken(newToken);
    setToken(newToken);
  }, []);

  const handleLock = useCallback(() => {
    clearAdminToken();
    setToken(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {token ? (
        <DashboardShell token={token} onLock={handleLock} onAuthExpired={handleLock} />
      ) : (
        <PinLock onUnlocked={handleUnlocked} />
      )}
    </div>
  );
}

// ── PIN lock screen ─────────────────────────────────────────────────────────
function PinLock({ onUnlocked }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const locked = now < lockUntil;
  const cooldown = locked ? Math.ceil((lockUntil - now) / 1000) : 0;

  useEffect(() => {
    if (!locked) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [locked]);

  const valid = pin.length >= 6 && pin.length <= 10;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || submitting || locked) return;
    setSubmitting(true);
    setError('');
    try {
      const { token } = await adminService.login(pin);
      if (!token) throw new Error('No token returned');
      onUnlocked(token);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setError('Incorrect PIN. Try again.');
      } else if (status === 404) {
        setError('Admin access is not available.');
      } else if (status === 429) {
        setError('Too many attempts. Please wait a moment.');
        setLockUntil(Date.now() + 30000);
      } else {
        setError(getApiErrorMessage(err, 'Could not unlock. Try again.'));
      }
      // Briefly lock the button after a failed attempt to slow brute force.
      if (status === 401) setLockUntil(Date.now() + 1500);
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
            <ShieldCheck size={32} weight="fill" className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">TrimiT Admin</h1>
          <p className="mt-1 text-sm text-slate-400">Enter your PIN to unlock the dashboard.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <LockKey
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPin(digits);
                if (error) setError('');
              }}
              placeholder="••••••"
              aria-label="Admin PIN"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3.5 pl-12 pr-4 text-center text-lg tracking-[0.4em] text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-sm font-medium text-rose-400"
            >
              <WarningCircle size={16} weight="fill" />
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={!valid || submitting || locked}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:from-indigo-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Spinner size={18} className="animate-spin" /> Unlocking…
              </>
            ) : locked && cooldown > 0 ? (
              `Try again in ${cooldown}s`
            ) : (
              <>
                <LockKey size={18} weight="bold" /> Unlock
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500">
            6–10 digit PIN · authorised personnel only
          </p>
        </form>
      </motion.div>
    </div>
  );
}

// ── small UI atoms ────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = 'indigo', loading }) {
  const accents = {
    indigo: 'from-indigo-500/20 to-indigo-500/5 text-indigo-300 ring-indigo-500/20',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-300 ring-violet-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300 ring-emerald-500/20',
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-300 ring-sky-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-300 ring-amber-500/20',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-300 ring-rose-500/20',
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 transition hover:border-white/20 hover:bg-slate-900/80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-20 animate-pulse rounded-md bg-slate-700/60" />
          ) : (
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-white">{value}</p>
          )}
          {sub && !loading && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset ${accents[accent]}`}
        >
          <Icon size={22} weight="duotone" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, right, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          {Icon && <Icon size={20} weight="duotone" className="text-indigo-300" />}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <MagnifyingGlass
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 sm:w-64"
      />
    </div>
  );
}

function TableSkeleton({ cols = 5, rows = 5 }) {
  return (
    <div className="divide-y divide-white/5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-4 flex-1 animate-pulse rounded bg-slate-700/50"
              style={{ animationDelay: `${(r + c) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-500">
        <Icon size={24} weight="duotone" />
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function InlineError({ message, onRetry }) {
  return (
    <div className="m-5 flex flex-col items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2">
        <WarningCircle size={18} weight="fill" className="text-rose-400" />
        {message}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ── dashboard shell ───────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'grace_period', label: 'Grace period' },
  { value: 'past_due', label: 'Past due' },
  { value: 'payment_failed', label: 'Payment failed' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'none', label: 'None' },
];

function DashboardShell({ token, onLock, onAuthExpired }) {
  const [overview, setOverview] = useState(null);
  const [owners, setOwners] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({ overview: '', owners: '', customers: '' });

  // owners table controls
  const [ownerSearch, setOwnerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [grantingId, setGrantingId] = useState(null);
  const [grantMsg, setGrantMsg] = useState('');

  // customers table controls
  const [customerSearch, setCustomerSearch] = useState('');

  const loadAll = useCallback(
    async ({ silent } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setErrors({ overview: '', owners: '', customers: '' });

      const results = await Promise.allSettled([
        adminService.getOverview(token),
        adminService.getOwners(token),
        adminService.getCustomers(token),
      ]);

      // If any call returned an auth error, the token is dead → back to PIN.
      const authDead = results.some(
        (r) => r.status === 'rejected' && isAuthError(r.reason)
      );
      if (authDead) {
        onAuthExpired();
        return;
      }

      const [ov, ow, cu] = results;
      const nextErrors = { overview: '', owners: '', customers: '' };

      if (ov.status === 'fulfilled') setOverview(ov.value);
      else nextErrors.overview = getApiErrorMessage(ov.reason, 'Could not load overview.');

      if (ow.status === 'fulfilled') setOwners(ow.value);
      else nextErrors.owners = getApiErrorMessage(ow.reason, 'Could not load owners.');

      if (cu.status === 'fulfilled') setCustomers(cu.value);
      else nextErrors.customers = getApiErrorMessage(cu.reason, 'Could not load customers.');

      setErrors(nextErrors);
      setLoading(false);
      setRefreshing(false);
    },
    [token, onAuthExpired]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleGrant = useCallback(
    async (owner) => {
      setGrantingId(owner.owner_id);
      setGrantMsg('');
      try {
        await adminService.grantSubscription(token, owner.owner_id, 30);
        setGrantMsg(`Granted 30 days to ${owner.name || owner.salon_name || 'owner'}.`);
        // Refresh owners + overview so badges/MRR reflect the grant.
        const [ow, ov] = await Promise.allSettled([
          adminService.getOwners(token),
          adminService.getOverview(token),
        ]);
        if (ow.status === 'fulfilled') setOwners(ow.value);
        if (ov.status === 'fulfilled') setOverview(ov.value);
      } catch (err) {
        if (isAuthError(err)) {
          onAuthExpired();
          return;
        }
        setGrantMsg(getApiErrorMessage(err, 'Could not grant subscription.'));
      } finally {
        setGrantingId(null);
        setTimeout(() => setGrantMsg(''), 4000);
      }
    },
    [token, onAuthExpired]
  );

  // ── derived data ──
  const totals = overview?.totals || {};
  const subs = overview?.subscriptions || {};
  const visitors = overview?.visitors || {};
  const currency = subs.currency || 'INR';

  const filteredOwners = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    return owners.filter((o) => {
      if (statusFilter !== 'all' && (o.subscription_status || 'none') !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        (o.name || '').toLowerCase().includes(q) ||
        (o.email || '').toLowerCase().includes(q) ||
        (o.salon_name || '').toLowerCase().includes(q)
      );
    });
  }, [owners, ownerSearch, statusFilter]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* top bar */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40">
            <ShieldCheck size={24} weight="fill" className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
              Admin Dashboard
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock size={13} />
              {overview?.generated_at
                ? `Last updated ${timeAgo(overview.generated_at)}`
                : 'Loading metrics…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAll({ silent: true })}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-slate-800 disabled:opacity-50"
          >
            <ArrowsClockwise size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={onLock}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <SignOut size={16} />
            Lock
          </button>
        </div>
      </header>

      {errors.overview && !overview && (
        <InlineError message={errors.overview} onRetry={() => loadAll()} />
      )}

      {/* ── overview groups ── */}
      <OverviewGrid
        loading={loading}
        totals={totals}
        subs={subs}
        visitors={visitors}
        currency={currency}
      />

      {/* ── owners ── */}
      <div className="mt-8">
        <SectionCard
          title="Salon Owners"
          icon={Storefront}
          right={
            <div className="flex flex-wrap items-center gap-2">
              <StatusSelect value={statusFilter} onChange={setStatusFilter} />
              <SearchInput
                value={ownerSearch}
                onChange={setOwnerSearch}
                placeholder="Search name, email, salon…"
              />
            </div>
          }
        >
          {grantMsg && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              <CheckCircle size={16} weight="fill" />
              {grantMsg}
            </div>
          )}
          {loading ? (
            <TableSkeleton cols={6} rows={6} />
          ) : errors.owners ? (
            <InlineError message={errors.owners} onRetry={() => loadAll()} />
          ) : filteredOwners.length === 0 ? (
            <EmptyState
              icon={Storefront}
              title={owners.length === 0 ? 'No salon owners yet' : 'No matches'}
              hint={owners.length === 0 ? 'Owners appear here once they sign up.' : 'Try a different search or filter.'}
            />
          ) : (
            <OwnersTable
              owners={filteredOwners}
              grantingId={grantingId}
              onGrant={handleGrant}
            />
          )}
        </SectionCard>
      </div>

      {/* ── customers ── */}
      <div className="mt-8 mb-12">
        <SectionCard
          title="Customers"
          icon={UsersThree}
          right={
            <SearchInput
              value={customerSearch}
              onChange={setCustomerSearch}
              placeholder="Search name, email, phone…"
            />
          }
        >
          {loading ? (
            <TableSkeleton cols={4} rows={6} />
          ) : errors.customers ? (
            <InlineError message={errors.customers} onRetry={() => loadAll()} />
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={UsersThree}
              title={customers.length === 0 ? 'No customers yet' : 'No matches'}
              hint={customers.length === 0 ? 'Customers appear here once they sign up.' : 'Try a different search.'}
            />
          ) : (
            <CustomersTable customers={filteredCustomers} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ── overview grid ─────────────────────────────────────────────────────────────
function OverviewGrid({ loading, totals, subs, visitors, currency }) {
  return (
    <div className="space-y-6">
      {/* Totals */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Platform
        </p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={Storefront} accent="indigo" label="Salon Owners" value={formatNumber(totals.owners)} loading={loading} />
          <StatCard icon={UsersThree} accent="sky" label="Customers" value={formatNumber(totals.customers)} loading={loading} />
          <StatCard icon={Buildings} accent="violet" label="Salons" value={formatNumber(totals.salons)} loading={loading} />
          <StatCard icon={CalendarCheck} accent="emerald" label="Bookings" value={formatNumber(totals.bookings)} loading={loading} />
        </div>
      </div>

      {/* Revenue */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Revenue
        </p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={Wallet} accent="emerald" label="MRR" value={formatINR(subs.mrr, currency)} loading={loading} />
          <StatCard icon={ChartLineUp} accent="emerald" label="ARR" value={formatINR(subs.arr, currency)} loading={loading} />
          <StatCard icon={CurrencyInr} accent="violet" label="Total Revenue" value={formatINR(subs.total_revenue_collected, currency)} loading={loading} />
          <StatCard icon={CheckCircle} accent="emerald" label="Active Subs" value={formatNumber(subs.active)} sub={`${formatNumber(subs.trialing)} trialing`} loading={loading} />
        </div>
      </div>

      {/* Subscriptions + Visitors */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Subscriptions &amp; Traffic
        </p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={Sparkle} accent="sky" label="Trials" value={formatNumber(subs.trialing)} loading={loading} />
          <StatCard icon={WarningCircle} accent="rose" label="Expired / Lapsed" value={formatNumber(subs.expired_or_lapsed)} loading={loading} />
          <StatCard icon={Eye} accent="indigo" label="Page Views (24h)" value={formatNumber(visitors.page_views_24h)} sub={`${formatNumber(visitors.page_views_7d)} in 7d`} loading={loading} />
          <StatCard icon={UserCircle} accent="violet" label="Unique Visitors (30d)" value={formatNumber(visitors.unique_visitors_30d)} sub={`${formatNumber(visitors.page_views_30d)} views in 30d`} loading={loading} />
        </div>
      </div>
    </div>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-3 pr-9 text-sm text-white outline-none transition focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
      >
        {STATUS_FILTERS.map((s) => (
          <option key={s.value} value={s.value} className="bg-slate-900 text-white">
            {s.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

// ── owners table ──────────────────────────────────────────────────────────────
function TrialDaysCell({ owner }) {
  if (owner.is_trial && typeof owner.trial_days_remaining === 'number') {
    const d = owner.trial_days_remaining;
    return (
      <span className="text-sky-300">
        {d <= 0 ? 'Last day' : `${d} day${d === 1 ? '' : 's'} left`}
      </span>
    );
  }
  return <span className="text-slate-500">—</span>;
}

function RenewalCell({ owner }) {
  const date = owner.next_renewal_at || owner.current_period_end;
  if (!date) return <span className="text-slate-500">—</span>;
  const expired = ['expired', 'cancelled', 'payment_failed'].includes(owner.subscription_status);
  return (
    <span className={expired ? 'text-rose-300' : 'text-slate-300'}>
      {expired ? 'Expired ' : 'Renews '}
      {formatDateShort(date)}
    </span>
  );
}

function OwnersTable({ owners, grantingId, onGrant }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3 font-medium">Owner</th>
            <th className="px-5 py-3 font-medium">Salon</th>
            <th className="px-5 py-3 font-medium">Contact</th>
            <th className="px-5 py-3 font-medium">UPI ID</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Trial</th>
            <th className="px-5 py-3 font-medium">Renews / Expires</th>
            <th className="px-5 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {owners.map((o) => (
            <tr key={o.owner_id} className="transition hover:bg-white/[0.03]">
              <td className="px-5 py-4">
                <div className="font-medium text-white">{o.name || '—'}</div>
                <div className="text-xs text-slate-500">Joined {formatDateShort(o.created_at)}</div>
              </td>
              <td className="px-5 py-4">
                <div className="text-slate-200">{o.salon_name || '—'}</div>
                <div className="text-xs text-slate-500">{o.city || '—'}</div>
              </td>
              <td className="px-5 py-4">
                <div className="text-slate-300">{o.email || '—'}</div>
                <div className="text-xs text-slate-500">{o.phone || '—'}</div>
              </td>
              <td className="px-5 py-4 text-slate-300">{o.upi_id || <span className="text-slate-600">—</span>}</td>
              <td className="px-5 py-4">
                <StatusBadge status={o.subscription_status || 'none'} />
              </td>
              <td className="px-5 py-4">
                <TrialDaysCell owner={o} />
              </td>
              <td className="px-5 py-4">
                <RenewalCell owner={o} />
              </td>
              <td className="px-5 py-4 text-right">
                <button
                  onClick={() => onGrant(o)}
                  disabled={grantingId === o.owner_id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {grantingId === o.owner_id ? (
                    <>
                      <Spinner size={14} className="animate-spin" /> Granting…
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} weight="bold" /> Grant 30 days
                    </>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── customers table ───────────────────────────────────────────────────────────
function CustomersTable({ customers }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 font-medium">Email</th>
            <th className="px-5 py-3 font-medium">Phone</th>
            <th className="px-5 py-3 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {customers.map((c) => (
            <tr key={c.id} className="transition hover:bg-white/[0.03]">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                    <UserCircle size={20} weight="duotone" />
                  </div>
                  <span className="font-medium text-white">{c.name || '—'}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-slate-300">{c.email || '—'}</td>
              <td className="px-5 py-4 text-slate-300">{c.phone || '—'}</td>
              <td className="px-5 py-4 text-slate-400">{formatDateTime(c.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
