import { CircleDollarSign, Edit2, Plus, RefreshCw, Search, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../components/DataTable.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Loading } from '../components/Loading.jsx';
import { Modal } from '../components/Modal.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';

const emptyForm = { customerName: '', phone: '', description: '', amount: '', amountPaid: '0', dueDate: '', status: 'OPEN' };
const statuses = ['OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'];
const formatStatus = (status) => status.replaceAll('_', ' ');

export default function Debtors() {
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [params, setParams] = useState({ limit: 100 });
  const { data, loading, error, refetch } = useApi(() => endpoints.debtors(params), [params]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');

  const rows = data?.items || [];
  const openRows = rows.filter((row) => ['OPEN', 'PARTIALLY_PAID'].includes(row.status));

  const openEditor = (row = null) => {
    setEditing(row);
    setForm(row ? {
      customerName: row.customerName,
      phone: row.phone || '',
      description: row.description,
      amount: row.amount,
      amountPaid: row.amountPaid,
      dueDate: row.dueDate ? row.dueDate.slice(0, 10) : '',
      status: row.status
    } : emptyForm);
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) await endpoints.updateDebtor(editing.id, form);
      else await endpoints.createDebtor(form);
      toast.success(editing ? 'Debt record updated' : 'Debt recorded');
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save debt record');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete debt record for ${row.customerName}?`)) return;
    setBusyId(row.id);
    try {
      await endpoints.deleteDebtor(row.id);
      toast.success('Debt record deleted');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete debt record');
    } finally {
      setBusyId('');
    }
  };

  if (loading && !data) return <Loading label="Loading debtors" />;
  if (error || !data) return <EmptyState title="Debtors unavailable" message="Debt records could not be loaded from the API." onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Debtors"
        description="Record and track customers owing for overdrafted food or unpaid restaurant items."
        action={<button className="btn-primary" onClick={() => openEditor()}><Plus size={18} /> Add debtor</button>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard title="Outstanding" value={currency(data.outstanding || 0)} icon={CircleDollarSign} tone="amber" detail="Open and partial balances" />
        <StatCard title="Open records" value={openRows.length} icon={Users} tone="blue" detail="Still owing the restaurant" />
        <StatCard title="Recorded" value={rows.length} icon={CircleDollarSign} detail="Current filtered list" />
      </div>

      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_190px_auto_auto]" onSubmit={(event) => { event.preventDefault(); setParams({ ...filters, limit: 100 }); }}>
        <input className="input" placeholder="Search name, phone, or note" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
        </select>
        <button className="btn-primary"><Search size={17} /> Apply</button>
        <button type="button" className="btn-secondary" onClick={refetch}><RefreshCw size={17} /> Refresh</button>
      </form>

      <DataTable
        rows={rows}
        empty="No debtor records found."
        columns={[
          { key: 'customerName', label: 'Name' },
          { key: 'phone', label: 'Phone', render: (row) => row.phone || 'Not set' },
          { key: 'description', label: 'Reason' },
          { key: 'amount', label: 'Amount', render: (row) => currency(row.amount) },
          { key: 'amountPaid', label: 'Paid', render: (row) => currency(row.amountPaid) },
          { key: 'balance', label: 'Balance', render: (row) => currency(Number(row.amount || 0) - Number(row.amountPaid || 0)) },
          { key: 'status', label: 'Status', render: (row) => <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-500">{formatStatus(row.status)}</span> },
          { key: 'dueDate', label: 'Due', render: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'No date' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <button className="btn-secondary h-8 w-8 p-0" disabled={Boolean(busyId)} onClick={() => openEditor(row)}><Edit2 size={15} /></button>
                <button className="btn-secondary h-8 w-8 p-0" disabled={Boolean(busyId)} onClick={() => remove(row)}>{busyId === row.id ? '...' : <Trash2 size={15} />}</button>
              </div>
            )
          }
        ]}
      />

      <Modal title={editing ? 'Edit debt record' : 'Add debt record'} open={open} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={submit}>
          <input className="input" placeholder="Customer name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
          <input className="input" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <textarea className="input h-24 py-3" placeholder="What was overdrafted or owed?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input" type="number" min="0" step="0.01" placeholder="Amount owed" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <input className="input" type="number" min="0" step="0.01" placeholder="Amount paid" value={form.amountPaid} onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
            </select>
          </div>
          <button className="btn-primary w-full" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update debt' : 'Record debt'}</button>
        </form>
      </Modal>
    </>
  );
}
