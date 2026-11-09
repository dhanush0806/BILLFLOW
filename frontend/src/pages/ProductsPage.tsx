import React, { useState, useEffect } from 'react';
import { ProductAPI, CategoryAPI } from '../services/endpoints';
import { Product, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  Package,
  Search,
  Filter,
  Plus,
  Edit2,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Barcode,
  Archive,
} from 'lucide-react';

const GROCERY_UNITS = [
  { label: 'Piece (pcs)', value: 'piece' },
  { label: 'Kilogram (kg)', value: 'kg' },
  { label: 'Gram (g)', value: 'g' },
  { label: 'Litre (L)', value: 'litre' },
  { label: 'Millilitre (ml)', value: 'ml' },
  { label: 'Packet (pkt)', value: 'packet' },
  { label: 'Box (box)', value: 'box' },
  { label: 'Bottle (btl)', value: 'bottle' },
  { label: 'Dozen (dz)', value: 'dozen' },
];

export const ProductsPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockStatus, setStockStatus] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [archivingProduct, setArchivingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(5);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [minimumStock, setMinimumStock] = useState<number>(5);
  const [unit, setUnit] = useState('piece');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchProducts();
    loadCategories();
  }, [search, selectedCategory, stockStatus]);

  const loadCategories = async () => {
    try {
      const res = await CategoryAPI.list();
      setCategories(res.data?.data || []);
    } catch {
      // ignore
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await ProductAPI.list({
        search: search || undefined,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        stockStatus: stockStatus !== 'all' ? stockStatus : undefined,
        limit: 300,
      });
      setProducts(res.data?.data?.products || []);
    } catch {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-6)}`);
    setBarcode('');
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setPurchasePrice(0);
    setSellingPrice(0);
    setTaxRate(5);
    setStockQuantity(0);
    setMinimumStock(5);
    setUnit('piece');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || p.code || '');
    setBarcode(p.barcode || '');
    setCategoryId(p.category_id || '');
    setDescription(p.description || '');
    setPurchasePrice(Number(p.purchase_price || 0));
    setSellingPrice(Number(p.selling_price || p.price || 0));
    setTaxRate(Number(p.tax_rate ?? 5));
    setStockQuantity(Number(p.stock_quantity ?? p.current_stock ?? 0));
    setMinimumStock(Number(p.minimum_stock ?? 5));
    setUnit(p.unit || 'piece');
    setIsActive(p.is_active ?? true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }
    if (sellingPrice < 0 || purchasePrice < 0) {
      showToast('Prices cannot be negative', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        categoryId: categoryId || undefined,
        description: description.trim() || undefined,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        taxRate: Number(taxRate) || 0,
        stockQuantity: Number(stockQuantity) || 0,
        minimumStock: Number(minimumStock) || 5,
        unit: unit || 'piece',
        isActive,
      };

      if (editingProduct) {
        await ProductAPI.update(editingProduct.id, payload);
        showToast('Product updated successfully', 'success');
      } else {
        await ProductAPI.create(payload);
        showToast('Product added successfully', 'success');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save product', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archivingProduct) return;
    try {
      await ProductAPI.archive(archivingProduct.id);
      showToast(`Product "${archivingProduct.name}" archived`, 'info');
      setArchivingProduct(null);
      fetchProducts();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to archive product', 'error');
    }
  };

  const handleToggleStatus = async (p: Product) => {
    try {
      const newStatus = !p.is_active;
      await ProductAPI.update(p.id, { isActive: newStatus });
      showToast(`Product ${newStatus ? 'activated' : 'deactivated'}`, 'info');
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_active: newStatus } : item))
      );
    } catch {
      showToast('Failed to update product status', 'error');
    }
  };

  const handleExportCsv = () => {
    if (products.length === 0) {
      showToast('No products to export', 'warning');
      return;
    }
    const headers = ['Name', 'SKU', 'Barcode', 'Category', 'Unit', 'Purchase Price', 'Selling Price', 'Tax %', 'Current Stock', 'Min Stock', 'Active'];
    const rows = products.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${p.barcode || ''}"`,
      `"${p.category || ''}"`,
      `"${p.unit || ''}"`,
      p.purchase_price || 0,
      p.selling_price || p.price || 0,
      p.tax_rate || 0,
      p.stock_quantity ?? p.current_stock ?? 0,
      p.minimum_stock || 5,
      p.is_active ? 'Yes' : 'No',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `grocery_products_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Catalog exported to CSV', 'success');
  };

  const currency = business?.currency || '₹';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <span>Products & Grocery Catalog</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage barcodes, SKUs, category classifications, cost and retail selling prices, and min-stock levels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, barcode, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
          >
            <option value="all">All Stock Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (≤ min)</option>
            <option value="out_of_stock">Out of Stock (= 0)</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Barcode / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Tax %</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">Loading grocery products...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm">No grocery products found</p>
                    <p className="text-xs text-slate-400">Click "Add Product" to create your first item</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const stock = Number(p.stock_quantity ?? p.current_stock ?? 0);
                  const isOut = stock <= 0;
                  const isLow = !isOut && stock <= Number(p.minimum_stock || 5);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">{p.name}</p>
                        {p.description && (
                          <p className="text-[10px] text-slate-400 line-clamp-1">{p.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {p.barcode ? (
                          <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                            {p.barcode}
                          </span>
                        ) : (
                          p.sku || '—'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          {p.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-600 dark:text-slate-300">{p.unit || 'piece'}</td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {currency} {Number(p.purchase_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {currency} {Number(p.selling_price || p.price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">{p.tax_rate || 0}%</td>
                      <td className="py-3 px-4 text-center">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 font-bold text-[10px]">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 font-bold text-[10px]">
                            {stock} {p.unit || 'left'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-semibold text-[10px]">
                            {stock} {p.unit || 'pcs'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          title="Click to toggle active status"
                          className="cursor-pointer"
                        >
                          {p.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              Inactive
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingProduct(p)}
                            title="View Details"
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setArchivingProduct(p)}
                            title="Archive Product"
                            className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add / Edit Product */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Grocery Product' : 'Add New Grocery Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Basmati Rice Premium 5kg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Barcode / EAN (for Barcode Scanner)
              </label>
              <input
                type="text"
                placeholder="e.g. 8901234567890"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SKU (Stock Keeping Unit)
              </label>
              <input
                type="text"
                placeholder="e.g. GRO-RIC-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:border-emerald-500"
              >
                {GROCERY_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tax Rate / GST (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Cost ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price ({currency}) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Available Stock ({unit})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Minimum Stock Level (Alert Threshold)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={minimumStock}
                onChange={(e) => setMinimumStock(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Product description, brand details, or packaging info..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_active_chk"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="is_active_chk" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                Product is active for POS billing
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
            >
              {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM ARCHIVE DIALOG */}
      <ConfirmDialog
        isOpen={!!archivingProduct}
        onClose={() => setArchivingProduct(null)}
        onConfirm={handleArchive}
        title="Archive Grocery Product"
        message={`Are you sure you want to archive "${archivingProduct?.name}"? It will no longer appear on the POS screen.`}
        confirmText="Archive Product"
        variant="danger"
      />

      {/* MODAL: View Product Details */}
      <Modal
        isOpen={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        title="Product Details"
      >
        {viewingProduct && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{viewingProduct.name}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{viewingProduct.description || 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Barcode</span>
                <p className="font-mono font-bold mt-0.5 text-emerald-600">{viewingProduct.barcode || '—'}</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">SKU</span>
                <p className="font-mono font-bold mt-0.5">{viewingProduct.sku || '—'}</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Category</span>
                <p className="font-bold mt-0.5">{viewingProduct.category || 'General'}</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Tax / GST Rate</span>
                <p className="font-bold mt-0.5">{viewingProduct.tax_rate || 0}%</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Selling Price</span>
                <p className="font-extrabold text-emerald-600 text-sm mt-0.5">
                  {currency} {Number(viewingProduct.selling_price || viewingProduct.price || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Purchase Cost</span>
                <p className="font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                  {currency} {Number(viewingProduct.purchase_price || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Available Stock</span>
                <p className="font-bold text-sm mt-0.5">
                  {Number(viewingProduct.stock_quantity ?? viewingProduct.current_stock ?? 0)} {viewingProduct.unit}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Min Stock Alert Level</span>
                <p className="font-bold mt-0.5">{viewingProduct.minimum_stock || 5} {viewingProduct.unit}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
