import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../components/DataTable.jsx';
import { Loading } from '../components/Loading.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Modal } from '../components/Modal.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';

export default function Menu() {
  const { data, loading, error, refetch } = useApi(() => endpoints.menuItems({ limit: 100 }), []);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', categoryId: '', description: '', imageUrl: '' });

  useEffect(() => {
    endpoints.menuCategories().then((res) => setCategories(res.data));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (editing) await endpoints.updateMenuItem(editing.id, form);
      else await endpoints.createMenuItem(form);
      toast.success(editing ? 'Menu item updated' : 'Menu item added');
      setOpen(false);
      setEditing(null);
      setForm({ name: '', price: '', categoryId: '', description: '', imageUrl: '' });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save menu item');
    }
  };

  const openEditor = (item = null) => {
    setEditing(item);
    setForm(item ? { name: item.name, price: item.price, categoryId: item.categoryId, description: item.description || '', imageUrl: item.imageUrl || '' } : { name: '', price: '', categoryId: '', description: '', imageUrl: '' });
    setOpen(true);
  };

  const remove = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    await endpoints.deleteMenuItem(item.id);
    toast.success('Menu item deleted');
    refetch();
  };

  if (loading) return <Loading label="Loading menu" />;
  if (error || !data) return <EmptyState title="Menu unavailable" message="Menu items could not be loaded from the API." onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Menu management"
        description="Create dishes, set prices, and organize categories."
        action={<button className="btn-primary" onClick={() => openEditor()}><Plus size={18} /> Add item</button>}
      />
      <DataTable
        rows={data.items || []}
        columns={[
          {
            key: 'name',
            label: 'Item',
            render: (row) => (
              <div className="flex items-center gap-3">
                <img className="h-12 w-12 rounded-lg object-cover" src={row.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80'} alt={row.name} />
                <span className="font-semibold">{row.name}</span>
              </div>
            )
          },
          { key: 'category', label: 'Category', render: (row) => row.category?.name },
          { key: 'price', label: 'Price', render: (row) => currency(row.price) },
          { key: 'isAvailable', label: 'Status', render: (row) => (row.isAvailable ? 'Available' : 'Hidden') },
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
      <Modal title={editing ? 'Edit menu item' : 'Add menu item'} open={open} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Name</label>
            <input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Price</label>
              <input className="input mt-1" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input mt-1" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                <option value="">Select category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input mt-1 h-24 py-3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Product image URL</label>
            <input className="input mt-1" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
          </div>
          <button className="btn-primary w-full">{editing ? 'Update item' : 'Save item'}</button>
        </form>
      </Modal>
    </>
  );
}
