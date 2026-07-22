import { CheckCircle2, Edit2, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../components/DataTable.jsx';
import { Loading } from '../components/Loading.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Modal } from '../components/Modal.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { endpoints } from '../services/api.js';
import { compactDate, currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';

const emptyForm = { title: '', amount: '', categoryId: '', note: '' };

export default function Expenses() {
  const { data, loading, error, refetch } = useApi(() => endpoints.expenses({ limit: 100 }), []);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  const loadCategories = () => endpoints.expenseCategories().then((res) => setCategories(res.data));

  useEffect(() => {
    loadCategories().catch(() => toast.error('Could not load expense categories'));
  }, []);

  const resetUploadState = () => {
    setFile(null);
    setUploadProgress(0);
    setUploadStatus('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setUploadProgress(0);
    setUploadStatus(file ? 'Uploading receipt...' : '');
    try {
      let receiptUrl = '';
      if (file) {
        const uploadData = new FormData();
        uploadData.append('receipt', file);
        const upload = await endpoints.uploadReceipt(uploadData, {
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
            if (progress >= 100) setUploadStatus('Finishing upload...');
          }
        });
        receiptUrl = upload.data.url;
        setUploadProgress(100);
        setUploadStatus('Receipt uploaded');
      }

      if (editing) await endpoints.updateExpense(editing.id, { ...form, ...(receiptUrl ? { receiptUrl } : {}) });
      else await endpoints.createExpense({ ...form, receiptUrl });

      toast.success(editing ? 'Expense updated' : 'Expense recorded');
      setOpen(false);
      setEditing(null);
      resetUploadState();
      setForm(emptyForm);
      refetch();
    } catch (error) {
      setUploadStatus(file ? 'Upload or save failed' : '');
      toast.error(error.response?.data?.message || 'Could not save expense');
    } finally {
      setSaving(false);
    }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return toast.error('Enter a category name');
    setCreatingCategory(true);
    try {
      const response = await endpoints.createExpenseCategory({ name: newCategoryName.trim() });
      setCategories((current) => [...current, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({ ...current, categoryId: response.data.id }));
      setNewCategoryName('');
      toast.success('Category added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not add category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const openEditor = (expense = null) => {
    setEditing(expense);
    setForm(expense ? { title: expense.title, amount: expense.amount, categoryId: expense.categoryId, note: expense.note || '' } : emptyForm);
    resetUploadState();
    setOpen(true);
  };

  const remove = async (expense) => {
    if (!confirm(`Delete ${expense.title}?`)) return;
    setDeletingId(expense.id);
    try {
      await endpoints.deleteExpense(expense.id);
      toast.success('Expense deleted');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete expense');
    } finally {
      setDeletingId('');
    }
  };

  if (loading) return <Loading label="Loading expenses" />;
  if (error || !data) return <EmptyState title="Expenses unavailable" message="Expenses could not be loaded from the API." onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Expenses" description="Record, edit, delete, and review operating costs with receipts." action={<button className="btn-primary" onClick={() => openEditor()}><Plus size={18} /> Add expense</button>} />
      <DataTable
        rows={data.items || []}
        columns={[
          { key: 'title', label: 'Expense' },
          { key: 'category', label: 'Category', render: (row) => row.category?.name },
          { key: 'amount', label: 'Amount', render: (row) => currency(row.amount) },
          { key: 'expenseDate', label: 'Date', render: (row) => compactDate(row.expenseDate) },
          { key: 'receiptUrl', label: 'Receipt', render: (row) => (row.receiptUrl ? <a className="font-black text-brand-500" href={row.receiptUrl} target="_blank">View</a> : '-') },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <button className="btn-secondary h-8 w-8 p-0" disabled={Boolean(deletingId)} onClick={() => openEditor(row)} aria-label={`Edit ${row.title}`}><Edit2 size={15} /></button>
                <button className="btn-secondary h-8 w-8 p-0" disabled={Boolean(deletingId)} onClick={() => remove(row)} aria-label={`Delete ${row.title}`}>
                  {deletingId === row.id ? '...' : <Trash2 size={15} />}
                </button>
              </div>
            )
          }
        ]}
      />
      <Modal title={editing ? 'Edit expense' : 'Add expense'} open={open} onClose={() => setOpen(false)}>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="label">Title</label>
            <input className="input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Amount</label>
              <input className="input mt-1" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input mt-1" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                <option value="">Select category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              {!categories.length ? <p className="mt-1 text-xs font-medium text-amber-700">Add an expense category before saving.</p> : null}
            </div>
          </div>
          <div className="rounded-xl border border-[#dbe5e8] bg-stone-50 p-3">
            <label className="label">Add expense category</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input className="input" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Example: Utilities" />
              <button className="btn-secondary" type="button" disabled={creatingCategory} onClick={createCategory}>
                <Plus size={16} /> {creatingCategory ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Note</label>
            <textarea className="input mt-1 h-20 py-3" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div>
            <label className="label">Receipt image</label>
            <label className="mt-1 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 text-center text-sm font-semibold text-stone-600">
              <span className="flex items-center gap-2">
                {uploadStatus === 'Receipt uploaded' ? <CheckCircle2 size={18} className="text-green-600" /> : <Upload size={18} />}
                {file ? file.name : editing?.receiptUrl ? 'Replace receipt image' : 'Choose image'}
              </span>
              <span className="text-xs font-medium text-stone-500">PNG, JPG, or WEBP up to 5MB.</span>
              <input className="hidden" type="file" accept="image/*" disabled={saving} onChange={(e) => {
                setFile(e.target.files?.[0]);
                setUploadProgress(0);
                setUploadStatus('');
              }} />
            </label>
            {file || uploadStatus ? (
              <div className="mt-2" aria-live="polite">
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="mt-1 text-xs font-medium text-stone-500">{uploadStatus || 'Ready to upload when you save.'}</p>
              </div>
            ) : editing?.receiptUrl ? (
              <a className="mt-2 inline-flex text-xs font-semibold text-brand-500" href={editing.receiptUrl} target="_blank">View current receipt</a>
            ) : null}
          </div>
          <button className="btn-primary w-full" disabled={saving || creatingCategory}>{saving ? (file ? 'Uploading and saving...' : 'Saving...') : editing ? 'Update expense' : 'Save expense'}</button>
        </form>
      </Modal>
    </>
  );
}
