import { Edit2, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
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
  const emptyForm = { name: '', price: '', categoryId: '', description: '', imageUrl: '', isAvailable: true, variations: [] };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    endpoints.menuCategories().then((res) => setCategories(res.data));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) await endpoints.updateMenuItem(editing.id, form);
      else await endpoints.createMenuItem(form);
      toast.success(editing ? 'Menu item updated' : 'Menu item added');
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save menu item');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading image...');
    try {
      const uploadData = new FormData();
      uploadData.append('image', file);
      uploadData.append('folder', 'restaurant-system/menu');
      const response = await endpoints.uploadImage(uploadData, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
          if (progress >= 100) setUploadStatus('Finishing upload...');
        }
      });
      setForm((current) => ({ ...current, imageUrl: response.data.url }));
      setUploadProgress(100);
      setUploadStatus('Image uploaded');
      toast.success('Image uploaded');
    } catch (error) {
      setUploadStatus('Upload failed');
      toast.error(error.response?.data?.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const openEditor = (item = null) => {
    setEditing(item);
    setForm(item ? { name: item.name, price: item.price, categoryId: item.categoryId, description: item.description || '', imageUrl: item.imageUrl || '', isAvailable: item.isAvailable, variations: Array.isArray(item.variations) ? item.variations : [] } : emptyForm);
    setUploadProgress(0);
    setUploadStatus('');
    setOpen(true);
  };

  const updateVariation = (index, field, value) => {
    setForm((current) => ({
      ...current,
      variations: current.variations.map((variation, variationIndex) => (variationIndex === index ? { ...variation, [field]: value } : variation))
    }));
  };

  const addVariation = () => {
    setForm((current) => ({ ...current, variations: [...current.variations, { name: '', price: current.price || '' }] }));
  };

  const removeVariation = (index) => {
    setForm((current) => ({ ...current, variations: current.variations.filter((_, variationIndex) => variationIndex !== index) }));
  };

  const toggleAvailability = async (item) => {
    setBusyId(item.id);
    try {
      await endpoints.updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      toast.success(item.isAvailable ? 'Product hidden' : 'Product available');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update item');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    setBusyId(item.id);
    try {
      await endpoints.deleteMenuItem(item.id);
      toast.success('Menu item deleted');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete item');
    } finally {
      setBusyId('');
    }
  };

  if (loading) return <Loading label="Loading menu" />;
  if (error || !data) return <EmptyState title="Menu unavailable" message="Menu items could not be loaded from the API." onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Menu management"
        description="Create dishes, set prices, upload visuals, and control public availability."
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
          {
            key: 'variations',
            label: 'Type',
            render: (row) => Array.isArray(row.variations) && row.variations.length
              ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{row.variations.length} variations</span>
              : <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">Standard</span>
          },
          {
            key: 'isAvailable',
            label: 'Status',
            render: (row) => row.isAvailable
              ? <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">Available</span>
              : <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-black text-brand-500">Hidden</span>
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <button className="btn-secondary h-8 w-8 p-0" disabled={Boolean(busyId)} onClick={() => toggleAvailability(row)} title={row.isAvailable ? 'Hide product' : 'Show product'}>
                  {busyId === row.id ? '...' : row.isAvailable ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button className="btn-secondary h-8 w-8 p-0" disabled={Boolean(busyId)} onClick={() => openEditor(row)}><Edit2 size={15} /></button>
                <button className="btn-secondary h-8 w-8 p-0" disabled={Boolean(busyId)} onClick={() => remove(row)}><Trash2 size={15} /></button>
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
          <div className="rounded-xl border border-[#dbe5e8] bg-brand-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="label">Meal variations</label>
                <p className="mt-1 text-xs font-semibold text-stone-500">Use this for meals like With fish or With chicken. Leave empty for a normal meal.</p>
              </div>
              <button className="btn-secondary h-9 px-3" type="button" onClick={addVariation}><Plus size={15} /> Add</button>
            </div>
            {form.variations.length ? (
              <div className="mt-3 grid gap-2">
                {form.variations.map((variation, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_130px_36px]">
                    <input className="input h-10" placeholder="Variation name" value={variation.name} onChange={(e) => updateVariation(index, 'name', e.target.value)} />
                    <input className="input h-10" type="number" min="0" step="0.01" placeholder="Price" value={variation.price} onChange={(e) => updateVariation(index, 'price', e.target.value)} />
                    <button className="btn-secondary h-10 w-10 p-0" type="button" onClick={() => removeVariation(index)} aria-label="Remove variation"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <label className="label">Product image</label>
            <div className="mt-1 grid gap-3 sm:grid-cols-[96px_1fr]">
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-xl border border-[#dbe5e8] bg-brand-50">
                {form.imageUrl ? <img className="h-full w-full object-cover" src={form.imageUrl} alt="Menu item preview" /> : <Plus className="text-brand-500" size={24} />}
              </div>
              <label className="flex min-h-24 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-[#dbe5e8] bg-white px-4 text-sm font-semibold text-[#6f7a86] hover:border-brand-500">
                <span className="font-black text-[#151923]">{uploading ? uploadStatus : form.imageUrl ? 'Image uploaded' : 'Upload image'}</span>
                <span className="mt-1 text-xs">PNG, JPG, or WEBP up to 5MB.</span>
                <input className="hidden" type="file" accept="image/*" disabled={uploading} onChange={(e) => uploadImage(e.target.files?.[0])} />
                {uploading || uploadStatus ? (
                  <span className="mt-3 block h-2 overflow-hidden rounded-full bg-stone-100">
                    <span className="block h-full rounded-full bg-brand-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </span>
                ) : null}
              </label>
            </div>
          </div>
          <label className="flex items-center justify-between rounded-xl bg-brand-50 p-3">
            <span>
              <span className="block text-sm font-black text-stone-900">Available to sell</span>
              <span className="text-xs font-semibold text-stone-500">Turn off to hide from POS and online ordering.</span>
            </span>
            <input className="h-5 w-5 accent-brand-500" type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
          </label>
          <button className="btn-primary w-full" disabled={saving || uploading}>{saving ? 'Saving...' : editing ? 'Update item' : 'Save item'}</button>
        </form>
      </Modal>
    </>
  );
}
