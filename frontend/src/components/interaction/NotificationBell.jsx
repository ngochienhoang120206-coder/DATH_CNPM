import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const formatTimeAgo = (isoDate) => {
  if (!isoDate) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
};

export default function NotificationBell({ dark = true }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      setNotifications(items);
      const unread =
        typeof res.data?.unreadCount === 'number'
          ? res.data.unreadCount
          : items.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (_err) {
      // Silent fail when unauthenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 30000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notif) => {
    try {
      if (!notif.is_read) {
        await api.put(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((item) => (item.id === notif.id ? { ...item, is_read: true } : item))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      if (notif.link) {
        setIsOpen(false);
        navigate(notif.link);
      }
    } catch (_err) {
      // Ignore error
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (_err) {
      // Ignore error
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        data-testid="notification-bell-btn"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) fetchNotifications();
        }}
        className={`relative p-2 rounded-lg border transition flex items-center justify-center ${
          dark
            ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
        }`}
        title="Notifications"
        aria-label="Notifications"
      >
        <span className="text-base leading-none">🔔</span>
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white text-slate-900 shadow-2xl border border-slate-200 z-50 overflow-hidden"
        >
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-blue-300 hover:text-white font-semibold underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleMarkAsRead(n)}
                  className={`w-full text-left px-4 py-3 transition flex items-start gap-3 hover:bg-slate-50 ${
                    !n.is_read ? 'bg-blue-50/60' : 'bg-white'
                  }`}
                >
                  <span
                    className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      !n.is_read ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    {n.title && (
                      <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                    )}
                    <p className="text-xs text-slate-700 leading-relaxed break-words">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}