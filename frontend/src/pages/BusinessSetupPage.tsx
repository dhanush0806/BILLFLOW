import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { BusinessAPI } from '../services/endpoints';
import {
  Check,
  Store,
  Receipt,
  Percent,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const BusinessSetupPage: React.FC = () => {
  const { business, updateBusiness } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Store Profile
    name: business?.name || '',
    address: business?.address || '',
    currency: business?.currency || '₹',
    paymentInstructions: 'Accepts UPI, Cash, and Card payments at billing counter',

    // Step 2: POS Bill Preferences
    invoicePrefix: 'BILL-',
    nextInvoiceNumber: 1001,
    defaultTaxRate: 5.0,
    taxName: 'GST',
    receiptHeader: 'Welcome to our store!',
    receiptFooter: 'Thank you for shopping with us! Visit again.',
    lowStockThreshold: 10,

    // Step 3: Bank & UPI Info
    bankName: '',
    accountNumber: '',
    routingOrIfsc: '',
    upiId: '',

    // Step 4: First Product Entry (optional)
    firstItemName: '',
    firstItemPrice: 0,
    firstItemCategory: 'Groceries & Staples',
  });

  const handleChange = (field: string, val: any) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: formData.name,
        address: formData.address,
        currency: formData.currency,
        paymentInstructions: formData.paymentInstructions,
        invoicePrefix: formData.invoicePrefix,
        nextInvoiceNumber: Number(formData.nextInvoiceNumber),
        defaultTaxRate: Number(formData.defaultTaxRate),
        taxName: formData.taxName,
        receiptHeader: formData.receiptHeader,
        receiptFooter: formData.receiptFooter,
        lowStockThreshold: Number(formData.lowStockThreshold),
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        routingOrIfsc: formData.routingOrIfsc,
        upiId: formData.upiId,
      };

      if (formData.firstItemName) {
        payload.firstCatalogItem = {
          type: 'product',
          name: formData.firstItemName,
          price: Number(formData.firstItemPrice),
          category: formData.firstItemCategory,
        };
      }

      const res = await BusinessAPI.completeSetup(payload);
      updateBusiness(res.data.data.business);
      showToast('Store setup completed successfully!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to complete setup', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative transition-colors duration-200">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl px-4 sm:px-0">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-3">
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            <span>Retail POS Setup Wizard</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Let's Set Up Your Retail Store
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Step {step} of 3 — Configure your billing preferences and store details
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
          {/* STEP 1: Store Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Store Identity & Location
              </h2>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Store / Shop Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Store Address (Will print on customer thermal receipts)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="e.g. Shop #12, Market Complex, MG Road"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-bold"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Bill & Receipt Settings */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Bill Numbering & POS Receipt Format
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bill Prefix
                  </label>
                  <input
                    type="text"
                    value={formData.invoicePrefix}
                    onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Next Bill Number
                  </label>
                  <input
                    type="number"
                    value={formData.nextInvoiceNumber}
                    onChange={(e) => handleChange('nextInvoiceNumber', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={formData.defaultTaxRate}
                    onChange={(e) => handleChange('defaultTaxRate', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tax Name
                  </label>
                  <input
                    type="text"
                    value={formData.taxName}
                    onChange={(e) => handleChange('taxName', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-bold uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Header Tagline
                </label>
                <input
                  type="text"
                  value={formData.receiptHeader}
                  onChange={(e) => handleChange('receiptHeader', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receipt Footer / Exchange Policy
                </label>
                <input
                  type="text"
                  value={formData.receiptFooter}
                  onChange={(e) => handleChange('receiptFooter', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-mono"
                />
              </div>
            </div>
          )}

          {/* STEP 3: First Product (Optional) */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Your First Product (Optional)
              </h2>
              <p className="text-xs text-slate-500">
                You can add more products and import full CSV catalogs later in the Products module.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Basmati Rice 5kg"
                  value={formData.firstItemName}
                  onChange={(e) => handleChange('firstItemName', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price ({formData.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.firstItemPrice || ''}
                    onChange={(e) => handleChange('firstItemPrice', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.firstItemCategory}
                    onChange={(e) => handleChange('firstItemCategory', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? <span>Saving...</span> : <span>Complete Setup & Enter Store</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
