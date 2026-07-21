import { Edit2, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../components/DataTable.jsx';
import { Loading } from '../components/Loading.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Modal } from '../components/Modal.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';

export default function Stock() {
  const { data, loading, error, refetch } = useApi(() => endpoints.stockItems({ limit: 100 }), []);
  const movements = useApi(() => endpoints.stockMovements(), []);
  const [open, setOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', unit: 'kg', quantity: '', reorderLevel: '', unitCost: '' });
  const [movementForm, setMovementForm] = useState({ stockItemId: '', type: 'IN', quantity: '', note: '' });

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (editing) await endpoints.updateStockItem(editing.id, form);
      else await endpoints.createStockItem(form);
      toast.success(editing ? 'Stock item updated' : 'Stock item added');
      setOpen(false);
      setEditing(null);
      setForm({ name: '', unit: 'kg', quantity: '', reorderLevel: '', unitCost: '' });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save stock item');
    }
  };

  const submitMovement = async (event) => {
    event.preventDefault();
    try {
      await endpoints.stockMovement(movementForm);
      toast.success('Stock movement recorded');
      setMovementOpen(false);
      setMovementForm({ stockItemId: '', type: 'IN', quantity: '', note: '' });
      refetch();
      movements.refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not record stock movement');
    }
  };

  const openEditor = (item = null) => {
    setEditing(item);
    setForm(item ? { name: item.name, unit: item.unit, quantity: item.quantity, reorderLevel: item.reorderLevel, unitCost: item.unitCost } : { name: '', unit: 'kg', quantity: '', reorderLevel: '', unitCost: '' });
    setOpen(true);
  };

  const remove = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    await endpoints.deleteStockItem(item.id);
    toast.success('Stock item deleted');
    refetch();
  };

  if (loading) return <Loading label="Loading stock" />;
  if (error || !data) return <EmptyState title="Stock unavailable" message="Stock items could not be loaded from the API." onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Stock management"
        description="Track quantities, reorder levels, suppliers, movements, and unit costs."
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => setMovementOpen(true)}><PackagePlus size={18} /> Movement</button>
            <button className="btn-primary" onClick={() => openEditor()}><Plus size={18} /> Add stock</button>
          </div>
        }
      />
      <DataTable
        rows={data.items || []}
        columns={[
          { key: 'name', label: 'Item' },
          { key: 'quantity', label: 'Quantity', render: (row) => `${Number(row.quantity)} ${row.unit}` },
          {
            key: 'status',
            label: 'Status',
            render: (row) => Number(row.quantity) <= Number(row.reorderLevel)
              ? <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-black text-brand-500">Low</span>
              : <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-black text-green-700">Healthy</span>
          },
          { key: 'reorderLevel', label: 'Reorder level', render: (row) => `${Number(row.reorderLevel)} ${row.unit}` },
          { key: 'unitCost', label: 'Unit cost', render: (row) => currency(row.unitCost) },
          { key: 'supplier', label: 'Supplier', render: (row) => row.supplier?.name || '-' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <button className="btn-secondary h-8 w-8 p-0" onClick={() => openEditor(row)}><Edit2 size={15} /></button>
                <button className="btn-secondary h-8 w-8 p-0" onClick={() => remove(row)}><Trash2 size={15} /></button>
              </div>
            )
          }
        ]}
      />
      <div className="mt-5">
        <h2 className="mb-3 font-black">Recent stock movements</h2>
        <DataTable
          rows={movements.data?.items || []}
          empty="No stock movements yet"
          columns={[
            { key: 'stockItem', label: 'Item', render: (row) => row.stockItem?.name },
            { key: 'type', label: 'Type' },
            { key: 'quantity', label: 'Quantity', render: (row) => `${Number(row.quantity)} ${row.stockItem?.unit || ''}` },
            { key: 'note', label: 'Note', render: (row) => row.note || '-' }
          ]}
        />
      </div>
      <Modal title={editing ? 'Edit stock item' : 'Add stock item'} open={open} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Name</label>
            <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['unit', 'quantity', 'reorderLevel', 'unitCost'].map((field) => (
              <div key={field}>
                <label className="label">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input className="input mt-1" type={field === 'unit' ? 'text' : 'number'} step="0.001" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required />
              </div>
            ))}
          </div>
          <button className="btn-primary w-full">{editing ? 'Update stock' : 'Save stock'}</button>
        </form>
      </Modal>
      <Modal title="Record stock movement" open={movementOpen} onClose={() => setMovementOpen(false)}>
        <form className="space-y-4" onSubmit={submitMovement}>
          <div>
            <label className="label">Stock item</label>
            <select className="input mt-1" value={movementForm.stockItemId} onChange={(e) => setMovementForm({ ...movementForm, stockItemId: e.target.value })} required>
              <option value="">Select item</option>
              {(data.items || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Type</label>
              <select className="input mt-1" value={movementForm.type} onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}>
                <option value="IN">Stock in</option>
                <option value="OUT">Stock out</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input mt-1" type="number" min="0.001" step="0.001" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Note</label>
            <textarea className="input mt-1 h-20 py-3" value={movementForm.note} onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })} />
          </div>
          <button className="btn-primary w-full">Record movement</button>
        </form>
      </Modal>
    </>
  );
}
