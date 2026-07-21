import { Check, Megaphone, Pause, Plus, Search, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../components/DataTable.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Loading } from '../components/Loading.jsx';
import { Modal } from '../components/Modal.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { endpoints } from '../services/api.js';
import { compactDate } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';

const emptyForm = {
  businessName: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  title: '',
  description: '',
  imageUrl: '',
  ctaLabel: 'Contact our Team',
  ctaUrl: '',
  placement: 'PORTAL_HOME',
  status: 'APPROVED',
  startsAt: '',
  endsAt: '',
  adminNote: ''
};

function StatusBadge({ status }) {
  const tone = {
    APPROVED: 'bg-green-50 text-green-700',
    PENDING: 'bg-amber-50 text-amber-700',
    REJECTED: 'bg-rose-50 text-rose-700',
    PAUSED: 'bg-stone-100 text-stone-600'
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${tone[status] || tone.PENDING}`}>{status}</span>;
}

export default function Promotions() {
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [params, setParams] = useState({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const { data, loading, error, refetch } = useApi(() => endpoints.promotions(params), [params]);

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('image', file);
      uploadData.append('folder', 'restaurant-system/promotions');
      const response = await endpoints.uploadImage(uploadData);
      setForm((current) => ({ ...current, imageUrl: response.data.url }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    await endpoints.createPromotion(form);
    toast.success('Promotion created');
    setForm(emptyForm);
    setOpen(false);
    refetch();
  };

  const updateStatus = async (row, status) => {
    await endpoints.updatePromotion(row.id, { status });
    toast.success(`Promotion ${status.toLowerCase()}`);
    refetch();
  };

  const remove = async (row) => {
    await endpoints.deletePromotion(row.id);
    toast.success('Promotion deleted');
    refetch();
  };

  const columns = useMemo(
    () => [
      { key: 'businessName', label: 'Business' },
      { key: 'title', label: 'Title' },
      { key: 'contactName', label: 'Contact' },
      { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
      { key: 'createdAt', label: 'Submitted', render: (row) => compactDate(row.createdAt) },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => (
          <div className="flex gap-2">
            <button className="btn-secondary h-8 px-2" onClick={() => updateStatus(row, 'APPROVED')} title="Approve"><Check size={15} /></button>
            <button className="btn-secondary h-8 px-2" onClick={() => updateStatus(row, 'PAUSED')} title="Pause"><Pause size={15} /></button>
            <button className="btn-secondary h-8 px-2" onClick={() => updateStatus(row, 'REJECTED')} title="Reject"><X size={15} /></button>
            <button className="btn-secondary h-8 px-2 text-rose-600" onClick={() => remove(row)} title="Delete"><Trash2 size={15} /></button>
          </div>
        )
      }
    ],
    []
  );

  if (loading) return <Loading label="Loading promotions" />;
  if (error || !data) return <EmptyState title="Promotions unavailable" message="Promotion requests could not be loaded." onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Review public promotion requests, approve them, or create promotions for the portal."
        action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={17} /> Create promotion</button>}
      />

      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_180px_auto]" onSubmit={(event) => { event.preventDefault(); setParams(filters); }}>
        <input className="input" placeholder="Search business, title, or contact" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select className="input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="PAUSED">Paused</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button className="btn-primary"><Search size={17} /> Apply</button>
      </form>

      <DataTable columns={columns} rows={data.items || []} empty="No promotion requests yet." />

      <Modal title="Create promotion" open={open} onClose={() => setOpen(false)}>
        <form className="grid gap-3" onSubmit={save}>
          <input className="input" placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} required />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} required />
            <input className="input" placeholder="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} required />
          </div>
          <input className="input" type="email" placeholder="Contact email optional" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          <input className="input" placeholder="Promotion title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <textarea className="input h-24 py-3" placeholder="Promotion message" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <div>
            <label className="label">Promotion image</label>
            <div className="mt-1 grid gap-3 sm:grid-cols-[96px_1fr]">
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-xl border border-[#dbe5e8] bg-brand-50">
                {form.imageUrl ? <img className="h-full w-full object-cover" src={form.imageUrl} alt="Promotion preview" /> : <Megaphone className="text-brand-500" size={24} />}
              </div>
              <label className="flex min-h-24 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-[#dbe5e8] bg-white px-4 text-sm font-semibold text-[#6f7a86] hover:border-brand-500">
                <span className="font-black text-[#151923]">{uploading ? 'Uploading...' : 'Upload image'}</span>
                <span className="mt-1 text-xs">PNG, JPG, or WEBP up to 5MB.</span>
                <input className="hidden" type="file" accept="image/*" disabled={uploading} onChange={(e) => uploadImage(e.target.files?.[0])} />
              </label>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="CTA label" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
            <input className="input" placeholder="CTA URL optional" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            <input className="input" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </div>
          <button className="btn-primary"><Megaphone size={17} /> Save promotion</button>
        </form>
      </Modal>
    </>
  );
}
