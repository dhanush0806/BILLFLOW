import React, { useState, useEffect } from 'react';
import { InventoryAPI, ProductAPI } from '../services/endpoints';
import { StockMovement, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Boxes,
  AlertTriangle,
  XCircle,
  History,
  TrendingUp,
  Plus,
  Minus,
  SlidersHorizontal,
  RefreshCw,
  Search,
  FileSpreadsheet,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const InventoryPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'low_stock' | 'out_of_stock' | 'movements' | 'valuation'>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [valuation, setValuation] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustType, setAdjustType] = useState<string>('adjustment_damage');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [isAddition, setIsAddition] = useState<boolean>(false);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Movement Filter
  const [movementFilter, setMovementFilter] = useState('all');

  useEffect(() => {
    loadAllInventoryData();
  }, []);

  const loadAllInventoryData = async () => {
    setIsLoading(true);
    try {
      const [overRes, lowRes, outRes, movRes, valRes, prodRes] = await Promise.all([
        InventoryAPI.getOverview(),
        InventoryAPI.getLowStock(),
        InventoryAPI.getOutOfStock(),
        InventoryAPI.getMovements({ limit: 100 }),
        InventoryAPI.getValuation(),
        ProductAPI.list({ limit: 200 }),
      ]);

      setOverview(overRes.data?.data || null);
      setLowStockItems(lowRes.data?.data || []);
      setOutOfStockItems(outRes.data?.data || []);
      setMovements(movRes.data?.data?.movements || []);
      setValuation(valRes.data?.data || []);
      setProducts(prodRes.data?.data?.products || []);
    } catch (err: any) {
      showToast('Error loading inventory records', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      showToast('Please select a product', 'error');
      return;
    }
    if (!adjustReason.trim()) {
      showToast('Detailed reason is required for every stock adjustment', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await InventoryAPI.adjustStock({
        productId: selectedProductId,
        adjustmentType: adjustType,
        quantity: Math.abs(adjustQty),
        isAddition,
        reason: adjustReason.trim(),
      });
      showToast('Stock adjustment recorded successfully', 'success');
      setIsAdjustModalOpen(false);
      setSelectedProductId('');
      setAdjustReason('');
      setAdjustQty(1);
      loadAllInventoryData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Adjustment failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = business?.currency || '₹';

  const filteredMovements = movements.filter((m) =>
    movementFilter === 'all' ? true : m.movement_type === movementFilter
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Inventory & Stock Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor real-time stock levels, record damage/expiry adjustments, and view valuation audit trails
          </p>
        </div>

        <button
          onClick={() => setIsAdjustModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition hover:scale-[1.02]"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Adjust Stock</span>
        </button>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Stock Units
            </p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {Number(overview.total_units_in_stock).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Across {overview.total_products} products</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Inventory Value (Cost)
            </p>
            <p className="text-2xl font-extrabold text-brand-600 dark:text-brand-400 mt-1">
              {currency} {Number(overview.total_valuation_cost).toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Total invested capital</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Low Stock Alerts</span>
            </p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {overview.low_stock_count}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Below minimum threshold</p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Out of Stock</span>
            </p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {overview.out_of_stock_count}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Requires immediate purchase</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Stock Overview' },
          { id: 'low_stock', label: `Low Stock (${lowStockItems.length})` },
          { id: 'out_of_stock', label: `Out of Stock (${outOfStockItems.length})` },
          { id: 'movements', label: 'Movement Audit Log' },
          { id: 'valuation', label: 'Stock Valuation Report' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-3 transition whitespace-nowrap border-b-2 ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Overview Table */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-semibold text-slate-500">
            <span>All Store Products & Current Available Quantities</span>
            <span>{products.length} Products</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">SKU / Barcode</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5 text-right">Available Stock</th>
                  <th className="px-5 py-3.5 text-right">Cost Price</th>
                  <th className="px-5 py-3.5 text-right">Selling Price</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {products.map((p) => {
                  const isOut = p.stock_quantity <= 0;
                  const isLow = !isOut && p.stock_quantity <= p.minimum_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">
                        {p.sku || p.barcode || '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{p.category}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {p.stock_quantity} {p.unit}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600 dark:text-slate-300">
                        {currency} {Number(p.purchase_price || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {currency} {Number(p.selling_price || p.price || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                            Healthy
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Low Stock Alerts */}
      {activeTab === 'low_stock' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Items Reached Minimum Threshold
            </h3>
            <p className="text-xs text-slate-500">Create purchase orders for these items soon to prevent stockout</p>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No low-stock items! Inventory levels are healthy.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {lowStockItems.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-400">
                      SKU: {item.sku} | Category: {item.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-xl font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      Current: {item.stock_quantity} / Min: {item.minimum_stock} {item.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Out of Stock */}
      {activeTab === 'out_of_stock' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4">
          <div className="mb-4">
            <h3 className="font-bold text-rose-600 text-sm">Critical: Completely Out of Stock Items</h3>
            <p className="text-xs text-slate-500">These items have 0 units and cannot be sold on POS</p>
          </div>

          {outOfStockItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Zero out-of-stock items in store!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {outOfStockItems.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-400">SKU: {item.sku} | Barcode: {item.barcode}</p>
                  </div>
                  <span className="px-3 py-1 rounded-xl font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                    0 {item.unit} in stock
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Stock Movement Audit History */}
      {activeTab === 'movements' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Recorded Stock Movements & Audit History
              </h3>
              <p className="text-xs text-slate-500">Every stock addition, sale deduction, damage or expiry is logged</p>
            </div>

            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Movements</option>
              <option value="sale">Sales Only</option>
              <option value="purchase">Purchases Only</option>
              <option value="return">Returns Only</option>
              <option value="adjustment_damage">Damaged Stock</option>
              <option value="adjustment_expired">Expired Stock</option>
              <option value="adjustment_recount">Recount Correction</option>
              <option value="initial_stock">Opening Stock</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5 text-right">Change</th>
                  <th className="px-5 py-3.5 text-right">Balance</th>
                  <th className="px-5 py-3.5">Reason / Note</th>
                  <th className="px-5 py-3.5">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                      {m.product_name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        {m.movement_type.replace('adjustment_', '')}
                      </span>
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-extrabold ${
                        m.quantity_change > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-300">
                      {m.quantity_before} → <b>{m.quantity_after}</b>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {m.reason}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{m.creator_name || 'System'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Stock Valuation Report */}
      {activeTab === 'valuation' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Inventory Valuation & Margin Potential
            </h3>
            <p className="text-xs text-slate-500">Calculated from purchase cost price vs selling price</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5 text-right">Cost Price</th>
                  <th className="px-5 py-3.5 text-right">Selling Price</th>
                  <th className="px-5 py-3.5 text-right">Total Cost Value</th>
                  <th className="px-5 py-3.5 text-right">Total Retail Value</th>
                  <th className="px-5 py-3.5 text-right">Potential Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {valuation.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                      {v.name}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{v.stock_quantity} {v.unit}</td>
                    <td className="px-5 py-3 text-right">{currency} {Number(v.purchase_price).toFixed(2)}</td>
                    <td className="px-5 py-3 text-right">{currency} {Number(v.selling_price).toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">
                      {currency} {Number(v.total_cost_value).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-brand-600 dark:text-brand-400">
                      {currency} {Number(v.total_retail_value).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {currency} {Number(v.potential_profit).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Record Stock Adjustment"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Product *
            </label>
            <select
              required
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            >
              <option value="">-- Choose a product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current: {p.stock_quantity} {p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Adjustment Reason / Category *
              </label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              >
                <option value="adjustment_damage">Damaged Stock</option>
                <option value="adjustment_expired">Expired Stock</option>
                <option value="adjustment_recount">Recount Discrepancy</option>
                <option value="adjustment_manual">Manual Correction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Direction
              </label>
              <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsAddition(false)}
                  className={`flex-1 py-2 text-xs font-bold transition ${
                    !isAddition ? 'bg-rose-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600'
                  }`}
                >
                  Deduct (-)
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddition(true)}
                  className={`flex-1 py-2 text-xs font-bold transition ${
                    isAddition ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600'
                  }`}
                >
                  Add (+)
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              min="1"
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Detailed Reason for Audit History *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. 2 milk packs leaked during morning transit unloading..."
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(false)}
              className="px-4 py-2 rounded-xl border text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Apply Stock Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
