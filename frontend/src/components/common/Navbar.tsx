import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificationAPI } from '../../services/endpoints';
import { Menu, Bell, Plus, AlertCircle, FileText, ShoppingCart } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { business, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await NotificationAPI.list({ limit: 5 });
      setNotifications(res.data?.data?.notifications || []);
      setUnreadCount(res.data?.data?.unreadCount || 0);
    } catch (err) {
      // quiet fail on background poll
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Store Dashboard';
    if (path.startsWith('/pos')) return 'POS Billing Terminal';
    if (path.startsWith('/sales')) return 'Sales & Invoices';
    if (path.startsWith('/products')) return 'Grocery Products';
    if (path.startsWith('/categories')) return 'Product Categories';
    if (path.startsWith('/inventory')) return 'Inventory & Stock';
    if (path.startsWith('/purchases')) return 'Purchases & Goods Inward';
    if (path.startsWith('/suppliers')) return 'Suppliers Directory';
    if (path.startsWith('/customers')) return 'Customer Directory';
    if (path.startsWith('/returns')) return 'Sales Returns & Refunds';
    if (path.startsWith('/expenses')) return 'Shop Expenses';
    if (path.startsWith('/reports')) return 'Sales & Financial Reports';
    if (path.startsWith('/settings')) return 'Shop & Terminal Settings';
    if (path.startsWith('/setup-wizard')) return 'Store Setup Wizard';
    return 'BillFlow Grocery';
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
      {/* Left: Mobile trigger & Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {getPageTitle()}
          </h1>
          <p className="hidden sm:block text-xs text-slate-400 dark:text-slate-500">
            {business?.name} ({business?.currency || 'USD'})
          </p>
        </div>
      </div>

      {/* Right: Actions, Notifications, Theme, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Setup Wizard Warning Pill if not finished */}
        {business && !business.setup_completed && (
          <Link
            to="/setup-wizard"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition animate-pulse"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Finish Setup Wizard</span>
          </Link>
        )}

        {/* Quick Open POS Button */}
        <button
          onClick={() => navigate('/pos')}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition hover:scale-[1.02]"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">POS Counter</span>
        </button>

        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-scale-in">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                >
                  View All
                </Link>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        setShowNotifications(false);
                        if (notif.link) navigate(notif.link);
                      }}
                      className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition flex items-start gap-3 ${
                        !notif.is_read ? 'bg-brand-50/30 dark:bg-brand-950/20' : ''
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
