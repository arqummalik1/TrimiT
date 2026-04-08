import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  CurrencyInr, 
  CalendarCheck, 
  ChartLineUp, 
  Clock,
  Users,
  Storefront,
  ArrowRight,
  CheckCircle,
  XCircle,
  Hourglass
} from '@phosphor-icons/react';
import api from '../../lib/api';
import { formatPrice } from '../../lib/utils';

const OwnerDashboard = () => {
  const { data: salon } = useQuery({
    queryKey: ['ownerSalon'],
    queryFn: async () => {
      const response = await api.get('/api/owner/salon');
      return response.data;
    },
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['ownerAnalytics'],
    queryFn: async () => {
      const response = await api.get('/api/owner/analytics');
      return response.data;
    },
  });

  const statCards = [
    {
      title: 'Total Earnings',
      value: formatPrice(analytics?.total_earnings || 0),
      icon: CurrencyInr,
      color: 'bg-emerald-100 text-emerald-800',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Total Bookings',
      value: analytics?.total_bookings || 0,
      icon: CalendarCheck,
      color: 'bg-blue-100 text-blue-800',
      iconColor: 'text-blue-600',
    },
    {
      title: "Today's Bookings",
      value: analytics?.today_bookings || 0,
      icon: Clock,
      color: 'bg-orange-100 text-orange-800',
      iconColor: 'text-orange-600',
    },
    {
      title: 'Pending',
      value: analytics?.pending_bookings || 0,
      icon: Hourglass,
      color: 'bg-yellow-100 text-yellow-800',
      iconColor: 'text-yellow-600',
    },
  ];

  const quickActions = [
    { title: 'Manage Salon', icon: Storefront, href: '/owner/salon', color: 'bg-orange-800' },
    { title: 'View Bookings', icon: CalendarCheck, href: '/owner/bookings', color: 'bg-emerald-800' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-12" data-testid="owner-dashboard">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-heading text-3xl font-bold text-stone-900 mb-2">
            Dashboard
          </h1>
          <p className="text-stone-500">
            {salon ? `Welcome back, ${salon.name}` : 'Set up your salon to get started'}
          </p>
        </motion.div>

        {!salon ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-stone-200 p-12 text-center"
          >
            <Storefront size={64} weight="duotone" className="mx-auto text-stone-300 mb-4" />
            <h2 className="font-heading text-2xl font-bold text-stone-700 mb-3">
              Create Your Salon
            </h2>
            <p className="text-stone-500 mb-6 max-w-md mx-auto">
              Start by setting up your salon profile. Add your business details, services, and start accepting bookings.
            </p>
            <Link 
              to="/owner/salon" 
              data-testid="create-salon-btn"
              className="btn-primary inline-flex items-center gap-2"
            >
              Create Salon
              <ArrowRight size={20} />
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl border border-stone-200 p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`p-2 rounded-xl ${stat.color}`}>
                      <stat.icon size={22} weight="bold" className={stat.iconColor} />
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 mb-1">{stat.title}</p>
                  <p className="font-heading text-2xl font-bold text-stone-900">
                    {analyticsLoading ? '...' : stat.value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Booking Status Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid md:grid-cols-2 gap-6 mb-8"
            >
              {/* Booking Status */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h2 className="font-heading text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                  <ChartLineUp size={22} weight="duotone" />
                  Booking Overview
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hourglass size={18} className="text-yellow-600" />
                      <span className="text-stone-600">Pending</span>
                    </div>
                    <span className="font-semibold text-stone-900">
                      {analytics?.pending_bookings || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-blue-600" />
                      <span className="text-stone-600">Confirmed</span>
                    </div>
                    <span className="font-semibold text-stone-900">
                      {analytics?.confirmed_bookings || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-600" />
                      <span className="text-stone-600">Completed</span>
                    </div>
                    <span className="font-semibold text-stone-900">
                      {analytics?.completed_bookings || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle size={18} className="text-red-600" />
                      <span className="text-stone-600">Cancelled</span>
                    </div>
                    <span className="font-semibold text-stone-900">
                      {analytics?.cancelled_bookings || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h2 className="font-heading text-lg font-bold text-stone-900 mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  {quickActions.map((action) => (
                    <Link
                      key={action.title}
                      to={action.href}
                      className="flex items-center justify-between p-4 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`p-2 rounded-xl ${action.color} text-white`}>
                          <action.icon size={20} weight="bold" />
                        </span>
                        <span className="font-medium text-stone-700">{action.title}</span>
                      </div>
                      <ArrowRight size={18} className="text-stone-400 group-hover:text-stone-600 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Services Preview */}
            {salon.services?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-stone-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-lg font-bold text-stone-900">
                    Your Services
                  </h2>
                  <Link 
                    to="/owner/services" 
                    className="text-sm text-orange-800 font-medium hover:underline"
                  >
                    Manage All
                  </Link>
                </div>
                <div className="grid gap-3">
                  {salon.services.slice(0, 4).map((service) => (
                    <div 
                      key={service.id}
                      className="flex items-center justify-between p-3 bg-stone-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-stone-900">{service.name}</p>
                        <p className="text-sm text-stone-500">{service.duration} mins</p>
                      </div>
                      <span className="font-semibold text-orange-800">
                        {formatPrice(service.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OwnerDashboard;
