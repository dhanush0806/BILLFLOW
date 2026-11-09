import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerAPI } from '../services/endpoints';
import { Customer } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  Eye,
  Edit2,
  Trash2,
  Building,
  User,
  Key,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('all');
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    customerType: 'individual' as 'individual' | 'business',
    taxNumber: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [search, customerType, offset]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await CustomerAPI.list({
        search: search || undefined,
        type: customerType !== 'all' ? customerType : undefined,
        limit,
        offset,
      });
      setCustomers(res.data?.data?.customers || []);
      setTotal(res.data?.data?.total || 0);
    } catch (err) {
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      customerType: 'individual',
      taxNumber: '',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      customerType: c.customer_type,
      taxNumber: c.tax_number || '',
      notes: c.notes || '',
    });
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await CustomerAPI.update(editingCustomer.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          customer_type: formData.customerType,
          tax_number: formData.taxNumber,
          notes: formData.notes,
        });
        showToast('Customer updated successfully', 'success');
        setEditingCustomer(null);
      } else {
        await CustomerAPI.create(formData);
        showToast('Customer created successfully', 'success');
        setIsAddModalOpen(false);
      }
      fetchCustomers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save customer', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCustomerId) return;
    try {
      const res = await CustomerAPI.delete(deletingCustomerId);
      showToast(res.data.message || 'Customer deleted', 'info');
      setDeletingCustomerId(null);
      fetchCustomers();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete customer', 'error');
    }
  };

  const currency = business?.currency || 'USD';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Customer Directory</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage your client contacts, invoice history, and customer portal accounts.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={customerType}
            onChange={(e) => {
              setCustomerType(e.target.value);
              setOffset(0);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500 transition"
          >
            <option value="all">All Types</option>
            <option value="individual">Individual</option>
            <option value="business">Company / Business</option>
          </select>
        </div>
      </div>

      {/* Customer Table */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Customers Found"
          description={
            search
              ? 'No customer records match your filter criteria.'
              : 'Add your first customer to generate and issue invoices.'
          }
          actionText="Add New Customer"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4 text-right">Total Invoices</th>
                  <th className="py-3.5 px-4 text-right">Outstanding</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 font-bold flex items-center justify-center shrink-0">
                          {c.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                          {c.tax_number && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Tax: {c.tax_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> {c.email}
                      </p>
                      {c.phone && (
                        <p className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <Phone className="w-3.5 h-3.5" /> {c.phone}
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200">
                        {c.customer_type === 'business' ? (
                          <Building className="w-3 h-3 text-slate-500" />
                        ) : (
                          <User className="w-3 h-3 text-slate-500" />
                        )}
                        <span className="capitalize">{c.customer_type}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {c.total_invoices || 0}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <span
                        className={`font-bold ${
                          Number(c.outstanding_balance || 0) > 0
                            ? 'text-amber-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {currency} {Number(c.outstanding_balance || 0).toFixed(2)}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          title="View Invoices & Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Customer"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCustomerId(c.id)}
                          title="Delete / Archive"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            total={total}
            limit={limit}
            offset={offset}
            onPageChange={setOffset}
          />
        </div>
      )}

      {/* Create / Edit Customer Modal */}
      <Modal
        isOpen={isAddModalOpen || editingCustomer !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        description="Fill in customer billing details for invoices."
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer / Organization Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              placeholder="e.g. Acme Innovations Corp"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                placeholder="customer@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer Category
              </label>
              <select
                value={formData.customerType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customerType: e.target.value as 'individual' | 'business',
                  })
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="individual">Individual Customer</option>
                <option value="business">Business / Corporate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tax ID / GSTIN / VAT (Optional)
              </label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                placeholder="Tax registration ID"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Billing Address
            </label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              placeholder="Full billing address"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Notes / Loyalty Info
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              placeholder="e.g. Regular walk-in, preferred brands, credit terms"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingCustomer(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition"
            >
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Safe Archive Confirmation */}
      <ConfirmDialog
        isOpen={deletingCustomerId !== null}
        onClose={() => setDeletingCustomerId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer"
        message="Are you sure you want to remove this customer? If existing invoices or payments are linked, the customer will be safely archived instead to protect financial audit trails."
        confirmText="Confirm Delete / Archive"
        isDestructive
      />
    </div>
  );
};
