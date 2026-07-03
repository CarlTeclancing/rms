import { Edit2, Plus, Trash2, Upload } from 'lucide-react';
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

export default function Expenses() {
  const { data, loading, error, refetch } = useApi(() => endpoints.expenses({ limit: 100 }), []);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: '', amount: '', categoryId: '', note: '' });

  useEffect(() => {
    endpoints.expenseCategories().then((res) => setCategories(res.data));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      let receiptUrl = '';
      if (file) {
        const uploadData = new FormData();
        uploadData.append('receipt', file);
        const upload = await endpoints.uploadReceipt(uploadData);
        receiptUrl = upload.data.url;
      }
      if (editing) await endpoints.updateExpense(editing.id, { ...form, ...(receiptUrl ? { receiptUrl } : {}) });
      else await endpoints.createExpense({ ...form, receiptUrl });
      toast.success(editing ? 'Expense updated' : 'Expense recorded');
      setOpen(false);
      setEditing(null);
      setFile(null);
      setForm({ title: '', amount: '', categoryId: '', note: '' });
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save expense');
    }
  };

  const openEditor = (expense = null) => {
    setEditing(expense);
    setForm(expense ? { title: expense.title, amount: expense.amount, categoryId: expense.categoryId, note: expense.note || '' } : { title: '', amount: '', categoryId: '', note: '' });
    setFile(null);
    setOpen(true);
  };

  const remove = async (expense) => {
    if (!confirm(`Delete ${expense.title}?`)) return;
    await endpoints.deleteExpense(expense.id);
    toast.success('Expense deleted');
    refetch();
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
          { key: 'receiptUrl', label: 'Receipt', render: (row) => (row.receiptUrl ? <a className="font-black text-red-700" href={row.receiptUrl} target="_blank">View</a> : '-') },
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
            </div>
          </div>
          <div>
            <label className="label">Receipt image</label>
            <label className="mt-1 flex h-24 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 text-sm font-semibold text-stone-600">
              <Upload size={18} /> {file ? file.name : 'Choose image'}
              <input className="hidden" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0])} />
            </label>
          </div>
          <button className="btn-primary w-full">{editing ? 'Update expense' : 'Save expense'}</button>
        </form>
      </Modal>
    </>
  );
}
