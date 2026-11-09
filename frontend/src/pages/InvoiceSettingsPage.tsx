import React, { useState, useEffect } from 'react';
import { BusinessAPI } from '../services/endpoints';
import { useToast } from '../context/ToastContext';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Sliders, Save } from 'lucide-react';

export const InvoiceSettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    invoicePrefix: 'INV-',
    nextInvoiceNumber: 1,
    defaultDueDays: 14,
    defaultTaxRate: 0,
    defaultNotes: 'Thank you for your business!',
    defaultTerms: 'Payment due within terms.',
    bankName: '',
    accountNumber: '',
    routingOrIfsc: '',
    upiId: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await BusinessAPI.getSettings();
      const s = res.data?.data;
      if (s) {
        setFormData({
          invoicePrefix: s.invoice_prefix || 'INV-',
          nextInvoiceNumber: s.next_invoice_number || 1,
          defaultDueDays: s.default_due_days || 14,
          defaultTaxRate: Number(s.default_tax_rate) || 0,
          defaultNotes: s.default_notes || 'Thank you for your business!',
          defaultTerms: s.default_terms || 'Payment due within terms.',
          bankName: s.bank_name || '',
          accountNumber: s.account_number || '',
          routingOrIfsc: s.routing_or_ifsc || '',
          upiId: s.upi_id || '',
        });
      }
    } catch (err) {
      showToast('Failed to load invoice preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await BusinessAPI.updateSettings({
        invoicePrefix: formData.invoicePrefix,
        nextInvoiceNumber: Number(formData.nextInvoiceNumber),
        defaultDueDays: Number(formData.defaultDueDays),
        defaultTaxRate: Number(formData.defaultTaxRate),
        defaultNotes: formData.defaultNotes,
        defaultTerms: formData.defaultTerms,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        routingOrIfsc: formData.routingOrIfsc,
        upiId: formData.upiId,
      });
      showToast('Invoice settings saved successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton rows={5} />;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Invoice Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Set up invoice numbering prefixes, default payment terms, tax rate defaults, and bank details.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Prefix & Sequencing */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Sequential Numbering
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Number Prefix <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.invoicePrefix}
                  onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Next Sequence Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={formData.nextInvoiceNumber}
                  onChange={(e) => setFormData({ ...formData, nextInvoiceNumber: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Terms & Taxes */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Terms & Tax Defaults
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Payment Due Terms (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.defaultDueDays}
                  onChange={(e) => setFormData({ ...formData, defaultDueDays: parseInt(e.target.value, 10) || 14 })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Sales Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={formData.defaultTaxRate}
                  onChange={(e) => setFormData({ ...formData, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Remittance Banking Info */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Remittance Banking Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. JPMorgan Chase"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account / IBAN Number
                </label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Account number"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Routing / IFSC / Sort Code
                </label>
                <input
                  type="text"
                  value={formData.routingOrIfsc}
                  onChange={(e) => setFormData({ ...formData, routingOrIfsc: e.target.value })}
                  placeholder="Routing number"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  UPI ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  placeholder="e.g. business@bank"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Customer Note
              </label>
              <textarea
                rows={2}
                value={formData.defaultNotes}
                onChange={(e) => setFormData({ ...formData, defaultNotes: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={formData.defaultTerms}
                onChange={(e) => setFormData({ ...formData, defaultTerms: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm transition hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
