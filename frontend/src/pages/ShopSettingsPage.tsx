import React, { useState, useEffect } from 'react';
import { BusinessAPI } from '../services/endpoints';
import { Business, BusinessSettings } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Settings,
  Store,
  Printer,
  Receipt,
  Percent,
  AlertTriangle,
  Save,
  CheckCircle2,
} from 'lucide-react';

export const ShopSettingsPage: React.FC = () => {
  const { business, setBusiness } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Shop Profile Fields
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [taxId, setTaxId] = useState('');

  // Settings & Receipt Formatting Fields
  const [invoicePrefix, setInvoicePrefix] = useState('BILL-');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1001);
  const [defaultTaxRate, setDefaultTaxRate] = useState(5.0);
  const [taxName, setTaxName] = useState('GST');
  const [receiptHeader, setReceiptHeader] = useState('Welcome to our store!');
  const [receiptFooter, setReceiptFooter] = useState('Thank you for shopping with us! Visit again.');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const res = await BusinessAPI.getProfile();
      const b: Business = res.data?.data?.business;
      const s: BusinessSettings = res.data?.data?.settings;

      if (b) {
        setShopName(b.name || '');
        setOwnerName(b.owner_name || '');
        setEmail(b.email || '');
        setPhone(b.phone || '');
        setAddress(b.address || '');
        setCurrency(b.currency || '₹');
        setTaxId(b.tax_id || '');
      }

      if (s) {
        setInvoicePrefix(s.invoice_prefix || 'BILL-');
        setNextInvoiceNumber(s.next_invoice_number || 1001);
        setDefaultTaxRate(Number(s.default_tax_rate || 5));
        setTaxName(s.tax_name || 'GST');
        setReceiptHeader(s.receipt_header || 'Welcome to our store!');
        setReceiptFooter(s.receipt_footer || 'Thank you for shopping with us! Visit again.');
        setLowStockThreshold(s.low_stock_threshold || 10);
      }
    } catch (err: any) {
      showToast('Error loading shop settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Update Profile
      await BusinessAPI.updateProfile({
        name: shopName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        currency: currency.trim() || '₹',
        taxId: taxId.trim() || undefined,
      });

      // 2. Update Settings & Receipt Format
      await BusinessAPI.updateSettings({
        invoicePrefix,
        nextInvoiceNumber,
        defaultTaxRate,
        taxName,
        receiptHeader,
        receiptFooter,
        lowStockThreshold,
      });

      showToast('Shop and receipt settings saved successfully!', 'success');
      loadSettings();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          <span>Shop & POS Terminal Settings</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure store information, receipt printing header/footer, GST/tax rates, and alert thresholds
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Store Information */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Store className="w-4 h-4 text-brand-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Store Identity & Contacts</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Store / Shop Name *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Owner / Manager Name *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Store Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Shop Address (Printed on Receipts)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GSTIN / Tax Registration Number
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Bill Numbering & Tax Settings */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Receipt className="w-4 h-4 text-brand-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Bill Numbering & Tax Rules</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bill Prefix
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Next Bill Number
              </label>
              <input
                type="number"
                min="1"
                value={nextInvoiceNumber}
                onChange={(e) => setNextInvoiceNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tax Label (e.g. GST / VAT)
              </label>
              <input
                type="text"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold uppercase"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Receipt Format & Thermal Printing */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Printer className="w-4 h-4 text-brand-600" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">Receipt Format & Thermal Printing</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Receipt Header / Tagline
              </label>
              <textarea
                rows={2}
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Receipt Footer / Return Policy
              </label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Default Low-Stock Alert Threshold (Units)
            </label>
            <input
              type="number"
              min="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 10)}
              className="w-48 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Products with stock falling below this number will trigger low-stock alerts on the dashboard
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-600/30 transition hover:scale-[1.01] flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
