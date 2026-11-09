import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  CustomerAPI,
  CatalogAPI,
  InvoiceAPI,
  BusinessAPI,
} from '../services/endpoints';
import { Customer, Product, Service, InvoiceItem } from '../types';
import { roundMoney } from '../utils/calculator';
import {
  FileText,
  Plus,
  Trash2,
  Calendar,
  Building,
  DollarSign,
  ArrowLeft,
  Check,
  Send,
  Sparkles,
} from 'lucide-react';

export const CreateInvoicePage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState(searchParams.get('customerId') || '');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('Thank you for your business!');
  const [paymentInstructions, setPaymentInstructions] = useState(business?.payment_instructions || '');

  // Discounts, taxes, other charges
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [invoiceTaxRate, setInvoiceTaxRate] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);

  // Items
  const [items, setItems] = useState<
    Array<{
      itemType: 'product' | 'service' | 'custom';
      productId?: string | null;
      serviceId?: string | null;
      name: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      taxRate: number;
      lineTotal: number;
    }>
  >([
    {
      itemType: 'custom',
      name: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountAmount: 0,
      taxRate: 0,
      lineTotal: 0,
    },
  ]);

  useEffect(() => {
    loadDependencies();
  }, []);

  const loadDependencies = async () => {
    setLoading(true);
    try {
      const [custRes, prodRes, svcRes, settRes] = await Promise.all([
        CustomerAPI.list({ limit: 100 }),
        CatalogAPI.listProducts(),
        CatalogAPI.listServices(),
        BusinessAPI.getSettings(),
      ]);

      setCustomers(custRes.data?.data?.customers || []);
      setProducts(prodRes.data?.data || []);
      setServices(svcRes.data?.data || []);

      const settings = settRes.data?.data;
      if (settings) {
        if (settings.default_notes) setNotes(settings.default_notes);
        if (settings.default_tax_rate) setInvoiceTaxRate(Number(settings.default_tax_rate));
        
        // Compute due date from default_due_days
        const days = settings.default_due_days || 14;
        const d = new Date();
        d.setDate(d.getDate() + days);
        setDueDate(d.toISOString().split('T')[0]);
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setDueDate(d.toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error('Failed to load invoice form dependencies', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemType: 'custom',
        name: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        taxRate: 0,
        lineTotal: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      showToast('An invoice must have at least one item', 'error');
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };

    // Auto-calculate line total
    const qty = Math.max(0, item.quantity || 0);
    const price = Math.max(0, item.unitPrice || 0);
    const disc = Math.min(qty * price, Math.max(0, item.discountAmount || 0));
    const taxable = qty * price - disc;
    const tax = (taxable * (item.taxRate || 0)) / 100;
    item.lineTotal = roundMoney(taxable + tax);

    updated[index] = item;
    setItems(updated);
  };

  const handleSelectCatalogItem = (index: number, type: 'product' | 'service', id: string) => {
    if (type === 'product') {
      const prod = products.find((p) => p.id === id);
      if (prod) {
        handleItemChange(index, 'name', prod.name);
        handleItemChange(index, 'unitPrice', Number(prod.price));
        handleItemChange(index, 'description', prod.description || '');
        handleItemChange(index, 'productId', prod.id);
        handleItemChange(index, 'serviceId', null);
        handleItemChange(index, 'itemType', 'product');
      }
    } else {
      const svc = services.find((s) => s.id === id);
      if (svc) {
        handleItemChange(index, 'name', svc.name);
        handleItemChange(index, 'unitPrice', Number(svc.default_price));
        handleItemChange(index, 'description', svc.description || '');
        handleItemChange(index, 'serviceId', svc.id);
        handleItemChange(index, 'productId', null);
        handleItemChange(index, 'itemType', 'service');
      }
    }
  };

  // Financial Computations
  const subtotal = roundMoney(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0));
  
  let calculatedDiscount = 0;
  if (discountType === 'percentage') {
    calculatedDiscount = roundMoney((subtotal * Math.min(100, Math.max(0, discountValue))) / 100);
  } else {
    calculatedDiscount = Math.min(subtotal, Math.max(0, discountValue));
  }

  const taxableAmount = Math.max(0, roundMoney(subtotal - calculatedDiscount));
  const invoiceTaxAmount = roundMoney((taxableAmount * (invoiceTaxRate || 0)) / 100);
  const other = Math.max(0, Number(otherCharges) || 0);
  const grandTotal = roundMoney(taxableAmount + invoiceTaxAmount + other);

  const handleSubmitInvoice = async (statusToSet: 'draft' | 'issued') => {
    if (!selectedCustomerId) {
      showToast('Please select a customer for this invoice', 'error');
      return;
    }
    if (!invoiceDate || !dueDate) {
      showToast('Please provide valid invoice and due dates', 'error');
      return;
    }
    for (const item of items) {
      if (!item.name.trim()) {
        showToast('Please provide a name for all items', 'error');
        return;
      }
      if (item.quantity <= 0) {
        showToast('Item quantities must be greater than zero', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        invoiceDate,
        dueDate,
        items: items.map((i) => ({
          itemType: i.itemType,
          productId: i.productId || null,
          serviceId: i.serviceId || null,
          name: i.name,
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discountAmount: Number(i.discountAmount) || 0,
          taxRate: Number(i.taxRate) || 0,
        })),
        discountType,
        discountValue: Number(discountValue) || 0,
        taxRate: Number(invoiceTaxRate) || 0,
        otherCharges: Number(otherCharges) || 0,
        notes,
        paymentInstructions,
        status: statusToSet,
      };

      const res = await InvoiceAPI.create(payload);
      showToast(
        statusToSet === 'issued'
          ? 'Invoice successfully issued and assigned number!'
          : 'Invoice saved as draft',
        'success'
      );
      navigate(`/invoices/${res.data.data.id}`);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create invoice', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = business?.currency || 'USD';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Create Invoice</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compose itemized bills for products, services, or hourly projects.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleSubmitInvoice('draft')}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmitInvoice('issued')}
            disabled={isSubmitting}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition hover:scale-[1.02] flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Issue Invoice</span>
          </button>
        </div>
      </div>

      {/* Main Invoice Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
        {/* Customer & Dates Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Billed To (Customer) <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-[11px] text-brand-600 mt-1 cursor-pointer" onClick={() => navigate('/customers')}>
                + Add customer first
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Invoice Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Payment Due Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Itemized Products & Services
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-2/5">Item & Description</th>
                  <th className="py-2.5 px-3 w-24">Catalog Autocomplete</th>
                  <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                  <th className="py-2.5 px-3 w-28 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 w-24 text-right">Tax %</th>
                  <th className="py-2.5 px-3 w-28 text-right">Total</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, index) => (
                  <tr key={index} className="align-top">
                    {/* Item Name & Description */}
                    <td className="py-3 px-3 space-y-1.5">
                      <input
                        type="text"
                        required
                        placeholder="Item name / title"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                      />
                      <input
                        type="text"
                        placeholder="Optional description / details"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-1 text-[11px] rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 focus:outline-none focus:border-brand-500"
                      />
                    </td>

                    {/* Catalog Picker */}
                    <td className="py-3 px-3">
                      <select
                        onChange={(e) => {
                          const [type, id] = e.target.value.split(':');
                          if (id) handleSelectCatalogItem(index, type as any, id);
                        }}
                        defaultValue=""
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500"
                      >
                        <option value="">Pick from catalog</option>
                        {products.length > 0 && (
                          <optgroup label="Products (Retail)">
                            {products.map((p) => (
                              <option key={p.id} value={`product:${p.id}`}>
                                {p.name} ({currency} {Number(p.price).toFixed(2)})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {services.length > 0 && (
                          <optgroup label="Services">
                            {services.map((s) => (
                              <option key={s.id} value={`service:${s.id}`}>
                                {s.name} ({currency} {Number(s.default_price).toFixed(2)})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                      />
                    </td>

                    {/* Tax Rate */}
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0%"
                        value={item.taxRate || ''}
                        onChange={(e) =>
                          handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 text-right rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-brand-500"
                      />
                    </td>

                    {/* Line Total */}
                    <td className="py-3 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                      {currency} {Number(item.lineTotal || 0).toFixed(2)}
                    </td>

                    {/* Remove */}
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes & Totals Calculation Box */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
          {/* Notes and Instructions */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Customer Notes / Terms
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes visible on customer invoice..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Bank / UPI Payment Instructions
              </label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="Bank account or UPI ID instructions..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Totals Summary */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3.5 text-xs transition-colors">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {currency} {subtotal.toFixed(2)}
              </span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <span>Discount</span>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="fixed">Fixed ({currency})</option>
                  <option value="percentage">Percent (%)</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 text-right rounded border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <span className="text-rose-600 font-semibold w-24 text-right">
                  -{currency} {calculatedDiscount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Tax */}
            <div className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>Invoice Tax</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={invoiceTaxRate}
                  onChange={(e) => setInvoiceTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-14 px-2 py-0.5 text-right rounded border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <span>%</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white">
                +{currency} {invoiceTaxAmount.toFixed(2)}
              </span>
            </div>

            {/* Other Charges */}
            <div className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-400">
              <span>Other Charges</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1 text-right rounded border border-slate-200 dark:border-slate-800 text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
              <span className="font-extrabold text-slate-900 dark:text-white">Grand Total</span>
              <span className="text-xl font-extrabold text-brand-600 dark:text-brand-400">
                {currency} {grandTotal.toFixed(2)}
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Balance Due (Unpaid)</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {currency} {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
