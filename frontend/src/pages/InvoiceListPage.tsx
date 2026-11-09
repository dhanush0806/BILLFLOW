import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InvoiceAPI } from '../services/endpoints';
import { Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Calendar,
  CreditCard,
} from 'lucide-react';

export const InvoiceListPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 10;

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, startDate, endDate, offset]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await InvoiceAPI.list({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit,
        offset,
      });
      setInvoices(res.data?.data?.invoices || []);
      setTotal(res.data?.data?.total || 0);
    } catch (err) {
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    window.open(InvoiceAPI.downloadPdfUrl(id), '_blank');
  };

  const currency = business?.currency || 'USD';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Invoices & Bills</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate, monitor, and export customer invoices with real-time balance tracking.
          </p>
        </div>
        <button
          onClick={() => navigate('/invoices/create')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice # or customer name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="issued">Issued / Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setOffset(0);
            }}
            title="Start date"
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setOffset(0);
            }}
            title="End date"
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Invoice Table */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Invoices Found"
          description={
            search || statusFilter !== 'all'
              ? 'No invoices match your selected filters.'
              : 'Create your first invoice to bill customers and collect payments.'
          }
          actionText="Create Invoice"
          onAction={() => navigate('/invoices/create')}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-6">Invoice #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Invoice Date</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-right">Balance Due</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="hover:bg-slate-50/70 cursor-pointer transition"
                  >
                    <td className="py-4 px-6 font-mono font-extrabold text-slate-900 dark:text-white">
                      {inv.invoice_number}
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{inv.customer_name}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {inv.customer_email}
                      </p>
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-4 text-right font-extrabold text-slate-900 dark:text-white">
                      {currency} {Number(inv.grand_total).toFixed(2)}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <span
                        className={`font-bold ${
                          Number(inv.balance_due) > 0 ? 'text-amber-600' : 'text-slate-400'
                        }`}
                      >
                        {currency} {Number(inv.balance_due).toFixed(2)}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge status={inv.status} />
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          title="View Invoice"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDownloadPdf(e, inv.id)}
                          title="Download PDF"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            total={total}
            limit={limit}
            offset={offset}
            onPageChange={setOffset}
          />
        </div>
      )}
    </div>
  );
};
