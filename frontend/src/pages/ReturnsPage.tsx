import React, { useState, useEffect } from 'react';
import { ReturnAPI, InvoiceAPI } from '../services/endpoints';
import { SalesReturn, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Undo2,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

interface ReturnCartRow {
  invoiceItemId: string;
  productId: string;
  productName: string;
  originalQty: number;
  returnedQty: number;
  remainingQty: number;
  returnQty: number;
  unitPrice: number;
  isResalable: boolean;
  reason: string;
}

export const ReturnsPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Process Return Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [billSearchInput, setBillSearchInput] = useState('');
  const [originalBill, setOriginalBill] = useState<Invoice | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnCartRow[]>([]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalReason, setGeneralReason] = useState('Customer exchange / return');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'upi' | 'card' | 'store_credit' | 'other'>('cash');
  const [returnNotes, setReturnNotes] = useState('');
  const [isSearchingBill, setIsSearchingBill] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Return Details Modal
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    setIsLoading(true);
    try {
      const res = await ReturnAPI.list({ limit: 100 });
      setReturns(res.data?.data?.returns || []);
    } catch (err: any) {
      showToast('Error loading returns', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookupBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = billSearchInput.trim();
    if (!queryStr) return;

    setIsSearchingBill(true);
    try {
      // Find invoice by number
      const listRes = await InvoiceAPI.list({ search: queryStr, limit: 5 });
      const found = listRes.data?.data?.invoices?.find(
        (i: Invoice) => i.invoice_number.toLowerCase() === queryStr.toLowerCase()
      );

      if (!found) {
        showToast(`Bill "${queryStr}" not found. Verify the bill number.`, 'error');
        setIsSearchingBill(false);
        return;
      }

      // Fetch eligibility with already returned quantities
      const eligRes = await ReturnAPI.getEligibility(found.id);
      const { invoice, items } = eligRes.data.data;

      setOriginalBill(invoice);

      const rows: ReturnCartRow[] = items.map((item: any) => ({
        invoiceItemId: item.id,
        productId: item.product_id,
        productName: item.name,
        originalQty: Number(item.quantity),
        returnedQty: Number(item.total_returned_quantity || 0),
        remainingQty: Number(item.remaining_returnable_quantity || item.quantity),
        returnQty: 0,
        unitPrice: Number(item.unit_price),
        isResalable: true,
        reason: 'Customer return',
      }));

      setReturnItems(rows);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error looking up bill', 'error');
    } finally {
      setIsSearchingBill(false);
    }
  };

  const updateReturnRowQty = (idx: number, qty: number) => {
    setReturnItems((prev) =>
      prev.map((item, i) => {
        if (i === idx) {
          const clamped = Math.max(0, Math.min(item.remainingQty, qty));
          return { ...item, returnQty: clamped };
        }
        return item;
      })
    );
  };

  const updateReturnRowResalable = (idx: number, isResalable: boolean) => {
    setReturnItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, isResalable } : item))
    );
  };

  const totalRefundAmount = returnItems.reduce(
    (sum, item) => sum + item.returnQty * item.unitPrice,
    0
  );

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalBill) return;

    const itemsToReturn = returnItems
      .filter((i) => i.returnQty > 0)
      .map((i) => ({
        invoiceItemId: i.invoiceItemId,
        productId: i.productId,
        productName: i.productName,
        quantity: i.returnQty,
        unitPrice: i.unitPrice,
        refundAmount: i.returnQty * i.unitPrice,
        isResalable: i.isResalable,
        reason: i.reason || generalReason,
      }));

    if (itemsToReturn.length === 0) {
      showToast('Select at least one product quantity to return', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await ReturnAPI.create({
        invoiceId: originalBill.id,
        returnDate,
        reason: generalReason.trim(),
        refundMethod,
        notes: returnNotes.trim() || undefined,
        items: itemsToReturn,
      });

      showToast('Sales return recorded and refund issued successfully!', 'success');
      setIsModalOpen(false);
      setOriginalBill(null);
      setReturnItems([]);
      setBillSearchInput('');
      loadReturns();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record return', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReturn = async (id: string) => {
    try {
      const res = await ReturnAPI.getById(id);
      setSelectedReturn(res.data.data);
    } catch (err) {
      showToast('Error loading return details', 'error');
    }
  };

  const currency = business?.currency || '₹';

  const filteredReturns = returns.filter(
    (r) =>
      r.return_number.toLowerCase().includes(search.toLowerCase()) ||
      (r.invoice_number && r.invoice_number.toLowerCase().includes(search.toLowerCase())) ||
      (r.customer_name && r.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (r.reason && r.reason.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Undo2 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Sales Returns & Refund Records</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Accept product returns against original bills, issue refunds, and restore resalable items to inventory
          </p>
        </div>

        <button
          onClick={() => {
            setOriginalBill(null);
            setReturnItems([]);
            setBillSearchInput('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition hover:scale-[1.02]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Process Return</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Return #, Bill # or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Total: {filteredReturns.length} Return Records
        </span>
      </div>

      {/* Returns Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading returns history...</div>
        ) : filteredReturns.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Undo2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm">No return records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Return #</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Original Bill #</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5 text-right">Refund Amount</th>
                  <th className="px-5 py-3.5 text-center">Refund Method</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {r.return_number}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(r.return_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-brand-600 dark:text-brand-400">
                      {r.invoice_number}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                      {r.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-rose-600 dark:text-rose-400">
                      {currency} {Number(r.total_refund_amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {r.refund_method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{r.reason}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleViewReturn(r.id)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PROCESS RETURN MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Process Sales Return & Refund"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Bill search form */}
          {!originalBill ? (
            <form onSubmit={handleLookupBill} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enter Original Bill Number *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. BILL-1001"
                    value={billSearchInput}
                    onChange={(e) => setBillSearchInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingBill}
                    className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs"
                  >
                    {isSearchingBill ? 'Searching...' : 'Find Bill'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitReturn} className="space-y-4">
              {/* Bill Details Summary Card */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Bill: {originalBill.invoice_number}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Customer: {originalBill.customer_name || 'Walk-in'} | Date:{' '}
                    {new Date(originalBill.invoice_date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOriginalBill(null)}
                  className="text-xs text-brand-600 hover:underline font-semibold"
                >
                  Change Bill
                </button>
              </div>

              {/* Items Table with return quantity selector */}
              <div>
                <p className="font-bold text-xs text-slate-700 dark:text-slate-300 mb-2">
                  Select Quantities to Return:
                </p>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-center">Billed Qty</th>
                        <th className="p-2.5 text-center">Already Returned</th>
                        <th className="p-2.5 text-center">Eligible Remaining</th>
                        <th className="p-2.5 w-24">Return Qty</th>
                        <th className="p-2.5 text-center">Condition</th>
                        <th className="p-2.5 text-right">Refund</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {returnItems.map((item, idx) => {
                        const isEligible = item.remainingQty > 0;
                        return (
                          <tr key={idx} className={!isEligible ? 'opacity-50 bg-slate-50/50' : ''}>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                              {item.productName}
                            </td>
                            <td className="p-2.5 text-center text-slate-500">{item.originalQty}</td>
                            <td className="p-2.5 text-center text-slate-500">{item.returnedQty}</td>
                            <td className="p-2.5 text-center font-bold text-emerald-600">
                              {item.remainingQty}
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                max={item.remainingQty}
                                disabled={!isEligible}
                                value={item.returnQty}
                                onChange={(e) => updateReturnRowQty(idx, parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 rounded border text-xs font-bold text-center"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.isResalable}
                                  onChange={(e) => updateReturnRowResalable(idx, e.target.checked)}
                                  className="rounded text-brand-600"
                                />
                                <span className="text-[10px]">Resalable</span>
                              </label>
                            </td>
                            <td className="p-2.5 text-right font-extrabold text-slate-900 dark:text-white">
                              {currency} {(item.returnQty * item.unitPrice).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Return settings: Reason, Refund Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Return Reason *
                  </label>
                  <select
                    value={generalReason}
                    onChange={(e) => setGeneralReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="Customer changed mind">Customer changed mind</option>
                    <option value="Defective / Damaged packaging">Defective / Damaged packaging</option>
                    <option value="Expired product">Expired product</option>
                    <option value="Wrong flavor / size selected">Wrong flavor / size selected</option>
                    <option value="Other reason">Other reason</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Refund Method *
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold uppercase"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card Reversal</option>
                    <option value="store_credit">Store Credit</option>
                  </select>
                </div>
              </div>

              {/* Total Refund Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                  Total Refund Payable to Customer:
                </span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {currency} {totalRefundAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || totalRefundAmount <= 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Return & Issue Refund'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* VIEW RETURN DETAILS MODAL */}
      <Modal
        isOpen={Boolean(selectedReturn)}
        onClose={() => setSelectedReturn(null)}
        title={`Return Details: ${selectedReturn?.return_number}`}
      >
        {selectedReturn && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border">
              <div>
                <p className="text-slate-400">Original Bill:</p>
                <p className="font-bold text-brand-600">{selectedReturn.invoice_number}</p>
                <p className="text-slate-500">Customer: {selectedReturn.customer_name || 'Walk-in'}</p>
              </div>
              <div>
                <p className="text-slate-400">Return Date:</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {new Date(selectedReturn.return_date).toLocaleDateString()}
                </p>
                <p className="text-slate-500">Refund Method: <b className="uppercase">{selectedReturn.refund_method}</b></p>
              </div>
            </div>

            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">Returned Items:</p>
              <div className="border rounded-xl divide-y overflow-hidden">
                {selectedReturn.items?.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{item.product_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.quantity} units × {currency} {Number(item.unit_price).toFixed(2)} |{' '}
                        {item.is_resalable ? 'Restored to Stock' : 'Non-resalable / Damaged'}
                      </p>
                    </div>
                    <span className="font-bold text-rose-600">
                      - {currency} {Number(item.refund_amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border flex justify-between items-center font-bold">
              <span>Total Refunded:</span>
              <span className="text-sm font-extrabold text-rose-600">
                {currency} {Number(selectedReturn.total_refund_amount).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
