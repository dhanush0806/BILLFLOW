import React, { useState, useEffect } from 'react';
import { ReportAPI } from '../services/endpoints';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Package,
  FolderTree,
  DollarSign,
  Users,
  Building,
  Truck,
  Undo2,
  Printer,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ReportsPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'daily' | 'products' | 'categories' | 'top_selling' | 'profit' | 'customers' | 'suppliers' | 'purchases' | 'returns'
  >('daily');
  const [loading, setLoading] = useState(true);

  // Report datasets
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<any[]>([]);
  const [categorySales, setCategorySales] = useState<any[]>([]);
  const [topSelling, setTopSelling] = useState<any[]>([]);
  const [grossProfit, setGrossProfit] = useState<any>(null);
  const [customerBalances, setCustomerBalances] = useState<any[]>([]);
  const [supplierBalances, setSupplierBalances] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [activeTab]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'daily') {
        const res = await ReportAPI.getDailySales(30);
        setDailySales(res.data?.data || []);
      } else if (activeTab === 'products') {
        const res = await ReportAPI.getProductSales();
        setProductSales(res.data?.data || []);
      } else if (activeTab === 'categories') {
        const res = await ReportAPI.getCategorySales();
        setCategorySales(res.data?.data || []);
      } else if (activeTab === 'top_selling') {
        const res = await ReportAPI.getTopSelling(15);
        setTopSelling(res.data?.data || []);
      } else if (activeTab === 'profit') {
        const res = await ReportAPI.getGrossProfit();
        setGrossProfit(res.data?.data || null);
      } else if (activeTab === 'customers') {
        const res = await ReportAPI.getCustomerBalances();
        setCustomerBalances(res.data?.data || []);
      } else if (activeTab === 'suppliers') {
        const res = await ReportAPI.getSupplierBalances();
        setSupplierBalances(res.data?.data || []);
      } else if (activeTab === 'purchases') {
        const res = await ReportAPI.getPurchases();
        setPurchases(res.data?.data || []);
      } else if (activeTab === 'returns') {
        const res = await ReportAPI.getReturns();
        setReturns(res.data?.data || []);
      }
    } catch (err) {
      showToast('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const currency = business?.currency || '₹';

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Reports & Retail Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time PostgreSQL analytical reports on store sales, product margins, vendor payables, and customer ledgers
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Print Report</span>
        </button>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto no-scrollbar">
        {[
          { id: 'daily', label: 'Daily Sales', icon: Calendar },
          { id: 'profit', label: 'Gross Profit & Margin', icon: TrendingUp },
          { id: 'top_selling', label: 'Top-Selling Products', icon: Award },
          { id: 'products', label: 'Product-wise Sales', icon: Package },
          { id: 'categories', label: 'Category-wise Sales', icon: FolderTree },
          { id: 'customers', label: 'Customer Balances', icon: Users },
          { id: 'suppliers', label: 'Supplier Payables', icon: Building },
          { id: 'purchases', label: 'Purchases Summary', icon: Truck },
          { id: 'returns', label: 'Sales Returns', icon: Undo2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-3 transition whitespace-nowrap border-b-2 flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading PostgreSQL report records...</div>
      ) : (
        <>
          {/* TAB 1: Daily Sales Report */}
          {activeTab === 'daily' && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  Daily Sales Volume (Last 30 Days)
                </h3>
                <p className="text-xs text-slate-500 mb-4">Total billing collection per day</p>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...dailySales].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="date_label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(val: any) => [`${currency} ${Number(val).toLocaleString()}`]} />
                      <Bar dataKey="total_sales" name="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Daily Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5 text-center">Bills Count</th>
                      <th className="px-5 py-3.5 text-right">Subtotal</th>
                      <th className="px-5 py-3.5 text-right">Tax Collected</th>
                      <th className="px-5 py-3.5 text-right">Discounts</th>
                      <th className="px-5 py-3.5 text-right">Total Net Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {dailySales.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3 font-bold">{d.date_label}</td>
                        <td className="px-5 py-3 text-center">{d.total_bills}</td>
                        <td className="px-5 py-3 text-right">{currency} {Number(d.subtotal).toFixed(2)}</td>
                        <td className="px-5 py-3 text-right text-slate-500">{currency} {Number(d.total_tax).toFixed(2)}</td>
                        <td className="px-5 py-3 text-right text-emerald-600">- {currency} {Number(d.total_discount).toFixed(2)}</td>
                        <td className="px-5 py-3 text-right font-extrabold text-slate-900 dark:text-white">
                          {currency} {Number(d.total_sales).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Gross Profit Overview */}
          {activeTab === 'profit' && grossProfit && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                    {currency} {Number(grossProfit.total_revenue || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Total sales revenue collected</p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Cost of Goods (COGS)
                  </p>
                  <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                    {currency} {Number(grossProfit.total_cogs || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Wholesale purchase costs</p>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Gross Profit
                  </p>
                  <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {currency} {Number(grossProfit.gross_profit || 0).toLocaleString()}
                  </p>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    Gross Margin: {grossProfit.gross_profit_margin_pct}%
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 shadow-sm">
                  <p className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                    Net Profit (After Expenses)
                  </p>
                  <p className="text-2xl font-extrabold text-teal-700 dark:text-teal-300 mt-1">
                    {currency} {Number(grossProfit.net_profit ?? grossProfit.gross_profit).toLocaleString()}
                  </p>
                  <p className="text-xs font-semibold text-teal-700/80 dark:text-teal-400 mt-1">
                    Expenses: {currency} {Number(grossProfit.total_expenses || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Top-Selling Products */}
          {activeTab === 'top_selling' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Rank</th>
                    <th className="px-5 py-3.5">Product Name</th>
                    <th className="px-5 py-3.5">SKU</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5 text-right">Units Sold</th>
                    <th className="px-5 py-3.5 text-right">Total Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {topSelling.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-extrabold text-brand-600">#{idx + 1}</td>
                      <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{p.product_name}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">{p.sku || '—'}</td>
                      <td className="px-5 py-3 text-slate-600">{p.category}</td>
                      <td className="px-5 py-3 text-right font-extrabold text-slate-900 dark:text-white">
                        {p.units_sold} units
                      </td>
                      <td className="px-5 py-3 text-right font-extrabold text-emerald-600">
                        {currency} {Number(p.revenue).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: Product-wise Sales Report */}
          {activeTab === 'products' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5 text-right">Units Sold</th>
                    <th className="px-5 py-3.5 text-right">Revenue</th>
                    <th className="px-5 py-3.5 text-right">Cost (COGS)</th>
                    <th className="px-5 py-3.5 text-right">Gross Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {productSales.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{p.product_name}</td>
                      <td className="px-5 py-3 text-slate-600">{p.category}</td>
                      <td className="px-5 py-3 text-right">{p.units_sold}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {currency} {Number(p.total_sales).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {currency} {Number(p.total_cogs).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-600">
                        {currency} {Number(p.gross_profit).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: Category-wise Sales */}
          {activeTab === 'categories' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5 text-center">Bills Count</th>
                    <th className="px-5 py-3.5 text-right">Units Sold</th>
                    <th className="px-5 py-3.5 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {categorySales.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{c.category_name}</td>
                      <td className="px-5 py-3 text-center">{c.bills_count}</td>
                      <td className="px-5 py-3 text-right">{c.units_sold}</td>
                      <td className="px-5 py-3 text-right font-extrabold text-emerald-600">
                        {currency} {Number(c.total_sales).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: Customer Balances */}
          {activeTab === 'customers' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Customer Name</th>
                    <th className="px-5 py-3.5">Phone</th>
                    <th className="px-5 py-3.5 text-center">Total Bills</th>
                    <th className="px-5 py-3.5 text-right">Total Spent</th>
                    <th className="px-5 py-3.5 text-right">Credit Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {customerBalances.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{cust.name}</td>
                      <td className="px-5 py-3 text-slate-500">{cust.phone || '—'}</td>
                      <td className="px-5 py-3 text-center">{cust.total_bills}</td>
                      <td className="px-5 py-3 text-right">{currency} {Number(cust.total_spent).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-extrabold text-rose-600">
                        {currency} {Number(cust.outstanding_balance).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 7: Supplier Balances */}
          {activeTab === 'suppliers' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Supplier</th>
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5 text-center">Total POs</th>
                    <th className="px-5 py-3.5 text-right">Total Purchased</th>
                    <th className="px-5 py-3.5 text-right">Payable Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {supplierBalances.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{sup.name}</td>
                      <td className="px-5 py-3 text-slate-500">{sup.company_name || '—'}</td>
                      <td className="px-5 py-3 text-center">{sup.total_purchases}</td>
                      <td className="px-5 py-3 text-right">{currency} {Number(sup.total_purchased).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-extrabold text-rose-600">
                        {currency} {Number(sup.outstanding_balance).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 8: Purchases Summary */}
          {activeTab === 'purchases' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">PO Number</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Supplier</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                    <th className="px-5 py-3.5 text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {purchases.map((pur, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-bold text-brand-600">{pur.purchase_number}</td>
                      <td className="px-5 py-3 text-slate-500">{new Date(pur.purchase_date).toLocaleDateString()}</td>
                      <td className="px-5 py-3">{pur.supplier_name}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {currency} {Number(pur.total_amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-center uppercase font-bold text-[10px] text-slate-500">
                        {pur.payment_status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 9: Sales Returns */}
          {activeTab === 'returns' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Return #</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Bill #</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5 text-right">Refund Amount</th>
                    <th className="px-5 py-3.5">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {returns.map((ret, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">{ret.return_number}</td>
                      <td className="px-5 py-3 text-slate-500">{new Date(ret.return_date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 font-bold text-brand-600">{ret.invoice_number}</td>
                      <td className="px-5 py-3">{ret.customer_name}</td>
                      <td className="px-5 py-3 text-right font-bold text-rose-600">
                        - {currency} {Number(ret.total_refund_amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{ret.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
