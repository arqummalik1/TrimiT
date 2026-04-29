import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, X, Check, SpeakerHigh, SpeakerSlash, CaretDown, Spinner } from '@phosphor-icons/react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import api from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = ({ isOwner = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingBookingId, setLoadingBookingId] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const dropdownRef = useRef(null);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    soundEnabled,
    toggleSound,
    addNotification,
  } = useNotificationStore();
  const { profile } = useAuthStore();
  const { success, error } = useToastStore();


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleMarkAsRead = (e, id) => {
    e.stopPropagation();
    markAsRead(id);
  };

  const handleMarkAllAsRead = (e) => {
    e.stopPropagation();
    markAllAsRead();
  };

  const handleClear = (e, id) => {
    e.stopPropagation();
    clearNotification(id);
  };

  const handleAcceptBooking = async (e, bookingId, notificationId) => {
    e.stopPropagation();
    setLoadingBookingId(bookingId);
    setLoadingAction('accept');
    
    try {
      const response = await api.post(`/api/owner/bookings/${bookingId}/accept`);
      
      if (response.data) {
        success('Booking accepted successfully!', { title: 'Success' });
        markAsRead(notificationId);
        // Close dropdown after successful action
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to accept booking:', err);
      error(err.response?.data?.detail || 'Failed to accept booking. Please try again.', { title: 'Error' });
    } finally {
      setLoadingBookingId(null);
      setLoadingAction(null);
    }
  };

  const handleRejectBooking = async (e, bookingId, notificationId) => {
    e.stopPropagation();
    setLoadingBookingId(bookingId);
    setLoadingAction('reject');
    
    try {
      const response = await api.post(`/api/owner/bookings/${bookingId}/reject`);
      
      if (response.data) {
        success('Booking rejected successfully!', { title: 'Success' });
        markAsRead(notificationId);
        // Close dropdown after successful action
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to reject booking:', err);
      error(err.response?.data?.detail || 'Failed to reject booking. Please try again.', { title: 'Error' });
    } finally {
      setLoadingBookingId(null);
      setLoadingAction(null);
    }
  };

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

  const groupedNotifications = notifications.reduce((groups, notification) => {
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-stone-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell weight={isOpen ? 'fill' : 'regular'} size={24} className="text-stone-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-800 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-stone-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-stone-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-orange-800 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSound();
                }}
                className="p-1.5 hover:bg-stone-200 rounded-lg transition-colors"
                title={soundEnabled ? 'Disable sound' : 'Enable sound'}
              >
                {soundEnabled ? (
                  <SpeakerHigh size={18} className="text-stone-600" />
                ) : (
                  <SpeakerSlash size={18} className="text-stone-400" />
                )}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-orange-800 hover:text-orange-900 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                <Bell size={48} className="mx-auto mb-3 text-stone-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
                <div key={group}>
                  <div className="px-4 py-2 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                    {group}
                  </div>
                  {groupNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-stone-100 hover:bg-stone-50 transition-colors ${
                        !notification.isRead ? 'bg-orange-50/50' : ''
                      }`}
                      onClick={() => handleMarkAsRead(null, notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-stone-800 text-sm">
                                {notification.title}
                              </p>
                              <p className="text-stone-600 text-xs mt-0.5">
                                {notification.message}
                              </p>
                              <p className="text-stone-400 text-xs mt-1">
                                {formatDistanceToNow(new Date(notification.timestamp), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Action buttons for owner on booking notifications */}
                          {isOwner &&
                            notification.type === 'booking_created' &&
                            notification.data?.bookingId && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={(e) => handleAcceptBooking(e, notification.data.bookingId, notification.id)}
                                  disabled={loadingBookingId === notification.data.bookingId}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {loadingBookingId === notification.data.bookingId && loadingAction === 'accept' ? (
                                    <Spinner size={14} className="animate-spin" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                  {loadingBookingId === notification.data.bookingId && loadingAction === 'accept' ? 'Accepting...' : 'Accept'}
                                </button>
                                <button
                                  onClick={(e) => handleRejectBooking(e, notification.data.bookingId, notification.id)}
                                  disabled={loadingBookingId === notification.data.bookingId}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {loadingBookingId === notification.data.bookingId && loadingAction === 'reject' ? (
                                    <Spinner size={14} className="animate-spin" />
                                  ) : (
                                    <X size={14} />
                                  )}
                                  {loadingBookingId === notification.data.bookingId && loadingAction === 'reject' ? 'Rejecting...' : 'Reject'}
                                </button>
                              </div>
                            )}

                          {/* Delete button */}
                          <button
                            onClick={(e) => handleClear(e, notification.id)}
                            className="absolute top-2 right-2 p-1 hover:bg-stone-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={14} className="text-stone-400 hover:text-stone-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-stone-50 border-t border-stone-200">
              <Link
                to={isOwner ? '/owner/notifications' : '/notifications'}
                className="text-sm text-orange-800 hover:text-orange-900 font-medium block text-center"
                onClick={() => setIsOpen(false)}
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
