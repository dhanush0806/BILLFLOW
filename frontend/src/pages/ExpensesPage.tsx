import React, { useState, useEffect } from 'react';
import { ExpenseAPI } from '../services/endpoints';
import { Expense } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { Pagination } from '../components/common/Pagination';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  TrendingDown,
} from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'supplies',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    description: '',
  });

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, search, startDate, endDate, offset]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await ExpenseAPI.list({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit,
        offset,
      });
      setExpenses(res.data?.data?.expenses || []);
      setTotal(res.data?.data?.total || 0);
      setTotalAmount(res.data?.data?.totalAmount || 0);
    } catch (err) {
      showToast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      title: '',
      category: 'supplies',
      amount: 0,
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'bank_transfer',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setFormData({
      title: exp.title,
      category: exp.category,
      amount: Number(exp.amount),
      expenseDate: new Date(exp.expense_date).toISOString().split('T')[0],
      paymentMethod: exp.payment_method || 'bank_transfer',
      description: exp.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      showToast('Amount must be greater than zero', 'error');
      return;
    }

    try {
      if (editingExpense) {
        await ExpenseAPI.update(editingExpense.id, {
          title: formData.title,
          category: formData.category,
          amount: Number(formData.amount),
          expenseDate: formData.expenseDate,
          paymentMethod: formData.paymentMethod,
          description: formData.description,
        });
        showToast('Expense updated successfully', 'success');
      } else {
        await ExpenseAPI.create({
          ...formData,
          amount: Number(formData.amount),
        });
        showToast('Expense recorded successfully', 'success');
      }
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save expense', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpenseId) return;
    try {
      await ExpenseAPI.delete(deletingExpenseId);
      showToast('Expense deleted successfully', 'info');
      setDeletingExpenseId(null);
      fetchExpenses();
    } catch (err) {
      showToast('Failed to delete expense', 'error');
    }
  };

  const currency = business?.currency || 'USD';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Business Expenses</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track operational costs (rent, utilities, tools, supplies) to compute net cash flow.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Aggregate Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Filtered Outlay
            </p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {currency} {totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {total} expense entries recorded
        </span>
      </div>

      {/* Filter and Date Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setOffset(0);
            }}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500 capitalize"
          >
            <option value="all">All Expense Categories</option>
            <option value="rent">Shop Rent</option>
            <option value="electricity">Electricity</option>
            <option value="transport">Transport</option>
            <option value="salary">Staff Salary</option>
            <option value="maintenance">Maintenance</option>
            <option value="supplies">Store Supplies</option>
            <option value="other">Other Expenses</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setOffset(0);
            }}
            title="Start date"
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setOffset(0);
            }}
            title="End date"
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No Expenses Recorded"
          description="Record business purchases and bills to calculate profit and view expense reports."
          actionText="Add Expense"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-6">Expense Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900 dark:text-white">{exp.title}</p>
                      {exp.description && (
                        <p className="text-[11px] text-slate-400 max-w-sm line-clamp-1 mt-0.5">
                          {exp.description}
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 capitalize">
                        {exp.category}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      {new Date(exp.expense_date).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-4 capitalize">
                      {exp.payment_method?.replace('_', ' ') || 'Bank Transfer'}
                    </td>

                    <td className="py-4 px-4 text-right font-extrabold text-slate-900 dark:text-white">
                      {currency} {Number(exp.amount).toFixed(2)}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingExpenseId(exp.id)}
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

      {/* Add / Edit Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Record Business Expense'}
        description="Log paid expenses for operational reporting."
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              placeholder="e.g. Shop monthly rent, electricity bill, transport or staff salary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 capitalize"
              >
                <option value="rent">Shop Rent</option>
                <option value="electricity">Electricity</option>
                <option value="transport">Transport</option>
                <option value="salary">Staff Salary</option>
                <option value="maintenance">Maintenance</option>
                <option value="supplies">Store Supplies</option>
                <option value="other">Other Expenses</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount ({currency}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 capitalize"
              >
                <option value="bank_transfer">Bank Transfer / ACH</option>
                <option value="card">Card (Debit/Credit)</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Vendor details or reason for outlay"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition"
            >
              {editingExpense ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deletingExpenseId !== null}
        onClose={() => setDeletingExpenseId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense"
        message="Are you sure you want to permanently delete this expense record?"
        confirmText="Delete Expense"
        isDestructive
      />
    </div>
  );
};
