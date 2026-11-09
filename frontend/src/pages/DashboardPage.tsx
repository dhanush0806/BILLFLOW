import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReportAPI } from '../services/endpoints';
import {
  ShoppingCart,
  Receipt,
  TrendingUp,
  Package,
  AlertTriangle,
  CreditCard,
  Banknote,
  QrCode,
  Truck,
  Undo2,
  Plus,
  ArrowRight,
  Boxes,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { business, user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await ReportAPI.getDashboard({ range: '30d' });
      setData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load retail dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const currency = business?.currency || '₹';

  const today = data?.today || { today_sales: 0, today_bills: 0, today_collected: 0 };
  const month = data?.month || { monthly_sales: 0, monthly_bills: 0 };
  const products = data?.products || { total_products: 0, low_stock: 0, out_of_stock: 0 };
  const monthlyTrend = data?.monthlyTrend || [];
  const paymentMethods = data?.paymentMethods || [];
  const recentInvoices = data?.recentInvoices || [];
  const recentPurchases = data?.recentPurchases || [];
  const recentReturns = data?.recentReturns || [];

  return (
    <div className="space-y-6">
      {/* Top Banner with POS Quick Action */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-xl shadow-emerald-900/10 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider mb-2">
            <span>BillFlow Retail Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {business?.name || 'Retail Store Terminal'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
            Welcome back, {user?.fullName}! POS billing terminals and live inventory counters are active.
          </p>
        </div>

        {/* Big POS Terminal Button */}
        <Link
          to="/pos"
          className="relative z-10 px-6 py-3.5 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold text-sm shadow-xl hover:scale-105 transition flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5 text-emerald-600" />
          <span>Launch POS Billing Terminal</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      {/* 5 Core Retail KPI Cards */}
      {/* 6 Core Grocery Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Today's Sales */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Today's Sales
          </p>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {currency} {Number(today.today_sales || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Total collected</p>
        </div>

        {/* 2. Today's Bills */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Today's Bills
          </p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {today.today_bills || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Bills processed</p>
        </div>

        {/* 3. Total Products */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Products
          </p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {products.total_products || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Grocery items</p>
        </div>

        {/* 4. Low Stock Products */}
        <Link
          to="/inventory"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-400 transition"
        >
          <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Low Stock</span>
          </p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">
            {products.low_stock || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Below alert level</p>
        </Link>

        {/* 5. Out of Stock Products */}
        <Link
          to="/inventory"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-rose-400 transition"
        >
          <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">
            Out of Stock
          </p>
          <p className="text-xl font-extrabold text-rose-600 mt-1">
            {products.out_of_stock || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">0 units available</p>
        </Link>

        {/* 6. Today's Expenses */}
        <Link
          to="/expenses"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 transition"
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Today's Expenses
          </p>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {currency} {Number(today.today_expenses || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Store outgoings</p>
        </Link>
      </div>

      {/* Middle Row: Revenue Trend Chart & Payment Methods Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Revenue Trend
              </h2>
              <p className="text-xs text-slate-500">Sales vs store expenses (Last 6 Months)</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Real PostgreSQL Data</span>
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis dataKey="month_label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${currency} ${Number(val).toLocaleString()}`]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Sales Revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#expenseGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Summary */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Payment Channels
            </h2>
            <p className="text-xs text-slate-500 mb-4">Total collection breakdown</p>

            <div className="space-y-3">
              {paymentMethods.map((pm: any) => {
                const isCash = pm.payment_method === 'cash';
                const isUpi = pm.payment_method === 'upi';
                const isCard = pm.payment_method === 'card';

                return (
                  <div
                    key={pm.payment_method}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                        {isCash ? (
                          <Banknote className="w-4 h-4 text-emerald-600" />
                        ) : isUpi ? (
                          <QrCode className="w-4 h-4 text-brand-600" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase">{pm.payment_method}</p>
                        <p className="text-[11px] text-slate-400">{pm.count} transactions</p>
                      </div>
                    </div>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {currency} {Number(pm.total).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4">
            <Link
              to="/payments"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center justify-between"
            >
              <span>View all payment records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Row: 3 Recent Tables (Recent Bills, Recent Purchases, Recent Returns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bills */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-brand-600" />
                <span>Recent Bills</span>
              </h3>
              <Link to="/sales" className="text-xs font-semibold text-brand-600 hover:underline">
                View all
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {recentInvoices.map((inv: any) => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{inv.invoice_number}</p>
                    <p className="text-[11px] text-slate-400">{inv.customer_name || 'Walk-in'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{currency} {Number(inv.grand_total).toFixed(2)}</p>
                    <span className="text-[10px] uppercase font-bold text-emerald-600">
                      {inv.payment_method || 'cash'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Recent Purchases</span>
              </h3>
              <Link to="/purchases" className="text-xs font-semibold text-brand-600 hover:underline">
                View all
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {recentPurchases.map((p: any) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{p.purchase_number}</p>
                    <p className="text-[11px] text-slate-400">{p.supplier_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{currency} {Number(p.total_amount).toFixed(2)}</p>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      {p.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Returns */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Undo2 className="w-4 h-4 text-rose-600" />
                <span>Recent Returns</span>
              </h3>
              <Link to="/returns" className="text-xs font-semibold text-brand-600 hover:underline">
                View all
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {recentReturns.length === 0 ? (
                <p className="py-4 text-center text-slate-400">No returns recorded</p>
              ) : (
                recentReturns.map((r: any) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{r.return_number}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[130px]">{r.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-600">
                        - {currency} {Number(r.total_refund_amount).toFixed(2)}
                      </p>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {r.refund_method}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
