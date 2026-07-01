/**
 * TrimiT — Founder Admin Dashboard (PIN-gated, web-only, /admin).
 * Premium dark UI with charts, user management, subscription control.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  LockKey, ShieldCheck, SignOut, ArrowsClockwise, MagnifyingGlass,
  UsersThree, Storefront, CalendarCheck, CurrencyInr, ChartLineUp,
  Eye, Buildings, Wallet, Clock, CheckCircle, WarningCircle, Spinner,
  CaretDown, Sparkle, UserCircle, Prohibit, Trash, UserPlus,
  EnvelopeSimple, X, TrendUp, TrendDown, Export, Plus, Minus, MapPin
} from '@phosphor-icons/react';
import adminService from '../../services/adminService';
import { getAdminToken, setAdminToken, clearAdminToken } from '../../lib/adminAuth';
import { getApiErrorMessage } from '../../lib/utils';

// TrimiT Brand Colors
const BRAND = {
  primary: '#9A3412', primaryDark: '#C2410C', primaryLight: '#EA580C',
  gold: '#F59E0B', emerald: '#059669', sky: '#0EA5E9', violet: '#7C3AED', rose: '#E11D48',
};

const CHART_COLORS = [BRAND.primary, BRAND.gold, BRAND.emerald, BRAND.sky, BRAND.violet, BRAND.rose];

// Helper functions
const formatINR = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const formatNumber = (v) => Number(v || 0).toLocaleString('en-IN');
const formatDateShort = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const formatDateTime = (v) => v ? new Date(v).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** Download waitlist leads as a CSV file (founder lead pipeline export). */
function exportLeadsCsv(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return;
  const headers = ['Name', 'Email', 'Area', 'Nearest area', 'Distance (km)', 'Lat', 'Lng', 'Source', 'Joined'];
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = leads.map((l) => [
    l.name, l.email, l.area_label, l.nearest_area_slug,
    l.nearest_distance_km, l.lat, l.lng, l.source, l.created_at,
  ].map(esc).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trimit-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
  grace_period: { label: 'Grace', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  past_due: { label: 'Past due', cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  payment_failed: { label: 'Failed', cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  expired: { label: 'Expired', cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  blocked: { label: 'Blocked', cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  none: { label: 'None', cls: 'bg-slate-600/20 text-slate-300 ring-slate-500/30' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.none;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {meta.label}
    </span>
  );
}

const isAuthError = (err) => err?.response?.status === 401 || err?.response?.status === 403;

// Mock chart data
function generateRevenueTrend() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return { date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: Math.floor(Math.random() * 5000) + 2000 };
  });
}

function generateUserGrowth() {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return { month: d.toLocaleDateString('en-IN', { month: 'short' }), owners: Math.floor(Math.random() * 20) + 5, customers: Math.floor(Math.random() * 100) + 20 };
  });
}

function generateBookingsByStatus() {
  return [
    { name: 'Pending', count: Math.floor(Math.random() * 30) + 5 },
    { name: 'Confirmed', count: Math.floor(Math.random() * 80) + 20 },
    { name: 'Completed', count: Math.floor(Math.random() * 60) + 15 },
    { name: 'Cancelled', count: Math.floor(Math.random() * 15) + 2 },
  ];
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => getAdminToken());
  const handleUnlocked = useCallback((newToken) => { setAdminToken(newToken); setToken(newToken); }, []);
  const handleLock = useCallback(() => { clearAdminToken(); setToken(null); }, []);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {token ? <DashboardShell token={token} onLock={handleLock} onAuthExpired={handleLock} /> : <PinLock onUnlocked={handleUnlocked} />}
    </div>
  );
}

