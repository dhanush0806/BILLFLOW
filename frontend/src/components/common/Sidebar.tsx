import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from './BrandLogo';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  FolderTree,
  Boxes,
  Truck,
  Building,
  Users,
  Undo2,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const { business, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  // Exactly the 13 required pages from the specification:
  // 1. Dashboard
  // 2. POS Billing
  // 3. Sales / Invoices
  // 4. Products
  // 5. Categories
  // 6. Inventory
  // 7. Purchases
  // 8. Suppliers
  // 9. Customers
  // 10. Sales Returns
  // 11. Expenses
  // 12. Reports
  // 13. Settings
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, adminOnly: true },
    { name: 'POS Billing', path: '/pos', icon: ShoppingCart, adminOnly: false, isPos: true },
    { name: 'Sales / Invoices', path: '/sales', icon: Receipt, adminOnly: false },
    { name: 'Products', path: '/products', icon: Package, adminOnly: false },
    { name: 'Categories', path: '/categories', icon: FolderTree, adminOnly: false },
    { name: 'Inventory', path: '/inventory', icon: Boxes, adminOnly: false },
    { name: 'Purchases', path: '/purchases', icon: Truck, adminOnly: true },
    { name: 'Suppliers', path: '/suppliers', icon: Building, adminOnly: true },
    { name: 'Customers', path: '/customers', icon: Users, adminOnly: false },
    { name: 'Sales Returns', path: '/returns', icon: Undo2, adminOnly: false },
    { name: 'Expenses', path: '/expenses', icon: Wallet, adminOnly: true },
    { name: 'Reports', path: '/reports', icon: BarChart3, adminOnly: true },
    { name: 'Settings', path: '/settings', icon: Settings, adminOnly: true },
  ];

  const visibleItems = menuItems.filter((item) => (item.adminOnly ? isAdmin : true));

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 shadow-sm ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <NavLink to={isAdmin ? '/dashboard' : '/pos'} className="hover:opacity-95 transition">
            <BrandLogo
              size="md"
              badge="RETAIL"
              subtitle={business?.name || 'Grocery Shop Billing'}
            />
          </NavLink>
        </div>

        {/* Store Indicator Bar */}
        <div className="px-4 py-2 bg-emerald-50/80 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="font-semibold text-emerald-900 dark:text-emerald-300 truncate text-[11px]">
              {business?.name || 'Grocery Supermarket'}
            </span>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {business?.currency || '₹'}
          </span>
        </div>

        {/* 13 Main Pages Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {visibleItems.map((item) => {
            if (item.isPos) {
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all mb-2 shadow-sm ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/50'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  <span className="flex items-center gap-1 text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>POS</span>
                  </span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border-l-4 border-emerald-600'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Footer staff info & logout */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.fullName}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            </div>
            <span
              className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                user?.role === 'admin'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {user?.role === 'admin' ? 'Shop Owner' : 'Cashier'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
