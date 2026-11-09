import React, { useState, useEffect } from 'react';
import { StaffAPI } from '../services/endpoints';
import { StaffUser } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  UserCheck,
  Plus,
  ShieldCheck,
  ShieldAlert,
  User,
  History,
  Lock,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const StaffPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'activities'>('members');

  // Add Staff Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, actRes] = await Promise.all([
        StaffAPI.list(),
        StaffAPI.getActivities(),
      ]);
      setStaff(staffRes.data?.data || []);
      setActivities(actRes.data?.data || []);
    } catch (err: any) {
      showToast('Error loading staff records', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) return;

    setIsSubmitting(true);
    try {
      await StaffAPI.create({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim() || undefined,
      });
      showToast('Staff account created successfully', 'success');
      setIsModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      setPhone('');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create staff member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      await StaffAPI.updateStatus(staffId, !currentStatus);
      showToast('Staff status updated', 'success');
      loadData();
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Staff & Permission Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage Store Admins and POS Cashiers, configure access rights, and inspect activity trails
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 px-3 transition border-b-2 ${
            activeTab === 'members'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff Accounts ({staff.length})
        </button>
        <button
          onClick={() => setActiveTab('activities')}
          className={`pb-3 px-3 transition border-b-2 ${
            activeTab === 'activities'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Audit & Activity Logs
        </button>
      </div>

      {/* TAB 1: Staff Accounts Grid */}
      {activeTab === 'members' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => {
            const isAdmin = member.role === 'admin';
            return (
              <div
                key={member.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                          isAdmin
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {member.full_name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isAdmin
                              ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {isAdmin ? 'Store Manager (Admin)' : 'POS Cashier'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        member.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={member.is_active ? 'Active' : 'Disabled'}
                    />
                  </div>

                  {/* Permissions summary */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1 mb-3">
                    <p className="font-bold text-slate-700 dark:text-slate-300">Permissions:</p>
                    {isAdmin ? (
                      <p>Full store access: POS, inventory adjustments, purchase bills, reports, staff management & settings.</p>
                    ) : (
                      <p>POS Billing counter sales, view bill history, search customers, and record returns.</p>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status toggle button */}
                {currentUser?.role === 'admin' && currentUser?.id !== member.id && (
                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => handleToggleStatus(member.id, member.is_active)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                        member.is_active
                          ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      {member.is_active ? 'Deactivate Account' : 'Activate Account'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Activity Logs Table */}
      {activeTab === 'activities' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Audit Trail</h3>
            <p className="text-xs text-slate-500">Recorded staff actions across the system</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {activities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(act.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                      {act.user_name || 'System'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                        {act.user_role || 'system'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {act.action}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {act.entity_type} #{act.entity_id.slice(-6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Staff Account"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Verma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="staff@store.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Role & Permissions *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold"
              >
                <option value="cashier">Cashier (Billing Only)</option>
                <option value="admin">Store Admin (Full Control)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password (min 8 chars) *
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
