import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Boxes,
  Truck,
  RotateCcw,
  BarChart3,
  Receipt,
  ArrowRight,
  Store,
  CreditCard,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { BrandLogo } from '../components/common/BrandLogo';

export const LandingPage: React.FC = () => {
  const { user, token } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link to="/" className="hover:opacity-95 transition">
            <BrandLogo size="md" badge="GROCERY" subtitle="Grocery Shop Billing & Management" />
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />

            {token && user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={user.role === 'cashier' ? '/pos' : '/dashboard'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-sm transition"
                >
                  <span>{user.role === 'cashier' ? 'Open POS Billing' : 'Open Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-sm transition"
                >
                  <span>Register Shop</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-16 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-6">
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dedicated Grocery & Supermarket Billing System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Professional Grocery Shop Billing & Management System
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Fast POS counter billing, grocery catalog, stock management, supplier purchases, customer billing history, expense tracking, and real-time financial reporting.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Open POS Billing Counter</span>
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-sm transition flex items-center justify-center gap-2"
            >
              <span>Register New Shop</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Grocery Feature Modules */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Essential Grocery Shop Modules
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Built specifically for day-to-day grocery store counter operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: 'POS Billing Terminal',
                desc: 'Fast product search by name or SKU, cart quantity controls, item-level discounts, configurable tax, cash change calculation, and printable receipts.',
                icon: ShoppingCart,
              },
              {
                title: 'Product & Stock Management',
                desc: 'Organized grocery catalog with selling prices, purchase costs, current inventory levels, units (kg, litre, packet, piece), and low-stock alerts.',
                icon: Package,
              },
              {
                title: 'Category Organization',
                desc: 'Structured grocery departments including Rice & Grains, Pulses, Dairy, Beverages, Snacks, Personal Care, and Household Items.',
                icon: Boxes,
              },
              {
                title: 'Purchases & Suppliers',
                desc: 'Record purchase orders from wholesale suppliers, track payment status, and automatically increment product inventory upon receiving goods.',
                icon: Truck,
              },
              {
                title: 'Sales Returns & Auditing',
                desc: 'Process returns against original sales bills, enforce remaining return limits, track return reasons, and restore eligible items to stock.',
                icon: RotateCcw,
              },
              {
                title: 'Reports & Analytics',
                desc: 'Real PostgreSQL calculations for daily sales, monthly sales, product sales volume, gross profit, and operational expenses.',
                icon: BarChart3,
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        <p>© BillFlow – Grocery Shop Billing & Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};
