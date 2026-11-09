import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CustomerAPI } from '../services/endpoints';
import { Customer, Invoice, Payment } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  Plus,
  Building,
  User,
  ExternalLink,
} from 'lucide-react';

export const CustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { business } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchCustomerDetails(id);
  }, [id]);

  const fetchCustomerDetails = async (customerId: string) => {
    setLoading(true);
    try {
      const res = await CustomerAPI.getById(customerId);
      const data = res.data?.data;
      setCustomer(data.customer);
      setInvoices(data.invoices || []);
      setPayments(data.payments || []);
    } catch (err) {
      showToast('Customer record not found', 'error');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const currency = business?.currency || '₹';

  if (loading || !customer) {
    return <LoadingSkeleton rows={6} />;
  }

  // Calculate aggregates
  const totalBilled = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + Number(i.grand_total), 0);
  const totalPaid = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + Number(i.paid_amount), 0);
  const totalOutstanding = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + Number(i.balance_due), 0);

  return (
    <div className="space-y-6">
      {/* Back button & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>

        <button
          onClick={() => navigate(`/pos?customerId=${customer.id}`)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition hover:scale-[1.02] self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Bill at POS</span>
        </button>
      </div>

      {/* Customer Info Card & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details (1 col) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 font-extrabold text-base flex items-center justify-center">
              {customer.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{customer.name}</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 mt-1 capitalize">
                {customer.customer_type === 'business' ? (
                  <Building className="w-3 h-3" />
                ) : (
                  <User className="w-3 h-3" />
                )}
                {customer.customer_type}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{customer.email}</span>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2.5 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-2.5 text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{customer.address}</span>
              </div>
            )}
            {customer.tax_number && (
              <div className="pt-2 border-t border-slate-100 text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Tax ID:</span>{' '}
                <span className="font-mono">{customer.tax_number}</span>
              </div>
            )}
            {customer.notes && (
              <div className="pt-2 border-t border-slate-100 text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Internal Notes:</span>
                <p className="mt-1 text-slate-600 italic leading-relaxed">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Lifetime Financial Metrics (2 cols) */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lifetime Billed
            </span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {currency} {totalBilled.toFixed(2)}
            </p>
            <span className="text-[11px] text-slate-400 mt-2">
              Across {invoices.length} invoices
            </span>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Payments Received
            </span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-2">
              {currency} {totalPaid.toFixed(2)}
            </p>
            <span className="text-[11px] text-emerald-700/80 mt-2">
              {payments.length} recorded payments
            </span>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Current Outstanding
            </span>
            <p
              className={`text-2xl font-extrabold mt-2 ${
                totalOutstanding > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              {currency} {totalOutstanding.toFixed(2)}
            </p>
            <span className="text-[11px] text-slate-400 mt-2">
              Remaining balance due
            </span>
          </div>
        </div>
      </div>

      {/* Customer Invoices History */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-600" />
          Sales & Bill History ({invoices.length})
        </h3>

        {invoices.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No bills have been issued to this customer yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="pb-3">Bill #</th>
                  <th className="pb-3">Bill Date</th>
                  <th className="pb-3">Due Date</th>
                  <th className="pb-3 text-right">Grand Total</th>
                  <th className="pb-3 text-right">Paid</th>
                  <th className="pb-3 text-right">Balance</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                      {currency} {Number(inv.grand_total).toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-emerald-600 font-semibold">
                      {currency} {Number(inv.paid_amount).toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                      {currency} {Number(inv.balance_due).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => navigate(`/sales/${inv.id}`)}
                        className="p-1.5 text-slate-500 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Payments History */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          Recorded Payments ({payments.length})
        </h3>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No payments have been recorded for this customer yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="pb-3">Receipt #</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Applied Invoice</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Reference / Txn</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {p.payment_number}
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-mono text-slate-700 dark:text-slate-300">{p.invoice_number}</td>
                    <td className="py-3 capitalize">
                      {p.payment_method.replace('_', ' ')}
                    </td>
                    <td className="py-3 text-slate-400 font-mono">
                      {p.transaction_reference || '—'}
                    </td>
                    <td className="py-3 text-right font-extrabold text-emerald-600">
                      {currency} {Number(p.amount).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