// PIN lock screen
function PinLock({ onUnlocked }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const locked = now < lockUntil;
  const cooldown = locked ? Math.ceil((lockUntil - now) / 1000) : 0;

  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [locked]);

  const submit = async (e) => {
    e.preventDefault();
    if (pin.length < 6 || submitting || locked) return;
    setSubmitting(true);
    setError('');
    try {
      const { token } = await adminService.login(pin);
      if (!token) throw new Error('No token');
      onUnlocked(token);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) setError('Incorrect PIN.');
      else if (status === 404) setError('Admin not available.');
      else if (status === 429) { setError('Too many attempts.'); setLockUntil(Date.now() + 30000); }
      else setError(getApiErrorMessage(err, 'Could not unlock.'));
      if (status === 401) setLockUntil(Date.now() + 1500);
      setPin('');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-orange-600/20 blur-[120px]" />
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg">
            <ShieldCheck size={32} weight="fill" className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">TrimiT Admin</h1>
          <p className="mt-1 text-sm text-slate-400">Enter PIN to unlock</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input type="password" inputMode="numeric" autoFocus value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
            placeholder="••••••" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3.5 text-center text-lg tracking-[0.4em] text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/30" />
          {error && <p className="flex items-center gap-1.5 text-sm text-rose-400"><WarningCircle size={16} weight="fill" />{error}</p>}
          <button type="submit" disabled={pin.length < 6 || submitting || locked} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-700 py-3.5 font-semibold text-white shadow-lg transition disabled:opacity-50">
            {submitting ? <><Spinner size={18} className="animate-spin" /> Unlocking…</> : locked && cooldown > 0 ? `Wait ${cooldown}s` : <><LockKey size={18} weight="bold" /> Unlock</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// UI Components
function StatCard({ icon: Icon, label, value, sub, accent = 'orange', trend, loading }) {
  const accents = {
    orange: 'from-orange-500/20 to-orange-500/5 text-orange-300 ring-orange-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300 ring-emerald-500/20',
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-300 ring-sky-500/20',
    violet: 'from-violet-500/20 to-violet-500/5 text-violet-300 ring-violet-500/20',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-300 ring-rose-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-300 ring-amber-500/20',
  };
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-5 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          {loading ? <div className="mt-2 h-7 w-20 animate-pulse rounded bg-slate-700/60" /> : (
            <div className="mt-1.5 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-white">{value}</p>
              {trend !== undefined && <span className={`flex items-center gap-0.5 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{trend >= 0 ? <TrendUp size={12} /> : <TrendDown size={12} />}{Math.abs(trend)}%</span>}
            </div>
          )}
          {sub && !loading && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset ${accents[accent]}`}>
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
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">{Icon && <Icon size={20} weight="duotone" className="text-orange-300" />}{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 sm:w-64" />
    </div>
  );
}

function TableSkeleton({ cols = 5, rows = 5 }) {
  return (
    <div className="divide-y divide-white/5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-4">
          {Array.from({ length: cols }).map((_, c) => (<div key={c} className="h-4 flex-1 animate-pulse rounded bg-slate-700/50" style={{ animationDelay: `${(r + c) * 40}ms` }} />))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-500"><Icon size={24} weight="duotone" /></div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function InlineError({ message, onRetry }) {
  return (
    <div className="m-5 flex flex-col gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2"><WarningCircle size={18} weight="fill" className="text-rose-400" />{message}</span>
      {onRetry && <button onClick={onRetry} className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20">Retry</button>}
    </div>
  );
}

function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`relative w-full ${sizes[size]} rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"><X size={20} /></button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Dashboard Shell
const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'grace_period', label: 'Grace period' },
  { value: 'expired', label: 'Expired' },
  { value: 'blocked', label: 'Blocked' },
];

function DashboardShell({ token, onLock, onAuthExpired }) {
  const [overview, setOverview] = useState(null);
  const [owners, setOwners] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leadsByArea, setLeadsByArea] = useState([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'leads'
  const [selectedLeadIds, setSelectedLeadIds] = useState(() => new Set());
  const [markingNotified, setMarkingNotified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState({ overview: '', owners: '', customers: '' });
  const [ownerSearch, setOwnerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [grantingId, setGrantingId] = useState(null);
  const [grantMsg, setGrantMsg] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [blockModal, setBlockModal] = useState({ open: false, user: null, type: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null, type: null });
  const [inviteModal, setInviteModal] = useState({ open: false, type: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [revenueData] = useState(generateRevenueTrend);
  const [userGrowthData] = useState(generateUserGrowth);
  const [bookingsData] = useState(generateBookingsByStatus);

  const loadAll = useCallback(async ({ silent } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setErrors({ overview: '', owners: '', customers: '' });
    const results = await Promise.allSettled([
      adminService.getOverview(token),
      adminService.getOwners(token),
      adminService.getCustomers(token),
      adminService.getWaitlistLeads(token),
    ]);
    if (results.some((r) => r.status === 'rejected' && isAuthError(r.reason))) { onAuthExpired(); return; }
    const [ov, ow, cu, ld] = results;
    const nextErrors = { overview: '', owners: '', customers: '' };
    if (ov.status === 'fulfilled') setOverview(ov.value); else nextErrors.overview = getApiErrorMessage(ov.reason, 'Could not load overview.');
    if (ow.status === 'fulfilled') setOwners(ow.value); else nextErrors.owners = getApiErrorMessage(ow.reason, 'Could not load owners.');
    if (cu.status === 'fulfilled') setCustomers(cu.value); else nextErrors.customers = getApiErrorMessage(cu.reason, 'Could not load customers.');
    if (ld.status === 'fulfilled') {
      setLeads(ld.value?.leads ?? []);
      setLeadsByArea(ld.value?.by_area ?? []);
      setLeadsTotal(ld.value?.total ?? 0);
    }
    setErrors(nextErrors);
    setLoading(false);
    setRefreshing(false);
  }, [token, onAuthExpired]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleGrant = useCallback(async (owner) => {
    setGrantingId(owner.owner_id);
    setGrantMsg('');
    try {
      await adminService.grantSubscription(token, owner.owner_id, 30);
      setGrantMsg(`Granted 30 days to ${owner.name || owner.salon_name || 'owner'}.`);
      const [ow, ov] = await Promise.allSettled([adminService.getOwners(token), adminService.getOverview(token)]);
      if (ow.status === 'fulfilled') setOwners(ow.value);
      if (ov.status === 'fulfilled') setOverview(ov.value);
    } catch (err) {
      if (isAuthError(err)) { onAuthExpired(); return; }
      setGrantMsg(getApiErrorMessage(err, 'Could not grant.'));
    } finally { setGrantingId(null); setTimeout(() => setGrantMsg(''), 4000); }
  }, [token, onAuthExpired]);

  const toggleLead = useCallback((id) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAllLeads = useCallback((ids, checked) => {
    setSelectedLeadIds(checked ? new Set(ids) : new Set());
  }, []);

  const handleMarkNotified = useCallback(async (notified) => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    setMarkingNotified(true);
    try {
      await adminService.markLeadsNotified(token, ids, notified);
      const ld = await adminService.getWaitlistLeads(token);
      setLeads(ld?.leads ?? []);
      setLeadsByArea(ld?.by_area ?? []);
      setLeadsTotal(ld?.total ?? 0);
      setSelectedLeadIds(new Set());
    } catch (err) {
      if (isAuthError(err)) { onAuthExpired(); return; }
      alert(getApiErrorMessage(err, 'Could not update leads.'));
    } finally { setMarkingNotified(false); }
  }, [token, selectedLeadIds, onAuthExpired]);

  const handleBlock = useCallback(async (userId) => {
    setActionLoading(true);
    try {
      await adminService.blockUser(token, userId);
      setBlockModal({ open: false, user: null, type: null });
      loadAll({ silent: true });
    } catch (err) { if (isAuthError(err)) { onAuthExpired(); return; } alert(getApiErrorMessage(err, 'Could not block.')); }
    finally { setActionLoading(false); }
  }, [token, onAuthExpired, loadAll]);

  const handleUnblock = useCallback(async (userId) => {
    setActionLoading(true);
    try { await adminService.unblockUser(token, userId); loadAll({ silent: true }); }
    catch (err) { if (isAuthError(err)) { onAuthExpired(); return; } alert(getApiErrorMessage(err, 'Could not unblock.')); }
    finally { setActionLoading(false); }
  }, [token, onAuthExpired, loadAll]);

  const handleDelete = useCallback(async (userId) => {
    setActionLoading(true);
    try { await adminService.deleteUser(token, userId); setDeleteModal({ open: false, user: null, type: null }); loadAll({ silent: true }); }
    catch (err) { if (isAuthError(err)) { onAuthExpired(); return; } alert(getApiErrorMessage(err, 'Could not delete.')); }
    finally { setActionLoading(false); }
  }, [token, onAuthExpired, loadAll]);

  const handleInvite = useCallback(async (email, name, type) => {
    setActionLoading(true);
    try { await adminService.inviteUser(token, email, name, type); setInviteModal({ open: false, type: null }); loadAll({ silent: true }); }
    catch (err) { if (isAuthError(err)) { onAuthExpired(); return; } alert(getApiErrorMessage(err, 'Could not invite.')); }
    finally { setActionLoading(false); }
  }, [token, onAuthExpired, loadAll]);

  const totals = overview?.totals || {};
  const subs = overview?.subscriptions || {};
  const visitors = overview?.visitors || {};

  const filteredOwners = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    return owners.filter((o) => {
      if (statusFilter !== 'all' && (o.subscription_status || 'none') !== statusFilter) return false;
      if (!q) return true;
      return (o.name || '').toLowerCase().includes(q) || (o.email || '').toLowerCase().includes(q) || (o.salon_name || '').toLowerCase().includes(q);
    });
  }, [owners, ownerSearch, statusFilter]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const subscriptionPieData = useMemo(() => [
    { name: 'Active', value: subs.active || 0, color: BRAND.emerald },
    { name: 'Trial', value: subs.trialing || 0, color: BRAND.sky },
    { name: 'Expired', value: subs.expired_or_lapsed || 0, color: BRAND.rose },
  ], [subs]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-900/40">
            <ShieldCheck size={24} weight="fill" className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">Admin Dashboard</h1>
            <p className="flex items-center gap-1.5 text-xs text-slate-400"><Clock size={13} />{overview?.generated_at ? `Updated ${timeAgo(overview.generated_at)}` : 'Loading…'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadAll({ silent: true })} disabled={refreshing || loading} className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 disabled:opacity-50">
            <ArrowsClockwise size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={onLock} className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200">
            <SignOut size={16} /> Lock
          </button>
        </div>
      </header>

      {/* View tabs */}
      <div className="mb-6 flex items-center gap-2 border-b border-white/10">
        {[
          { key: 'dashboard', label: 'Dashboard', Icon: ChartLineUp },
          { key: 'leads', label: 'Notify Me', Icon: EnvelopeSimple, badge: leadsTotal },
        ].map(({ key, label, Icon, badge }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              view === key
                ? 'border-orange-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon size={16} weight="duotone" />
            {label}
            {badge > 0 && (
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-200">{badge}</span>
            )}
          </button>
        ))}
      </div>

      {errors.overview && !overview && <InlineError message={errors.overview} onRetry={() => loadAll()} />}

      {view === 'dashboard' && (
      <>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Storefront} accent="orange" label="Salon Owners" value={formatNumber(totals.owners)} loading={loading} />
        <StatCard icon={UsersThree} accent="sky" label="Customers" value={formatNumber(totals.customers)} loading={loading} />
        <StatCard icon={Buildings} accent="violet" label="Salons" value={formatNumber(totals.salons)} loading={loading} />
        <StatCard icon={CalendarCheck} accent="emerald" label="Bookings" value={formatNumber(totals.bookings)} loading={loading} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Wallet} accent="emerald" label="MRR" value={formatINR(subs.mrr)} loading={loading} />
        <StatCard icon={ChartLineUp} accent="emerald" label="ARR" value={formatINR(subs.arr)} loading={loading} />
        <StatCard icon={CurrencyInr} accent="orange" label="Revenue" value={formatINR(subs.total_revenue_collected)} loading={loading} />
        <StatCard icon={CheckCircle} accent="sky" label="Active Subs" value={formatNumber(subs.active)} sub={`${formatNumber(subs.trialing)} trialing`} loading={loading} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Sparkle} accent="amber" label="Trials" value={formatNumber(subs.trialing)} loading={loading} />
        <StatCard icon={WarningCircle} accent="rose" label="Expired" value={formatNumber(subs.expired_or_lapsed)} loading={loading} />
        <StatCard icon={Eye} accent="violet" label="Views (24h)" value={formatNumber(visitors.page_views_24h)} sub={`${formatNumber(visitors.page_views_7d)} in 7d`} loading={loading} />
        <StatCard icon={UserCircle} accent="orange" label="Visitors (30d)" value={formatNumber(visitors.unique_visitors_30d)} loading={loading} />
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <SectionCard title="Revenue Trend (30 days)" icon={ChartLineUp}>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={BRAND.primary} stopOpacity={0.3} /><stop offset="95%" stopColor={BRAND.primary} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#F8FAFC' }} formatter={(v) => [formatINR(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke={BRAND.primary} strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Subscription Breakdown */}
        <SectionCard title="Subscriptions" icon={Sparkle}>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subscriptionPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {subscriptionPieData.map((entry, i) => (<Cell key={`cell-${i}`} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} />
                <Legend verticalAlign="middle" align="right" layout="vertical" formatter={(v) => <span className="text-slate-300">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* User Growth */}
        <SectionCard title="User Growth (12 mo)" icon={TrendUp}>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} />
                <Area type="monotone" dataKey="customers" stroke={BRAND.sky} fill={BRAND.sky} fillOpacity={0.2} name="Customers" />
                <Area type="monotone" dataKey="owners" stroke={BRAND.primary} fill={BRAND.primary} fillOpacity={0.2} name="Owners" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Bookings by Status */}
        <SectionCard title="Bookings by Status" icon={CalendarCheck}>
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bookingsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8 }} />
                <Bar dataKey="count" fill={BRAND.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Owners Table */}
      <div className="mt-8">
        <SectionCard title="Salon Owners" icon={Storefront} right={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setInviteModal({ open: true, type: 'owner' })} className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/20">
              <UserPlus size={14} weight="bold" /> Invite Owner
            </button>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-3 pr-9 text-sm text-white outline-none">
              {STATUS_FILTERS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
            </select>
            <SearchInput value={ownerSearch} onChange={setOwnerSearch} placeholder="Search owners…" />
          </div>
        }>
          {grantMsg && <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"><CheckCircle size={16} weight="fill" />{grantMsg}</div>}
          {loading ? <TableSkeleton cols={6} rows={6} /> : errors.owners ? <InlineError message={errors.owners} onRetry={() => loadAll()} /> : filteredOwners.length === 0 ? <EmptyState icon={Storefront} title={owners.length === 0 ? 'No owners yet' : 'No matches'} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Owner</th>
                    <th className="px-5 py-3 font-medium">Salon</th>
                    <th className="px-5 py-3 font-medium">Contact</th>
                    <th className="px-5 py-3 font-medium">UPI ID</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Trial</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOwners.map((o) => (
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
                      <td className="px-5 py-4"><StatusBadge status={o.subscription_status || 'none'} /></td>
                      <td className="px-5 py-4">
                        {o.is_trial && typeof o.trial_days_remaining === 'number' ? <span className="text-sky-300">{o.trial_days_remaining} days left</span> : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleGrant(o)} disabled={grantingId === o.owner_id} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50">
                            {grantingId === o.owner_id ? <Spinner size={12} className="animate-spin" /> : <CheckCircle size={12} weight="bold" />} Grant
                          </button>
                          <button onClick={() => setBlockModal({ open: true, user: o, type: 'owner' })} className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20">
                            <Prohibit size={12} weight="bold" /> Block
                          </button>
                          <button onClick={() => setDeleteModal({ open: true, user: o, type: 'owner' })} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20">
                            <Trash size={12} weight="bold" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Customers Table */}
      <div className="mt-8 mb-12">
        <SectionCard title="Customers" icon={UsersThree} right={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setInviteModal({ open: true, type: 'customer' })} className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/20">
              <UserPlus size={14} weight="bold" /> Invite Customer
            </button>
            <SearchInput value={customerSearch} onChange={setCustomerSearch} placeholder="Search customers…" />
          </div>
        }>
          {loading ? <TableSkeleton cols={5} rows={6} /> : errors.customers ? <InlineError message={errors.customers} onRetry={() => loadAll()} /> : filteredCustomers.length === 0 ? <EmptyState icon={UsersThree} title={customers.length === 0 ? 'No customers yet' : 'No matches'} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="transition hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400"><UserCircle size={20} weight="duotone" /></div>
                          <span className="font-medium text-white">{c.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-300">{c.email || '—'}</td>
                      <td className="px-5 py-4 text-slate-300">{c.phone || '—'}</td>
                      <td className="px-5 py-4 text-slate-400">{formatDateTime(c.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setBlockModal({ open: true, user: c, type: 'customer' })} className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20">
                            <Prohibit size={12} weight="bold" /> Block
                          </button>
                          <button onClick={() => setDeleteModal({ open: true, user: c, type: 'customer' })} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20">
                            <Trash size={12} weight="bold" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
      </>
      )}

      {view === 'leads' && (
      <>
      {/* Notify Me — out-of-area demand leads (separate screen) */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
        <MapPin size={16} weight="fill" className="text-orange-300" />
        TrimiT is currently live in <strong className="text-white">Jammu</strong>. These people asked to be notified when we launch in their area.
      </div>
      <div className="mt-2 mb-12">
        <SectionCard title="Waitlist Leads" icon={EnvelopeSimple} right={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200">{leadsTotal} total</span>
            {selectedLeadIds.size > 0 && (
              <button onClick={() => handleMarkNotified(true)} disabled={markingNotified} className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/20 disabled:opacity-50">
                {markingNotified ? <Spinner size={14} className="animate-spin" /> : <CheckCircle size={14} weight="bold" />} Mark {selectedLeadIds.size} as notified
              </button>
            )}
            {leads.length > 0 && (
              <button onClick={() => exportLeadsCsv(leads)} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20">
                <Export size={14} weight="bold" /> Export CSV
              </button>
            )}
          </div>
        }>
          {leadsByArea.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-4">
              {leadsByArea.map((b) => (
                <span key={b.area} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
                  <MapPin size={12} weight="duotone" className="text-orange-300" />
                  <span className="font-medium text-white">{b.area}</span>
                  <span className="text-slate-400">· {b.count}</span>
                </span>
              ))}
            </div>
          )}
          {loading ? <TableSkeleton cols={5} rows={5} /> : leads.length === 0 ? <EmptyState icon={EnvelopeSimple} title="No waitlist leads yet" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all leads"
                        className="h-4 w-4 rounded border-white/20 bg-slate-800 accent-orange-500"
                        checked={leads.length > 0 && selectedLeadIds.size === leads.length}
                        onChange={(e) => toggleAllLeads(leads.map((l) => l.id), e.target.checked)}
                      />
                    </th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Nearest City</th>
                    <th className="px-5 py-3 font-medium">Distance</th>
                    <th className="px-5 py-3 font-medium">Source</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leads.map((l) => (
                    <tr key={l.id} className={`transition hover:bg-white/[0.03] ${selectedLeadIds.has(l.id) ? 'bg-orange-500/[0.06]' : ''}`}>
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${l.email}`}
                          className="h-4 w-4 rounded border-white/20 bg-slate-800 accent-orange-500"
                          checked={selectedLeadIds.has(l.id)}
                          onChange={() => toggleLead(l.id)}
                        />
                      </td>
                      <td className="px-5 py-4 font-medium text-white">{l.name || '—'}</td>
                      <td className="px-5 py-4 text-slate-300">{l.email}</td>
                      <td className="px-5 py-4 text-slate-300">{l.area_label || l.nearest_area_slug || '—'}</td>
                      <td className="px-5 py-4 text-slate-400">{typeof l.nearest_distance_km === 'number' ? `${Math.round(l.nearest_distance_km)} km` : '—'}</td>
                      <td className="px-5 py-4 text-slate-400 capitalize">{l.source || '—'}</td>
                      <td className="px-5 py-4">
                        {l.notified_at ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300"><CheckCircle size={12} weight="fill" /> Notified</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/40 px-2 py-1 text-xs font-medium text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400">{formatDateTime(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
      </>
      )}

      {/* Block Modal */}
      <Modal open={blockModal.open} onClose={() => setBlockModal({ open: false, user: null, type: null })} title={`Block ${blockModal.type === 'owner' ? 'Owner' : 'Customer'}`}>
        <p className="mb-4 text-slate-300">Are you sure you want to block <strong className="text-white">{blockModal.user?.name || blockModal.user?.email}</strong>? They will not be able to access the app.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setBlockModal({ open: false, user: null, type: null })} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5">Cancel</button>
          <button onClick={() => handleBlock(blockModal.user?.id || blockModal.user?.owner_id)} disabled={actionLoading} className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50">
            {actionLoading ? <Spinner size={14} className="animate-spin" /> : <Prohibit size={14} weight="bold" />} Block User
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, user: null, type: null })} title={`Delete ${deleteModal.type === 'owner' ? 'Owner' : 'Customer'}`}>
        <p className="mb-4 text-slate-300">Are you sure you want to <span className="text-rose-400 font-semibold">permanently delete</span> <strong className="text-white">{deleteModal.user?.name || deleteModal.user?.email}</strong>? This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteModal({ open: false, user: null, type: null })} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5">Cancel</button>
          <button onClick={() => handleDelete(deleteModal.user?.id || deleteModal.user?.owner_id)} disabled={actionLoading} className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50">
            {actionLoading ? <Spinner size={14} className="animate-spin" /> : <Trash size={14} weight="bold" />} Delete User
          </button>
        </div>
      </Modal>

      {/* Invite Modal */}
      <InviteModal open={inviteModal.open} onClose={() => setInviteModal({ open: false, type: null })} type={inviteModal.type} onInvite={handleInvite} loading={actionLoading} />
    </div>
  );
}

// Invite Modal Component
function InviteModal({ open, onClose, type, onInvite, loading }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    onInvite(email.trim(), name.trim(), type);
  };
  
  if (!open) return null;
  
  return (
    <Modal open={open} onClose={onClose} title={`Invite ${type === 'owner' ? 'Owner' : 'Customer'}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 px-4 text-sm text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Name (optional)</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 px-4 text-sm text-white outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5">Cancel</button>
          <button type="submit" disabled={!email.trim() || loading} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-700 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50">
            {loading ? <Spinner size={14} className="animate-spin" /> : <EnvelopeSimple size={14} weight="bold" />} Send Invite
          </button>
        </div>
      </form>
    </Modal>
  );
}
