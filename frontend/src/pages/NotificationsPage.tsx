import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationAPI } from '../services/endpoints';
import { Notification } from '../types';
import { useToast } from '../context/ToastContext';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import {
  Bell,
  CheckCircle2,
  FileText,
  CreditCard,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await NotificationAPI.list({ limit: 50 });
      setNotifications(res.data?.data?.notifications || []);
      setUnreadCount(res.data?.data?.unreadCount || 0);
    } catch (err) {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, link?: string) => {
    try {
      await NotificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) navigate(link);
    } catch (err) {
      // quiet fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      showToast('Failed to update notifications', 'error');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice_issued':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'payment_received':
        return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case 'invoice_overdue':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      default:
        return <Bell className="w-5 h-5 text-brand-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Notifications</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            System activity feeds, issued invoices, overdue notices, and recorded remittances.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition self-start sm:self-auto"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All Caught Up!"
          description="You don't have any pending alerts or activities right now."
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkAsRead(n.id, n.link)}
              className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50/70 cursor-pointer transition ${
                !n.is_read ? 'bg-brand-50/20' : ''
              }`}
            >
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{n.title}</h4>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
              </div>

              {!n.is_read && (
                <span className="w-2 h-2 rounded-full bg-brand-600 shrink-0 self-center" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
