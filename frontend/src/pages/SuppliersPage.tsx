import React, { useState, useEffect } from 'react';
import { SupplierAPI } from '../services/endpoints';
import { Supplier, SupplierPayment } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Building,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Edit2,
  Trash2,
  History,
  FileText,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const SuppliersPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Payment History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await SupplierAPI.list({ limit: 100 });
      setSuppliers(res.data?.data?.suppliers || []);
    } catch (err: any) {
      showToast('Error loading suppliers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setTaxId('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setName(s.name);
    setCompanyName(s.company_name || '');
    setEmail(s.email || '');
    setPhone(s.phone || '');
    setAddress(s.address || '');
    setTaxId(s.tax_id || '');
    setNotes(s.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        companyName: companyName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        taxId: taxId.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingSupplier) {
        await SupplierAPI.update(editingSupplier.id, payload);
        showToast('Supplier updated successfully', 'success');
      } else {
        await SupplierAPI.create(payload);
        showToast('Supplier added successfully', 'success');
      }
      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save supplier', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPayment = (s: Supplier) => {
    setPayingSupplier(s);
    setPaymentAmount(Number(s.outstanding_balance || 0));
    setPaymentReference('');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSupplier || paymentAmount <= 0) return;

    setIsSaving(true);
    try {
      await SupplierAPI.recordPayment(payingSupplier.id, {
        paymentDate,
        amount: paymentAmount,
        paymentMethod,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });
      showToast('Supplier payment recorded successfully', 'success');
      setIsPaymentModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record payment', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenHistory = async (s: Supplier) => {
    setHistorySupplier(s);
    try {
      const res = await SupplierAPI.getPayments(s.id);
      setSupplierPayments(res.data?.data || []);
      setIsHistoryModalOpen(true);
    } catch (err) {
      showToast('Error loading payment history', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await SupplierAPI.archive(deletingId);
      showToast('Supplier archived successfully', 'success');
      setDeletingId(null);
      loadSuppliers();
    } catch (err) {
      showToast('Error archiving supplier', 'error');
    }
  };

  const currency = business?.currency || '₹';

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.company_name && s.company_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Supplier Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain wholesale supplier contacts, track purchase history, and record outstanding payable balances
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Total: {filteredSuppliers.length} Suppliers
        </span>
      </div>

      {/* Suppliers Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading suppliers...</div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Building className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-sm">No suppliers registered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {s.name}
                    </h3>
                    {s.company_name && (
                      <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                        {s.company_name}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {s.total_purchases || 0} POs
                  </span>
                </div>

                {/* Contact information */}
                <div className="space-y-1.5 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{s.address}</span>
                    </div>
                  )}
                  {s.tax_id && (
                    <p className="text-[11px] font-mono text-slate-400 mt-1">
                      GSTIN/Tax ID: {s.tax_id}
                    </p>
                  )}
                </div>

                {/* Outstanding balance card */}
                <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Payable Balance:</span>
                  <span
                    className={`font-extrabold text-sm ${
                      s.outstanding_balance > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {currency} {Number(s.outstanding_balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenHistory(s)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Payment history"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Edit supplier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(s.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Archive supplier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleOpenPayment(s)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay Supplier</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Suresh Mehta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company / Trade Name
              </label>
              <input
                type="text"
                placeholder="e.g. Apex FMCG Wholesalers"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+91 98450 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="orders@wholesaler.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supplier Warehouse / Office Address
            </label>
            <input
              type="text"
              placeholder="e.g. Plot 44, APMC Market Yard"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                placeholder="GSTIN29ABCDE1234F1Z5"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="Payment terms, delivery days..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
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
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment to ${payingSupplier?.name}`}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-500">Current Outstanding Balance:</span>
            <span className="font-extrabold text-rose-600 text-sm">
              {currency} {Number(payingSupplier?.outstanding_balance || 0).toFixed(2)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Amount ({currency}) *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transaction / Cheque Reference
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-99881122 or Cheque #49201"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Note: Records external payment transaction only. Deducts from supplier balance.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 rounded-xl border text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || paymentAmount <= 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs disabled:opacity-50"
            >
              {isSaving ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PAYMENT HISTORY MODAL */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Payment History: ${historySupplier?.name}`}
      >
        <div className="space-y-3">
          {supplierPayments.length === 0 ? (
            <p className="text-center text-slate-400 py-6 text-xs">No payments recorded yet</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {supplierPayments.map((p) => (
                <div key={p.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {currency} {Number(p.amount).toFixed(2)} via{' '}
                      <span className="uppercase font-semibold text-emerald-600">{p.payment_method}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(p.payment_date).toLocaleDateString()}
                      {p.reference && ` | Ref: ${p.reference}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400">{p.recorder_name || 'Admin'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Archive Supplier"
        message="Are you sure you want to archive this supplier? Their purchase history will remain intact."
        confirmText="Archive"
        variant="danger"
      />
    </div>
  );
};
