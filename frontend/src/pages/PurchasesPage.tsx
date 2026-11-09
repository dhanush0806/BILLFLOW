import React, { useState, useEffect } from 'react';
import { PurchaseAPI, SupplierAPI, ProductAPI } from '../services/endpoints';
import { Purchase, Supplier, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Truck,
  Plus,
  Search,
  Eye,
  Trash2,
  Calendar,
  Building,
  CheckCircle,
  PackageCheck,
  Clock,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const PurchasesPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Purchase Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseStatus, setPurchaseStatus] = useState<'received' | 'ordered'>('received');
  const [referenceInvoiceNumber, setReferenceInvoiceNumber] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<
    Array<{ productId: string; productName: string; quantity: number; unitCost: number; taxRate: number }>
  >([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [shippingAmount, setShippingAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  // View Details Modal
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        PurchaseAPI.list({ limit: 100 }),
        SupplierAPI.list({ limit: 100 }),
        ProductAPI.list({ limit: 200 }),
      ]);
      setPurchases(purRes.data?.data?.purchases || []);
      setSuppliers(supRes.data?.data?.suppliers || []);
      setProducts(prodRes.data?.data?.products || []);
    } catch (err: any) {
      showToast('Error loading purchases', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItemRow = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setPurchaseItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        quantity: 10,
        unitCost: Number(prod.purchase_price || 0),
        taxRate: Number(prod.tax_rate || 5),
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, field: string, value: any) => {
    setPurchaseItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const itemsSubtotal = purchaseItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const totalAmount = Math.max(0, itemsSubtotal + taxAmount + shippingAmount - discountAmount);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      showToast('Please select a supplier', 'error');
      return;
    }
    if (purchaseItems.length === 0) {
      showToast('Add at least one product to the purchase order', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await PurchaseAPI.create({
        supplierId: selectedSupplierId,
        purchaseDate,
        status: purchaseStatus,
        referenceInvoiceNumber: referenceInvoiceNumber || undefined,
        items: purchaseItems,
        taxAmount,
        discountAmount,
        shippingAmount,
        paidAmount,
        paymentMethod,
        notes,
      });

      showToast(
        purchaseStatus === 'received'
          ? 'Purchase recorded and store stock increased!'
          : 'Purchase order placed. You can receive goods when the shipment arrives.',
        'success'
      );
      setIsCreateModalOpen(false);
      setPurchaseItems([]);
      setSelectedSupplierId('');
      setNotes('');
      setReferenceInvoiceNumber('');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create purchase order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveGoods = async (purchaseId: string) => {
    if (receivingId) return;
    setReceivingId(purchaseId);
    try {
      await PurchaseAPI.receiveGoods(purchaseId);
      showToast('Purchased goods marked as received. Stock quantities increased!', 'success');
      await loadData();
      if (selectedPurchase && selectedPurchase.id === purchaseId) {
        const updated = await PurchaseAPI.getById(purchaseId);
        setSelectedPurchase(updated.data.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to receive goods', 'error');
    } finally {
      setReceivingId(null);
    }
  };

  const handleViewPurchase = async (id: string) => {
    try {
      const res = await PurchaseAPI.getById(id);
      setSelectedPurchase(res.data.data);
    } catch (err) {
      showToast('Error loading purchase details', 'error');
    }
  };

  const currency = business?.currency || '₹';

  const filteredPurchases = purchases.filter(
    (p) =>
      p.purchase_number.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplier_name && p.supplier_name.toLowerCase().includes(search.toLowerCase())) ||
      (p.supplier_company && p.supplier_company.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Purchases & Goods Inward</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create purchase orders, record supplier invoices, and safely receive goods into inventory
          </p>
        </div>

        <button
          onClick={() => {
            setPurchaseItems([]);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by PO #, supplier name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Total: {filteredPurchases.length} Purchase Records
        </span>
      </div>

      {/* Purchases Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading purchase records...</div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm">No purchases recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">PO Number</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Supplier</th>
                  <th className="px-5 py-3.5 text-right">Total Amount</th>
                  <th className="px-5 py-3.5 text-right">Paid</th>
                  <th className="px-5 py-3.5 text-right">Balance</th>
                  <th className="px-5 py-3.5 text-center">Goods Status</th>
                  <th className="px-5 py-3.5 text-center">Payment</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredPurchases.map((p) => {
                  const isReceived = p.status === 'received';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {p.purchase_number}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {new Date(p.purchase_date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{p.supplier_name}</p>
                        {p.supplier_company && (
                          <p className="text-[11px] text-slate-400">{p.supplier_company}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 dark:text-white">
                        {currency} {Number(p.total_amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-emerald-600 font-bold">
                        {currency} {Number(p.paid_amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-700 dark:text-slate-300">
                        {currency} {Number(p.balance_due).toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {isReceived ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                            <PackageCheck className="w-3 h-3" />
                            <span>Received</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                            <Clock className="w-3 h-3" />
                            <span>Ordered</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : p.payment_status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}
                        >
                          {p.payment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        {!isReceived && (
                          <button
                            onClick={() => handleReceiveGoods(p.id)}
                            disabled={receivingId === p.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-sm"
                            title="Mark shipment as received and add to store inventory"
                          >
                            <PackageCheck className="w-3 h-3" />
                            <span>{receivingId === p.id ? 'Receiving...' : 'Receive Goods'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleViewPurchase(p.id)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PURCHASE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Purchase Order & Receive Stock"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Supplier *
              </label>
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.company_name ? `(${s.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Goods Status *
              </label>
              <select
                value={purchaseStatus}
                onChange={(e) => setPurchaseStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-emerald-700 dark:text-emerald-400"
              >
                <option value="received">Received (Add to Stock Immediately)</option>
                <option value="ordered">Ordered (Receive Goods Later)</option>
              </select>
            </div>
          </div>

          {/* Supplier Bill / Reference # */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Supplier Invoice / Bill Reference Number (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. SUPP-INV-8912"
              value={referenceInvoiceNumber}
              onChange={(e) => setReferenceInvoiceNumber(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          {/* Add Product Dropdown */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              + Add Grocery Products to Purchase
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddItemRow(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
            >
              <option value="">-- Select a product to add to order --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.barcode ? `[${p.barcode}]` : ''} (Current Stock: {p.stock_quantity ?? 0} {p.unit || 'pcs'} | Cost: {currency} {p.purchase_price})
                </option>
              ))}
            </select>
          </div>

          {/* Line items table */}
          {purchaseItems.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 w-24">Quantity</th>
                    <th className="p-2.5 w-28">Unit Cost</th>
                    <th className="p-2.5 w-24 text-right">Line Total</th>
                    <th className="p-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {purchaseItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                        {item.productName}
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateItemRow(idx, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-full px-2 py-1 rounded border text-xs font-bold"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => updateItemRow(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 rounded border text-xs font-bold"
                        />
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-slate-900 dark:text-white">
                        {currency} {(item.quantity * item.unitCost).toFixed(2)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals & Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500">
                  Paid Amount Now ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Delivered by Truck #402"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{currency} {itemsSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Total PO Amount:</span>
                <span className="text-emerald-600">{currency} {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paid Now:</span>
                <span className="font-semibold text-emerald-600">{currency} {paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-500">
                <span>Balance Due to Supplier:</span>
                <span>{currency} {Math.max(0, totalAmount - paidAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || purchaseItems.length === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Save Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW PURCHASE DETAILS MODAL */}
      <Modal
        isOpen={Boolean(selectedPurchase)}
        onClose={() => setSelectedPurchase(null)}
        title={`Purchase Order: ${selectedPurchase?.purchase_number}`}
      >
        {selectedPurchase && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border">
              <div>
                <p className="text-slate-400">Supplier:</p>
                <p className="font-bold text-slate-900 dark:text-white">{selectedPurchase.supplier_name}</p>
                {selectedPurchase.supplier_company && (
                  <p className="text-slate-500">{selectedPurchase.supplier_company}</p>
                )}
              </div>
              <div>
                <p className="text-slate-400">PO Date:</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {new Date(selectedPurchase.purchase_date).toLocaleDateString()}
                </p>
                <p className="text-slate-500">
                  Goods: <b className="uppercase">{selectedPurchase.status}</b> | Payment: <b className="uppercase">{selectedPurchase.payment_status}</b>
                </p>
              </div>
            </div>

            {/* If ordered and not yet received, offer Receive Goods button in detail view */}
            {selectedPurchase.status !== 'received' && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                <div>
                  <p className="font-bold text-amber-900 dark:text-amber-200">Goods Shipment Pending</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">Click to receive items into store stock.</p>
                </div>
                <button
                  onClick={() => handleReceiveGoods(selectedPurchase.id)}
                  disabled={receivingId === selectedPurchase.id}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <PackageCheck className="w-3.5 h-3.5" />
                  <span>{receivingId === selectedPurchase.id ? 'Receiving...' : 'Receive Goods Now'}</span>
                </button>
              </div>
            )}

            {/* Items list */}
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">Purchased Items:</p>
              <div className="border rounded-xl divide-y overflow-hidden">
                {selectedPurchase.items?.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{item.product_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.quantity} units × {currency} {Number(item.unit_cost).toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold">{currency} {Number(item.line_total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border flex justify-between items-center font-bold">
              <span>Total Purchase Amount:</span>
              <span className="text-sm font-extrabold text-emerald-600">
                {currency} {Number(selectedPurchase.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
