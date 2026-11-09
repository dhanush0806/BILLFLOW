import React, { useState, useEffect } from 'react';
import { InvoiceAPI } from '../services/endpoints';
import { Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Receipt,
  Search,
  Eye,
  FileDown,
  Printer,
  Calendar,
  CreditCard,
  User,
  Filter,
  X,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const SalesPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadSales();
  }, [statusFilter, startDate, endDate]);

  const loadSales = async () => {
    setIsLoading(true);
    try {
      const res = await InvoiceAPI.list({
        status: statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 200,
      });
      setInvoices(res.data?.data?.invoices || []);
    } catch (err: any) {
      showToast('Error loading sales history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewBill = async (id: string) => {
    try {
      const res = await InvoiceAPI.getById(id);
      setSelectedInvoice(res.data.data);
    } catch (err) {
      showToast('Error loading bill details', 'error');
    }
  };

  const handlePrint = (inv: Invoice) => {
    handleViewBill(inv.id).then(() => {
      setTimeout(() => {
        window.print();
      }, 300);
    });
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const currency = business?.currency || '₹';

  const filteredInvoices = invoices.filter(
    (i) =>
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (i.customer_name && i.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (i.payment_method && i.payment_method.toLowerCase().includes(search.toLowerCase())) ||
      (i.customer_phone && i.customer_phone.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Sales & Invoices</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            View all grocery bills, filter by date, inspect original line items, download PDFs, and print duplicate receipts
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Bill #, Customer name, Phone, or Payment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                title="Start Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs"
                title="End Date"
              />
              {(startDate || endDate) && (
                <button
                  onClick={clearDateFilters}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap ml-1">
              Total: {filteredInvoices.length} Bills
            </span>
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading sales records...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm">No sales records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Bill #</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5 text-right">Grand Total</th>
                  <th className="px-5 py-3.5 text-center">Payment Mode</th>
                  <th className="px-5 py-3.5 text-center">Cashier</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {inv.customer_name || 'Walk-in Customer'}
                      </p>
                      {inv.customer_phone && (
                        <p className="text-[11px] text-slate-400">{inv.customer_phone}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 dark:text-white">
                      {currency} {Number(inv.grand_total).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-bold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {inv.payment_method || 'cash'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-500">
                      {inv.cashier_name || 'Counter Staff'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : inv.status === 'partially_paid'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleViewBill(inv.id)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrint(inv)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Print bill"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <a
                        href={InvoiceAPI.downloadPdfUrl(inv.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Download PDF Bill"
                      >
                        <FileDown className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW BILL DETAILS MODAL */}
      <Modal
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={`Retail Bill: ${selectedInvoice?.invoice_number}`}
      >
        {selectedInvoice && (
          <div className="space-y-4 text-xs">
            <div id="receipt-modal-printable" className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border space-y-3">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h3 className="font-extrabold text-sm">{business?.name || 'GROCERY STORE'}</h3>
                {business?.address && <p className="text-[10px] text-slate-500">{business.address}</p>}
                {business?.tax_id && <p className="text-[10px] text-slate-500">GSTIN: {business.tax_id}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Customer:</p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {selectedInvoice.customer_name || 'Walk-in Customer'}
                  </p>
                  {selectedInvoice.customer_phone && (
                    <p className="text-slate-500">{selectedInvoice.customer_phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-slate-400">Bill Date & Cashier:</p>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
                  </p>
                  <p className="text-slate-500">
                    Cashier: <b>{selectedInvoice.cashier_name || 'Counter Staff'}</b>
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">Billed Grocery Items:</p>
                <div className="border rounded-xl divide-y overflow-hidden">
                  {selectedInvoice.items?.map((item, idx) => (
                    <div key={idx} className="p-2 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {item.quantity} × {currency} {Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <span className="font-bold">{currency} {Number(item.line_total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calculations breakdown */}
              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{currency} {Number(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                {Number(selectedInvoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount:</span>
                    <span>- {currency} {Number(selectedInvoice.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (GST):</span>
                  <span>{currency} {Number(selectedInvoice.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-300">
                  <span>Grand Total:</span>
                  <span className="text-emerald-600">
                    {currency} {Number(selectedInvoice.grand_total).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Payment Mode:</span>
                  <span className="uppercase font-bold">{selectedInvoice.payment_method || 'Cash'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
              <a
                href={InvoiceAPI.downloadPdfUrl(selectedInvoice.id)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-slate-50"
              >
                <FileDown className="w-4 h-4" />
                <span>Download PDF</span>
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
