import { useEffect, useState, useCallback } from 'react';
import { Plus, X, Trash2, Edit2, ShieldCheck, Lock } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, unlockUser } from '../../api/admin';
import PageHeader from '../../components/shared/PageHeader';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

const ALL_ROLES = [
  { value: 'FLEET_MANAGER',    label: 'Fleet Manager',     color: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  { value: 'DISPATCHER',       label: 'Dispatcher',        color: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  { value: 'SAFETY_OFFICER',   label: 'Safety Officer',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  { value: 'FINANCIAL_ANALYST',label: 'Financial Analyst', color: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
  { value: 'DRIVER',           label: 'Driver (Portal)',   color: 'bg-slate-500/15 text-slate-400 border-slate-500/25' },
  { value: 'ADMIN',            label: 'Admin',             color: 'bg-red-500/15 text-red-400 border-red-500/25' },
];

const ROLE_MAP = Object.fromEntries(ALL_ROLES.map(r => [r.value, r]));

const EMPTY_FORM = { name: '', email: '', password: '', role: 'DISPATCHER' };

function RoleBadge({ role }) {
  const r = ROLE_MAP[role];
  if (!r) return <span className="text-xs text-slate-500">{role}</span>;
  return (
    <span className={cn('text-[11px] font-semibold px-2.5 py-0.5 rounded-full border', r.color)}>
      {r.label}
    </span>
  );
}

export default function UserManagementPage() {
  const { user: me } = useAuth();
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [roleFilter,  setRoleFilter]  = useState('');
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [deleteTarget,setDeleteTarget]= useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getUsers();
      setUsers(res.data.data ?? []);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setDrawerOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, role: form.role };
      if (!editing) payload.password = form.password;
      else if (form.password) payload.password = form.password;

      if (editing) {
        await updateUser(editing.id, payload);
        toast.success(`${form.name}'s account updated.`);
      } else {
        await createUser(payload);
        toast.success(`${form.name} added as ${ROLE_MAP[form.role]?.label ?? form.role}.`);
      }
      setDrawerOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      toast.success(`${deleteTarget.name} removed.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to delete user.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleUnlock = async (u) => {
    try {
      await unlockUser(u.id);
      toast.success(`${u.name}'s account unlocked.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to unlock.');
    }
  };

  const displayed = roleFilter
    ? users.filter(u => u.role === roleFilter)
    : users;

  const inputCls = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all';

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="User Management"
        subtitle="Create and manage platform user accounts and roles"
        action={
          <button onClick={openCreate} className="flex items-center gap-2 btn-amber">
            <Plus className="w-4 h-4" /> Add User
          </button>
        }
      />

      {/* Role filter pills */}
      <div className="flex flex-wrap gap-2 items-center">
        {[{ value: '', label: 'All Roles' }, ...ALL_ROLES].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setRoleFilter(value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
              roleFilter === value
                ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.35)]'
                : 'text-slate-400 border-white/10 bg-white/5 hover:bg-white/10'
            )}
          >
            {label}
          </button>
        ))}
        {displayed.length > 0 && (
          <span className="text-[11px] text-slate-600 ml-1">{displayed.length} user{displayed.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <EmptyState type="error" title="Could not load users" message={error}
          action={<button onClick={fetchUsers} className="text-sm text-amber-400 hover:underline">Retry</button>} />
      ) : displayed.length === 0 ? (
        <EmptyState title="No users found" message={roleFilter ? 'No users with this role.' : 'Add the first user to get started.'} />
      ) : (
        <div className="devpulse-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="thead-row">
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {displayed.map((u) => {
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id} className="tbody-row">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                            {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span className="text-slate-200 font-medium text-xs">{u.name}</span>
                          {isMe && (
                            <span className="text-[10px] text-amber-400/70 font-medium">(you)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs font-mono">{u.email}</td>
                      <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-5 py-3 text-[#888] text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {u.lockedUntil && (
                            <button
                              onClick={() => handleUnlock(u)}
                              title="Account locked — click to unlock"
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Edit user"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isMe && (
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md glass-panel border-l border-white/5 overflow-y-auto p-6 space-y-5 animate-slide-in-right">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">
                  {editing ? 'Edit User' : 'New User'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editing ? 'Update name, email, or role' : 'Create a portal account with any role'}
                </p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Full Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Arjun Sharma"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="e.g. arjun@transitops.in"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">
                  Password {editing ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editing}
                  minLength={6}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? '••••••  (unchanged)' : 'Min. 6 characters'}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map(({ value, label, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, role: value }))}
                      className={cn(
                        'px-3 py-2.5 rounded-xl text-xs font-semibold border text-left transition-all',
                        form.role === value
                          ? `${color} ring-2 ring-amber-500/40`
                          : 'border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3" />
                        {label}
                      </div>
                    </button>
                  ))}
                </div>
                {form.role === 'DRIVER' && (
                  <p className="text-[11px] text-amber-400/80 mt-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                    Driver portal access only — no ERP modules visible
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setDrawerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm border border-white/10 text-slate-300 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm btn-amber disabled:opacity-50">
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user account?"
        message={deleteTarget ? `${deleteTarget.name} (${ROLE_MAP[deleteTarget.role]?.label}) will be permanently removed. This cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
      />
    </div>
  );
}
