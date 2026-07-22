import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../components/DataTable.jsx';
import { Loading } from '../components/Loading.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Modal } from '../components/Modal.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { endpoints } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';

export default function Users() {
  const { data, loading, error, refetch } = useApi(() => endpoints.users({ limit: 100 }), []);
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    endpoints.roles().then((res) => setRoles(res.data));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) await endpoints.updateUser(editing.id, payload);
      else await endpoints.createUser(payload);
      toast.success(editing ? 'User updated' : 'User created');
      setOpen(false);
      setEditing(null);
      setForm({ name: '', email: '', password: '', roleId: '' });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create user');
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (user = null) => {
    setEditing(user);
    setForm(user ? { name: user.name, email: user.email, password: '', roleId: user.role?.id || user.roleId || '', status: user.status } : { name: '', email: '', password: '', roleId: '', status: 'ACTIVE' });
    setOpen(true);
  };

  const remove = async (user) => {
    if (!confirm(`Delete ${user.name}?`)) return;
    setDeletingId(user.id);
    try {
      await endpoints.deleteUser(user.id);
      toast.success('User deleted');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete user');
    } finally {
      setDeletingId('');
    }
  };

  if (loading) return <Loading label="Loading users" />;
  if (error || !data) return <EmptyState title="Users unavailable" message="Users and roles could not be loaded. Confirm your account has admin permissions." onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Users and roles" description="Manage team access, status, and role permissions." action={<button className="btn-primary" onClick={() => openEditor()}><Plus size={18} /> Add user</button>} />
      <DataTable
        rows={data.items || []}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (row) => row.role?.name },
          {
            key: 'status',
            label: 'Status',
            render: (row) => row.status === 'ACTIVE'
              ? <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">Active</span>
              : <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600">Inactive</span>
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <button className="btn-secondary h-8 w-8 p-0" disabled={Boolean(deletingId)} onClick={() => openEditor(row)}><Edit2 size={15} /></button>
                <button className="btn-secondary h-8 w-8 p-0" disabled={Boolean(deletingId)} onClick={() => remove(row)}>{deletingId === row.id ? '...' : <Trash2 size={15} />}</button>
              </div>
            )
          }
        ]}
      />
      <div className="mt-5 card p-4">
        <h2 className="font-bold">Roles</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {roles.map((role) => (
            <span key={role.id} className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">{role.name}</span>
          ))}
        </div>
      </div>
      <Modal title={editing ? 'Edit user' : 'Add user'} open={open} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={submit}>
          <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" placeholder={editing ? 'New password optional' : 'Password'} type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
          <select className="input" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} required>
            <option value="">Select role</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
          {editing ? (
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          ) : null}
          <button className="btn-primary w-full" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update user' : 'Create user'}</button>
        </form>
      </Modal>
    </>
  );
}
