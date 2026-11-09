import React, { useState, useEffect, useRef } from 'react';
import { ProductAPI, CategoryAPI, CustomerAPI, PosAPI, InvoiceAPI } from '../services/endpoints';
import { Product, Category, Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  User,
  CreditCard,
  Banknote,
  QrCode,
  Layers,
  Printer,
  FileDown,
  CheckCircle2,
  Package,
  RefreshCw,
  Barcode,
  Split,
  UserCheck,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
}

export const PosPage: React.FC = () => {
  const { business, user } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Barcode Scanner input
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [billNotes, setBillNotes] = useState('');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'split'>('cash');
  const [tenderedCash, setTenderedCash] = useState<string>('');
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [completedInvoiceId, setCompletedInvoiceId] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Quick Customer Add Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // Web Audio Scanner Beep
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1400;
        gain.gain.value = 0.12;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // Audio autoplay may be disabled by browser
    }
  };

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes, custRes] = await Promise.all([
        ProductAPI.list({ limit: 500 }),
        CategoryAPI.list(),
        CustomerAPI.list({ limit: 200 }),
      ]);
      setProducts(prodRes.data?.data?.products || []);
      setCategories(catRes.data?.data || []);
      const custList: Customer[] = custRes.data?.data?.customers || [];
      setCustomers(custList);

      // Default to walk-in customer if not already selected
      const walkin = custList.find((c) => c.name.toLowerCase().includes('walk-in'));
      if (walkin && !selectedCustomer) {
        setSelectedCustomer(walkin);
      }
    } catch (err: any) {
      showToast('Error loading grocery catalog', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (product: Product, qtyToAdd = 1) => {
    const availableStock = Number(product.stock_quantity ?? product.current_stock ?? 0);

    if (availableStock <= 0) {
      showToast(`"${product.name}" is out of stock!`, 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + qtyToAdd > availableStock) {
          showToast(`Cannot exceed available stock of ${availableStock} ${product.unit || 'units'}!`, 'error');
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.round((item.quantity + qtyToAdd) * 100) / 100 }
            : item
        );
      } else {
        if (qtyToAdd > availableStock) {
          showToast(`Cannot exceed available stock of ${availableStock} ${product.unit || 'units'}!`, 'error');
          return prev;
        }
        return [
          ...prev,
          {
            product,
            quantity: qtyToAdd,
            unitPrice: Number(product.selling_price || product.price || 0),
            discountAmount: 0,
            taxRate: Number(product.tax_rate || 0),
          },
        ];
      }
    });
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // 1. Search locally by barcode or SKU
    const match = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === query.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === query.toLowerCase()) ||
        (p.code && p.code.toLowerCase() === query.toLowerCase())
    );

    if (match) {
      playBeep();
      addToCart(match);
      setBarcodeInput('');
      showToast(`Scanned: ${match.name}`, 'success');
      return;
    }

    // 2. Fallback to API lookup
    try {
      const res = await ProductAPI.lookupBarcode(query);
      if (res.data?.data) {
        playBeep();
        addToCart(res.data.data);
        setBarcodeInput('');
        showToast(`Scanned: ${res.data.data.name}`, 'success');
      } else {
        showToast(`Product not found for barcode: ${query}`, 'error');
      }
    } catch {
      showToast(`Product not found for barcode: ${query}`, 'error');
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const availableStock = Number(item.product.stock_quantity ?? item.product.current_stock ?? 0);
            const newQty = Math.round((item.quantity + delta) * 100) / 100;

            if (delta > 0 && newQty > availableStock) {
              showToast(`Cannot exceed available stock of ${availableStock} ${item.product.unit || 'units'}!`, 'error');
              return item;
            }

            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setBillNotes('');
  };

  // Calculations
  const subtotal = Math.round(cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) * 100) / 100;

  const billDiscount =
    discountType === 'percentage'
      ? Math.round(((subtotal * Math.min(discountValue, 100)) / 100) * 100) / 100
      : Math.min(discountValue, subtotal);

  const discountedSubtotal = Math.max(0, subtotal - billDiscount);

  const itemsTax = Math.round(
    cart.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const ratio = subtotal > 0 ? itemSubtotal / subtotal : 0;
      const itemDiscounted = discountedSubtotal * ratio;
      return sum + (itemDiscounted * item.taxRate) / 100;
    }, 0) * 100
  ) / 100;

  const grandTotal = Math.round((discountedSubtotal + itemsTax) * 100) / 100;

  // Split calculations
  const splitSum = Math.round((splitCash + splitUpi + splitCard) * 100) / 100;
  const splitRemaining = Math.round((grandTotal - splitSum) * 100) / 100;

  // Quick Customer Creation
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      showToast('Please enter customer name', 'error');
      return;
    }
    try {
      const res = await CustomerAPI.create({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
        email: newCustEmail.trim() || undefined,
        customerType: 'individual',
      });
      const created = res.data?.data;
      if (created) {
        setCustomers((prev) => [created, ...prev]);
        setSelectedCustomer(created);
        setIsCustomerModalOpen(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustEmail('');
        showToast(`Customer "${created.name}" registered`, 'success');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to register customer', 'error');
    }
  };

  // Open Payment Modal
  const handleOpenPayment = () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }
    setTenderedCash(String(grandTotal));
    setSplitCash(grandTotal);
    setSplitUpi(0);
    setSplitCard(0);
    setIsPaymentModalOpen(true);
  };

  // Checkout submission
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    if (paymentMethod === 'split') {
      if (Math.abs(splitSum - grandTotal) > 0.05) {
        showToast(`Split payments (${currency} ${splitSum.toFixed(2)}) must equal Grand Total (${currency} ${grandTotal.toFixed(2)})`, 'error');
        return;
      }
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const tenderCashNumber = parseFloat(tenderedCash) || grandTotal;

      let splitPayload: Record<string, number> | undefined = undefined;
      if (paymentMethod === 'split') {
        splitPayload = {};
        if (splitCash > 0) splitPayload['cash'] = splitCash;
        if (splitUpi > 0) splitPayload['upi'] = splitUpi;
        if (splitCard > 0) splitPayload['card'] = splitCard;
      }

      // Generate a unique client idempotency key to prevent duplicate checkouts
      const idempotencyKey = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const payload = {
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerPhone: selectedCustomer?.phone,
        items: cart.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discountAmount: item.discountAmount,
        })),
        discountType,
        discountValue,
        taxRate: undefined,
        paymentMethod,
        splitPayments: splitPayload,
        tenderedCash: paymentMethod === 'cash' ? tenderCashNumber : undefined,
        notes: billNotes || undefined,
        idempotencyKey,
      };

      const res = await PosAPI.checkout(payload);
      const data = res.data?.data;

      setReceiptData(data.receiptData || data);
      setCompletedInvoiceId(data.invoice?.id || null);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      clearCart();
      showToast(`Bill #${data.receiptData?.billNumber || data.invoice?.invoice_number} created successfully!`, 'success');

      // Refresh product stock
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to process sale. Check inventory balances.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products by manual search (name, barcode, or SKU) and category
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory || p.category === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchSearch =
      query === '' ||
      p.name.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query)) ||
      (p.sku && p.sku.toLowerCase().includes(query));
    return matchCat && matchSearch;
  });

  const currency = business?.currency || '₹';

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-5.5rem)] gap-3 sm:gap-4 p-2 sm:p-4 overflow-hidden">
      {/* LEFT: Product Catalog & Search Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Top Barcode Scanner & Search Area */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50 dark:bg-slate-900/50">
          {/* Dedicated Barcode Scanner Input */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode or type SKU & press Enter to instant add..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-emerald-500/40 focus:border-emerald-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-xs font-mono font-semibold transition"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          {/* Search by Name & SKU */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search catalog by name, barcode, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 text-xs transition"
            />
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl font-semibold whitespace-nowrap text-[11px] transition ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-xl font-semibold whitespace-nowrap text-[11px] transition ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Selection Grid */}
        <div className="flex-1 p-3 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mr-2 text-emerald-600" />
              <span>Loading grocery items...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <Package className="w-12 h-12 stroke-[1.5] mb-2 text-slate-300" />
              <p className="font-semibold text-sm">No grocery products found</p>
              <p className="text-xs text-slate-400">Try adjusting your search query or category filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredProducts.map((p) => {
                const stock = Number(p.stock_quantity ?? p.current_stock ?? 0);
                const isOutOfStock = stock <= 0;
                const isLowStock = !isOutOfStock && stock <= Number(p.minimum_stock || 5);

                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => {
                      playBeep();
                      addToCart(p);
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition group relative overflow-hidden ${
                      isOutOfStock
                        ? 'opacity-60 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    {/* Stock badge */}
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[80px]">
                        {p.category}
                      </span>
                      {isOutOfStock ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                          {stock} {p.unit || 'left'}
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          {stock} {p.unit || 'pcs'}
                        </span>
                      )}
                    </div>

                    {/* Name & Barcode */}
                    <div className="mb-2">
                      <p className="font-bold text-slate-900 dark:text-white text-xs line-clamp-2 leading-snug group-hover:text-emerald-600 transition">
                        {p.name}
                      </p>
                      {p.barcode && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate flex items-center gap-1">
                          <Barcode className="w-2.5 h-2.5 inline" /> {p.barcode}
                        </p>
                      )}
                    </div>

                    {/* Price & Add Indicator */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {currency} {Number(p.selling_price || p.price || 0).toFixed(2)}
                      </span>
                      <span className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition">
                        <Plus className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Active Cart & Billing Terminal */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Customer Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Customer</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const walkin = customers.find((c) => c.name.toLowerCase().includes('walk-in'));
                  if (walkin) setSelectedCustomer(walkin);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white underline"
              >
                Walk-in
              </button>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>
          </div>

          <select
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
              const cust = customers.find((c) => c.id === e.target.value) || null;
              setSelectedCustomer(cust);
            }}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Item Rows */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-14">
              <ShoppingBag className="w-10 h-10 stroke-[1.5] text-slate-300 mb-2" />
              <p className="font-bold text-xs">Cart is empty</p>
              <p className="text-[11px] text-slate-400 text-center max-w-[200px] mt-0.5">
                Scan barcode or click items to add to bill
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white truncate text-xs">
                    {item.product.name}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    {currency} {item.unitPrice.toFixed(2)} × {item.quantity} ={' '}
                    <span className="font-bold text-slate-900 dark:text-white">
                      {currency} {(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </p>
                </div>

                {/* Stepper buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 ml-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Calculations & Discounts Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2.5">
          {/* Discount inputs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 flex-1">
              <input
                type="number"
                min="0"
                placeholder="Discount"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2 text-xs bg-transparent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setDiscountType(discountType === 'fixed' ? 'percentage' : 'fixed')}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 uppercase"
              >
                {discountType === 'fixed' ? currency : '%'}
              </button>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-500 hover:underline px-2 py-1 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Totals Summary */}
          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {currency} {subtotal.toFixed(2)}
              </span>
            </div>
            {billDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Discount:</span>
                <span>- {currency} {billDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax (GST):</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {currency} {itemsTax.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-800">
              <span>Payable Total:</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {currency} {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handleOpenPayment}
            disabled={cart.length === 0}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-sm transition hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Banknote className="w-4 h-4" />
            <span>Complete Sale ({currency} {grandTotal.toFixed(2)})</span>
          </button>
        </div>
      </div>

      {/* MODAL: Payment Recording (Cash, UPI, Card, Split) */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment & Generate Invoice"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider">
              Total Amount Payable
            </p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {currency} {grandTotal.toFixed(2)}
            </p>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'upi', label: 'UPI', icon: QrCode },
                { id: 'card', label: 'Card', icon: CreditCard },
                { id: 'split', label: 'Split', icon: Split },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                    paymentMethod === m.id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  <span className="text-xs">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Single Cash Tendered & Change Calculator */}
          {paymentMethod === 'cash' && (
            <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Cash Tendered by Customer
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={`e.g. ${grandTotal}`}
                  value={tenderedCash}
                  onChange={(e) => setTenderedCash(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold"
                />
                <button
                  type="button"
                  onClick={() => setTenderedCash(String(grandTotal))}
                  className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
                >
                  Exact
                </button>
              </div>
              {parseFloat(tenderedCash) >= grandTotal && (
                <div className="pt-2 text-xs flex justify-between font-bold text-emerald-600 dark:text-emerald-400 border-t border-slate-200 dark:border-slate-800">
                  <span>Change to Return:</span>
                  <span>{currency} {(parseFloat(tenderedCash) - grandTotal).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Split Payment Inputs */}
          {paymentMethod === 'split' && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Enter Split Amounts (Sum must equal {currency} {grandTotal.toFixed(2)})
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Cash</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitCash || ''}
                    onChange={(e) => setSplitCash(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">UPI</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitUpi || ''}
                    onChange={(e) => setSplitUpi(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Card</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={splitCard || ''}
                    onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-500">Allocated: {currency} {splitSum.toFixed(2)}</span>
                {Math.abs(splitRemaining) > 0.05 ? (
                  <span className="font-bold text-rose-500">Remaining: {currency} {splitRemaining.toFixed(2)}</span>
                ) : (
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Perfectly Balanced
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Optional Bill Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Bill Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Counter #1 checkout"
              value={billNotes}
              onChange={(e) => setBillNotes(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          {/* Checkout Action Button */}
          <button
            onClick={handleCheckout}
            disabled={isSubmitting || (paymentMethod === 'split' && Math.abs(splitRemaining) > 0.05)}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-sm transition hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Saving Sale & Deducting Stock...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Bill & Generate Invoice</span>
              </>
            )}
          </button>
        </div>
      </Modal>

      {/* MODAL: Printable Receipt View & Print */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Grocery Bill Receipt"
      >
        {receiptData && (
          <div className="space-y-4">
            <div id="receipt-printable-area" className="p-6 bg-white text-slate-900 font-mono text-xs border border-slate-200 rounded-xl space-y-3">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h3 className="font-extrabold text-base tracking-tight">{receiptData.shopName || business?.name || 'GROCERY STORE'}</h3>
                {receiptData.shopAddress && <p className="text-[11px] text-slate-600 mt-0.5">{receiptData.shopAddress}</p>}
                {receiptData.shopPhone && <p className="text-[11px] text-slate-600">Ph: {receiptData.shopPhone}</p>}
                {receiptData.shopGstin && <p className="text-[11px] text-slate-600">GSTIN: {receiptData.shopGstin}</p>}
                <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  RETAIL TAX INVOICE
                </div>
              </div>

              {/* Bill Details */}
              <div className="flex justify-between text-[11px] pb-2 border-b border-dashed border-slate-300">
                <div>
                  <p>Bill #: <span className="font-bold">{receiptData.billNumber || receiptData.invoiceNumber}</span></p>
                  <p>Date: {new Date(receiptData.billDate || Date.now()).toLocaleDateString()} {new Date(receiptData.billDate || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p>Customer: {receiptData.customerName || selectedCustomer?.name || 'Walk-in'}</p>
                  {receiptData.customerPhone && <p>Phone: {receiptData.customerPhone}</p>}
                  <p>Cashier: {receiptData.cashierName || user?.fullName || 'Counter Staff'}</p>
                </div>
              </div>

              {/* Items List */}
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-300 font-bold">
                    <th className="pb-1">Item</th>
                    <th className="pb-1 text-center">Qty</th>
                    <th className="pb-1 text-right">Price</th>
                    <th className="pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(receiptData.items || []).map((it: any, i: number) => (
                    <tr key={i} className="py-1">
                      <td className="py-1 font-sans">{it.name}</td>
                      <td className="py-1 text-center">{it.quantity}</td>
                      <td className="py-1 text-right">{currency} {Number(it.unitPrice || it.unit_price).toFixed(2)}</td>
                      <td className="py-1 text-right font-bold">{currency} {Number(it.lineTotal || it.line_total || it.unitPrice * it.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{currency} {Number(receiptData.subtotal).toFixed(2)}</span>
                </div>
                {Number(receiptData.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>- {currency} {Number(receiptData.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (GST):</span>
                  <span>{currency} {Number(receiptData.taxAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
                  <span>GRAND TOTAL:</span>
                  <span>{currency} {Number(receiptData.grandTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 text-[10px] text-slate-600">
                  <span>Payment Method:</span>
                  <span className="uppercase font-bold">{receiptData.paymentMethod}</span>
                </div>
                {receiptData.splitPayments && (
                  <div className="pl-2 text-[10px] text-slate-500">
                    {Object.entries(receiptData.splitPayments).map(([m, a]) => (
                      <p key={m}>• {m.toUpperCase()}: {currency} {Number(a).toFixed(2)}</p>
                    ))}
                  </div>
                )}
                {receiptData.changeTendered !== undefined && Number(receiptData.changeTendered) > 0 && (
                  <div className="flex justify-between text-[10px] font-bold text-emerald-700">
                    <span>Change Returned:</span>
                    <span>{currency} {Number(receiptData.changeTendered).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500">
                <p>{receiptData.receiptFooter || 'Thank you for shopping with us! Visit again.'}</p>
                <p>Please retain this bill for return / exchanges.</p>
              </div>
            </div>

            {/* Print, Download PDF & Close Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              {completedInvoiceId && (
                <a
                  href={InvoiceAPI.downloadPdfUrl(completedInvoiceId)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <FileDown className="w-4 h-4" />
                  <span>PDF</span>
                </a>
              )}
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: Quick Add Customer */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Add Walk-in / Regular Customer"
      >
        <form onSubmit={handleQuickAddCustomer} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              placeholder="+91 98765 43210"
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="customer@email.com"
              value={newCustEmail}
              onChange={(e) => setNewCustEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
