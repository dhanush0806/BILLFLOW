import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InvoiceAPI, PaymentAPI } from '../services/endpoints';
import { Invoice, Payment } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import {
  ArrowLeft,
  Download,
  Printer,
  CreditCard,
  Ban,
  Send,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Receipt,
  AlertTriangle,
} from 'lucide-react';

export const InvoiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { business } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Record Payment Form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'upi' | 'card' | 'other'>('bank_transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    if (id) fetchInvoice(id);
  }, [id]);

  const fetchInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const [invRes, payRes] = await Promise.all([
        InvoiceAPI.getById(invoiceId),
        PaymentAPI.list({ invoiceId, limit: 50 }),
      ]);
      setInvoice(invRes.data?.data || null);
      setPayments(payRes.data?.data?.payments || []);
      if (invRes.data?.data) {
        setPaymentAmount(Number(invRes.data.data.balance_due));
      }
    } catch (err) {
      showToast('Failed to load bill details', 'error');
      navigate('/sales');
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!invoice) return;
    try {
      await InvoiceAPI.issue(invoice.id);
      showToast('Bill finalized successfully', 'success');
      fetchInvoice(invoice.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to finalize bill', 'error');
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    try {
      await InvoiceAPI.cancel(invoice.id);
      showToast('Bill has been cancelled', 'info');
      setIsCancelConfirmOpen(false);
      fetchInvoice(invoice.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to cancel bill', 'error');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    if (paymentAmount <= 0) {
      showToast('Payment amount must be greater than zero', 'error');
      return;
    }
    if (paymentAmount > Number(invoice.balance_due) + 0.001) {
      showToast(
        `Payment amount cannot exceed remaining balance (${Number(invoice.balance_due).toFixed(2)})`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await PaymentAPI.record({
        invoiceId: invoice.id,
        paymentDate,
        amount: Number(paymentAmount),
        paymentMethod,
        transactionReference: transactionRef || undefined,
        notes: paymentNotes || undefined,
      });
      showToast('Payment recorded successfully!', 'success');
      setIsRecordPaymentOpen(false);
      fetchInvoice(invoice.id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record payment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (invoice) {
      window.open(InvoiceAPI.downloadPdfUrl(invoice.id), '_blank');
    }
  };

  const currency = business?.currency || '₹';

  if (loading || !invoice) {
    return <LoadingSkeleton rows={6} />;
  }

  const customerSnapshot = invoice.customer_snapshot || {};
  const customerName = customerSnapshot.name || invoice.customer_name || 'Walk-in Customer';
  const customerEmail = customerSnapshot.email || invoice.customer_email || '';
  const customerPhone = customerSnapshot.phone || '';
  const customerAddress = customerSnapshot.address || '';
  const customerTax = customerSnapshot.taxNumber || '';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/sales')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sales History</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {invoice.status === 'draft' && (
            <button
              onClick={handleIssue}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Issue Invoice</span>
            </button>
          )}

          {invoice.status !== 'cancelled' &&
            invoice.status !== 'draft' &&
            Number(invoice.balance_due) > 0 && (
              <button
                onClick={() => {
                  setPaymentAmount(Number(invoice.balance_due));
                  setIsRecordPaymentOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}

          <button
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 transition shadow-sm flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 transition shadow-sm flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>

          {invoice.status !== 'cancelled' && Number(invoice.paid_amount) === 0 && (
            <button
              onClick={() => setIsCancelConfirmOpen(true)}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Official Printable Invoice Sheet */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">
              {business?.name}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{business?.address}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Email: {business?.email} {business?.phone ? `| Phone: ${business.phone}` : ''}
            </p>
            {business?.tax_id && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Tax ID / EIN: {business.tax_id}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">RETAIL BILL</h1>
            <p className="text-sm font-mono font-bold text-brand-600 mt-1">
              Bill #{invoice.invoice_number}
            </p>
            <div className="mt-2">
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Customer & Invoice Meta Info Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50/70 border border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Billed To
            </span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{customerName}</h4>
            {customerEmail && <p className="text-xs text-slate-600">{customerEmail}</p>}
            {customerPhone && <p className="text-xs text-slate-500 dark:text-slate-400">{customerPhone}</p>}
            {customerAddress && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{customerAddress}</p>
            )}
            {customerTax && (
              <p className="text-xs text-slate-400 font-mono mt-1">Tax: {customerTax}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:text-right text-xs">
            <div className="flex sm:justify-end gap-3">
              <span className="text-slate-400 font-semibold">Invoice Date:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {new Date(invoice.invoice_date).toLocaleDateString()}
              </span>
            </div>
            {invoice.payment_method && (
              <div className="flex sm:justify-end gap-3">
                <span className="text-slate-400 font-semibold">Payment Mode:</span>
                <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {invoice.payment_method}
                </span>
              </div>
            )}
            {invoice.cashier_name && (
              <div className="flex sm:justify-end gap-3">
                <span className="text-slate-400 font-semibold">Cashier:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {invoice.cashier_name}
                </span>
              </div>
            )}
            <div className="flex sm:justify-end gap-3">
              <span className="text-slate-400 font-semibold">Payment Due:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {new Date(invoice.due_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold uppercase text-[10px] rounded-xl">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Item & Description</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Unit Price</th>
                <th className="py-3 px-3 text-right">Tax %</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {invoice.items?.map((item, index) => (
                <tr key={index}>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                    {item.description && (
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right font-semibold text-slate-600">
                    {item.quantity}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {currency} {Number(item.unit_price).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-slate-500">
                    {Number(item.tax_rate || 0)}%
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-white">
                    {currency} {Number(item.line_total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-slate-100 text-xs">
          {/* Notes / Instructions */}
          <div className="max-w-md space-y-3">
            {invoice.payment_instructions && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider block mb-1">
                  Payment Instructions
                </span>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {invoice.payment_instructions}
                </p>
              </div>
            )}
            {invoice.notes && (
              <p className="text-slate-500 italic leading-relaxed">
                <strong className="text-slate-700 dark:text-slate-300 not-italic">Notes:</strong> {invoice.notes}
              </p>
            )}
          </div>

          {/* Numbers Box */}
          <div className="w-full sm:w-72 space-y-2 text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {currency} {Number(invoice.subtotal).toFixed(2)}
              </span>
            </div>

            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span>-{currency} {Number(invoice.discount_amount).toFixed(2)}</span>
              </div>
            )}

            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between">
                <span>Tax ({invoice.tax_rate}%):</span>
                <span>+{currency} {Number(invoice.tax_amount).toFixed(2)}</span>
              </div>
            )}

            {Number(invoice.other_charges) > 0 && (
              <div className="flex justify-between">
                <span>Other Charges:</span>
                <span>+{currency} {Number(invoice.other_charges).toFixed(2)}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-slate-900 dark:text-white text-sm">
              <span>Grand Total:</span>
              <span className="text-base text-brand-600">
                {currency} {Number(invoice.grand_total).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Paid to Date:</span>
              <span>{currency} {Number(invoice.paid_amount).toFixed(2)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm">
              <span className="text-slate-800">Balance Due:</span>
              <span className="text-amber-600 font-extrabold">
                {currency} {Number(invoice.balance_due).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Payments Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-emerald-600" />
          Recorded Payments for this Invoice ({payments.length})
        </h3>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No payments have been recorded for this invoice yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="pb-3">Receipt #</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Reference / Txn</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Receipt PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {p.payment_number}
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
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
                    <td className="py-3 text-right">
                      <button
                        onClick={() => window.open(PaymentAPI.downloadReceiptPdfUrl(p.id), '_blank')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        title="Record Payment"
        description={`Record offline or online payment received for Invoice #${invoice.invoice_number}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex justify-between">
            <span className="text-slate-600">Remaining Balance:</span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {currency} {Number(invoice.balance_due).toFixed(2)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Amount ({currency}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={Number(invoice.balance_due)}
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 capitalize"
              >
                <option value="bank_transfer">Bank Transfer / ACH / Wire</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI / Instant Transfer</option>
                <option value="card">Card (Debit/Credit)</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transaction Reference / Cheque # (Optional)
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. ACH-992144 or UPI Ref ID"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Internal notes regarding this payment"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-800">
            Note: BillFlow is a billing recording system. Recording this payment updates the customer balance and generates a receipt.
          </p>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Confirm & Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirm */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleCancelInvoice}
        title="Cancel Invoice"
        message={`Are you sure you want to void Invoice #${invoice.invoice_number}? This action cannot be undone.`}
        confirmText="Void & Cancel Invoice"
        isDestructive
      />
    </div>
  );
};
