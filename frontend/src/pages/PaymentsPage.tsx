import React, { useState, useEffect } from 'react';
import { PaymentAPI, InvoiceAPI } from '../services/endpoints';
import { Payment, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  Download,
  RotateCcw,
  CheckCircle,
  Calendar,
} from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [methodFilter, setMethodFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // Record Payment Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    invoiceId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'bank_transfer' as any,
    transactionReference: '',
    notes: '',
  });

  useEffect(() => {
    fetchPayments();
  }, [methodFilter, startDate, endDate, offset]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await PaymentAPI.list({
        paymentMethod: methodFilter !== 'all' ? methodFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit,
        offset,
      });
      setPayments(res.data?.data?.payments || []);
      setTotal(res.data?.data?.total || 0);
    } catch (err) {
      showToast('Failed to load payment records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRecord = async () => {
    try {
      const res = await InvoiceAPI.list({ limit: 100 });
      const unpaids = (res.data?.data?.invoices || []).filter(
        (i: Invoice) => i.status === 'issued' || i.status === 'partially_paid' || i.status === 'overdue'
      );
      setUnpaidInvoices(unpaids);

      setFormData({
        invoiceId: unpaids[0]?.id || '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: unpaids[0] ? Number(unpaids[0].balance_due) : 0,
        paymentMethod: 'bank_transfer',
        transactionReference: '',
        notes: '',
      });
      setIsRecordModalOpen(true);
    } catch (err) {
      showToast('Could not load unpaid invoices', 'error');
    }
  };

  const handleInvoiceSelect = (invId: string) => {
    const inv = unpaidInvoices.find((i) => i.id === invId);
    setFormData((prev) => ({
      ...prev,
      invoiceId: invId,
      amount: inv ? Number(inv.balance_due) : 0,
    }));
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceId) {
      showToast('Please select an invoice', 'error');
      return;
    }
    if (formData.amount <= 0) {
      showToast('Payment amount must be greater than zero', 'error');
      return;
    }

    try {
      await PaymentAPI.record({
        invoiceId: formData.invoiceId,
        paymentDate: formData.paymentDate,
        amount: Number(formData.amount),
        paymentMethod: formData.paymentMethod,
        transactionReference: formData.transactionReference || undefined,
        notes: formData.notes || undefined,
      });
      showToast('Payment recorded successfully', 'success');
      setIsRecordModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record payment', 'error');
    }
  };

  const handleReverseConfirm = async () => {
    if (!reversingPaymentId) return;
    try {
      await PaymentAPI.reverse(reversingPaymentId);
      showToast('Payment has been reversed. Invoice balance restored.', 'info');
      setReversingPaymentId(null);
      fetchPayments();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reverse payment', 'error');
    }
  };

  const currency = business?.currency || '₹';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Payment Records & Receipts</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log external customer remittances (bank transfer, cash, UPI, cards) and issue receipts.
          </p>
        </div>
        <button
          onClick={handleOpenRecord}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Payment</span>
        </button>
      </div>

      {/* Filter and Date Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setOffset(0);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500 capitalize"
          >
            <option value="all">All Payment Methods</option>
            <option value="bank_transfer">Bank Transfer / ACH</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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

      {/* Payments Table */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No Payment Records Found"
          description="Log customer payments against issued invoices to track cash collections."
          actionText="Record Payment"
          onAction={handleOpenRecord}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-6">Receipt #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Applied Invoice</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Ref / Txn ID</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900 dark:text-white">
                      {p.payment_number}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                      {p.customer_name}
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-600">
                      {p.invoice_number}
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-4 capitalize">
                      {p.payment_method.replace('_', ' ')}
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-400">
                      {p.transaction_reference || '—'}
                    </td>

                    <td className="py-4 px-4 text-right font-extrabold text-emerald-600">
                      {currency} {Number(p.amount).toFixed(2)}
                    </td>

                    <td className="py-4 px-4">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => window.open(PaymentAPI.downloadReceiptPdfUrl(p.id), '_blank')}
                          title="Download Receipt PDF"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {p.status === 'recorded' && (
                          <button
                            onClick={() => setReversingPaymentId(p.id)}
                            title="Reverse Payment"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
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

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Payment"
        description="Select an unpaid invoice and record received amount."
      >
        <form onSubmit={handleSavePayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Unpaid Invoice <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.invoiceId}
              onChange={(e) => handleInvoiceSelect(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
            >
              {unpaidInvoices.length === 0 ? (
                <option value="">No unpaid invoices found</option>
              ) : (
                unpaidInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} – {inv.customer_name} (Balance: {currency} {Number(inv.balance_due).toFixed(2)})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Amount ({currency}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 capitalize"
              >
                <option value="bank_transfer">Bank Transfer / Wire</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reference / Transaction #
              </label>
              <input
                type="text"
                placeholder="e.g. UTR / Ref Number"
                value={formData.transactionReference}
                onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Internal record notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
            >
              Record Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Reverse Payment Confirm Dialog */}
      <ConfirmDialog
        isOpen={reversingPaymentId !== null}
        onClose={() => setReversingPaymentId(null)}
        onConfirm={handleReverseConfirm}
        title="Reverse Payment"
        message="Are you sure you want to reverse this payment? The linked invoice balance will be automatically restored, and the payment marked as reversed."
        confirmText="Confirm Reversal"
        isDestructive
      />
    </div>
  );
};
