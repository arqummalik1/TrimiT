import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Trash2, CheckAll, Filter, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';

const OwnerNotifications = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    soundEnabled,
    toggleSound,
  } = useNotificationStore();
  const [filter, setFilter] = useState('all'); // all, unread, bookings, status

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'bookings') return notification.type === 'booking_created';
    if (filter === 'status') return ['booking_accepted', 'booking_rejected', 'booking_cancelled'].includes(notification.type);
    return true;
  });

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let group;
    if (date.toDateString() === today.toDateString()) {
      group = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      group = 'Yesterday';
    } else {
      group = 'Earlier';
    }

    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(notification);
    return groups;
  }, {});

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_created':
        return <span className="text-green-500">📅</span>;
      case 'booking_accepted':
        return <span className="text-blue-500">✅</span>;
      case 'booking_rejected':
        return <span className="text-red-500">❌</span>;
      case 'booking_cancelled':
        return <span className="text-orange-500">🗑️</span>;
      default:
        return <span className="text-gray-500">🔔</span>;
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      const response = await fetch(`/api/owner/bookings/${bookingId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const notification = notifications.find((n) => n.data?.bookingId === bookingId);
        if (notification) markAsRead(notification.id);
      }
    } catch (error) {
      console.error('Failed to accept booking:', error);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    try {
      const response = await fetch(`/api/owner/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const notification = notifications.find((n) => n.data?.bookingId === bookingId);
        if (notification) markAsRead(notification.id);
      }
    } catch (error) {
      console.error('Failed to reject booking:', error);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold text-stone-900">
                Notifications
              </h1>
              <p className="text-stone-500 mt-1">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSound}
                className="p-2 bg-white rounded-xl border border-stone-200 hover:border-orange-800 transition-colors"
                title={soundEnabled ? 'Disable sound' : 'Enable sound'}
              >
                {soundEnabled ? (
                  <SpeakerHigh size={20} className="text-stone-600" />
                ) : (
                  <SpeakerSlash size={20} className="text-stone-400" />
                )}
              </button>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-2 bg-white rounded-xl border border-stone-200 hover:border-red-600 transition-colors"
                  title="Clear all notifications"
                >
                  <Trash2 size={20} className="text-stone-600" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { value: 'all', label: 'All', count: notifications.length },
              { value: 'unread', label: 'Unread', count: unreadCount },
              { value: 'bookings', label: 'Bookings', count: notifications.filter((n) => n.type === 'booking_created').length },
              { value: 'status', label: 'Status Updates', count: notifications.filter((n) => ['booking_accepted', 'booking_rejected', 'booking_cancelled'].includes(n.type)).length },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === item.value
                    ? 'bg-orange-800 text-white'
                    : 'bg-white text-stone-600 border border-stone-200 hover:border-orange-800'
                }`}
              >
                {item.label}
                {item.count > 0 && ` (${item.count})`}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <Bell size={64} className="mx-auto mb-4 text-stone-300" />
            <p className="text-stone-500 text-lg">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {unreadCount > 0 && filter !== 'unread' && (
              <div className="mb-4">
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-800 text-white rounded-lg hover:bg-orange-900 transition-colors"
                >
                  <CheckAll size={20} />
                  Mark all as read
                </button>
              </div>
            )}

            {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
              <div key={group} className="mb-6">
                <div className="px-4 py-2 bg-stone-100 rounded-lg mb-2">
                  <h3 className="text-sm font-semibold text-stone-600">{group}</h3>
                </div>
                {groupNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`mb-2 bg-white rounded-xl border ${
                      !notification.isRead ? 'border-orange-300 bg-orange-50/30' : 'border-stone-200'
                    } hover:border-orange-800 transition-colors`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-stone-800">{notification.title}</h4>
                              <p className="text-stone-600 text-sm mt-1">{notification.message}</p>
                              <p className="text-stone-400 text-xs mt-2">
                                {formatDistanceToNow(new Date(notification.timestamp), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => clearNotification(notification.id)}
                                className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={18} className="text-stone-400 hover:text-red-600" />
                              </button>
                            </div>
                          </div>

                          {/* Action buttons for booking notifications */}
                          {notification.type === 'booking_created' && notification.data?.bookingId && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleAcceptBooking(notification.data.bookingId)}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRejectBooking(notification.data.bookingId)}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OwnerNotifications;
