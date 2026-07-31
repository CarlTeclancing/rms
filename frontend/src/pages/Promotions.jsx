import { Check, Edit2, Megaphone, Pause, Percent, Plus, Search, Trash2, X } from 'lucide-react';
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

const emptyCodeForm = {
  code: '',
  title: '10% onsite discount',
  description: 'Show this code when you visit the restaurant to redeem your flash sale discount.',
  discountPercent: 10,
  isActive: true,
  startsAt: '',
  endsAt: '',
  maxRedemptions: ''
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [codeOpen, setCodeOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [codeForm, setCodeForm] = useState(emptyCodeForm);
  const [savingCode, setSavingCode] = useState(false);
  const { data, loading, error, refetch } = useApi(() => endpoints.promotions(params), [params]);
  const flashCodes = useApi(() => endpoints.flashSaleCodes({ limit: 50 }), []);

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Uploading image...');
    try {
      const uploadData = new FormData();
      uploadData.append('image', file);
      uploadData.append('folder', 'restaurant-system/promotions');
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

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await endpoints.createPromotion(form);
      toast.success('Promotion created');
      setForm(emptyForm);
      setUploadProgress(0);
      setUploadStatus('');
      setOpen(false);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save promotion');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (row, status) => {
    setBusyAction(`${row.id}:${status}`);
    try {
      await endpoints.updatePromotion(row.id, { status });
      toast.success(`Promotion ${status.toLowerCase()}`);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update promotion');
    } finally {
      setBusyAction('');
    }
  };

  const remove = async (row) => {
    setBusyAction(`${row.id}:delete`);
    try {
      await endpoints.deletePromotion(row.id);
      toast.success('Promotion deleted');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete promotion');
    } finally {
      setBusyAction('');
    }
  };

  const openCodeEditor = (code = null) => {
    setEditingCode(code);
    setCodeForm(
      code
        ? {
            code: code.code,
            title: code.title,
            description: code.description || '',
            discountPercent: code.discountPercent || 10,
            isActive: code.isActive,
            startsAt: code.startsAt ? code.startsAt.slice(0, 10) : '',
            endsAt: code.endsAt ? code.endsAt.slice(0, 10) : '',
            maxRedemptions: code.maxRedemptions || ''
          }
        : emptyCodeForm
    );
    setCodeOpen(true);
  };

  const saveCode = async (event) => {
    event.preventDefault();
    setSavingCode(true);
    try {
      if (editingCode) await endpoints.updateFlashSaleCode(editingCode.id, codeForm);
      else await endpoints.createFlashSaleCode(codeForm);
      toast.success(editingCode ? 'Flash sale code updated' : 'Flash sale code created');
      setCodeOpen(false);
      setEditingCode(null);
      setCodeForm(emptyCodeForm);
      flashCodes.refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save flash sale code');
    } finally {
      setSavingCode(false);
    }
  };

  const toggleCode = async (code) => {
    setBusyAction(`${code.id}:toggle`);
    try {
      await endpoints.updateFlashSaleCode(code.id, { isActive: !code.isActive });
      toast.success(code.isActive ? 'Flash sale paused' : 'Flash sale activated');
      flashCodes.refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update flash sale code');
    } finally {
      setBusyAction('');
    }
  };

  const removeCode = async (code) => {
    setBusyAction(`${code.id}:delete-code`);
    try {
      await endpoints.deleteFlashSaleCode(code.id);
      toast.success('Flash sale code deleted');
      flashCodes.refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete flash sale code');
    } finally {
      setBusyAction('');
    }
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
            <button className="btn-secondary h-8 px-2" disabled={Boolean(busyAction)} onClick={() => updateStatus(row, 'APPROVED')} title="Approve">{busyAction === `${row.id}:APPROVED` ? '...' : <Check size={15} />}</button>
            <button className="btn-secondary h-8 px-2" disabled={Boolean(busyAction)} onClick={() => updateStatus(row, 'PAUSED')} title="Pause">{busyAction === `${row.id}:PAUSED` ? '...' : <Pause size={15} />}</button>
            <button className="btn-secondary h-8 px-2" disabled={Boolean(busyAction)} onClick={() => updateStatus(row, 'REJECTED')} title="Reject">{busyAction === `${row.id}:REJECTED` ? '...' : <X size={15} />}</button>
            <button className="btn-secondary h-8 px-2 text-rose-600" disabled={Boolean(busyAction)} onClick={() => remove(row)} title="Delete">{busyAction === `${row.id}:delete` ? '...' : <Trash2 size={15} />}</button>
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

      <section className="mt-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black">Flash sale codes</h2>
            <p className="mt-1 text-sm font-semibold text-stone-500">Create short-lived discount codes customers can redeem onsite.</p>
          </div>
          <button className="btn-primary" onClick={() => openCodeEditor()}><Percent size={17} /> Create code</button>
        </div>
        <DataTable
          rows={flashCodes.data?.items || []}
          empty={flashCodes.loading ? 'Loading flash sale codes...' : 'No flash sale codes yet.'}
          columns={[
            { key: 'code', label: 'Code', render: (row) => <span className="rounded-lg bg-brand-50 px-3 py-1 font-black text-brand-500">{row.code}</span> },
            { key: 'title', label: 'Offer' },
            { key: 'discountPercent', label: 'Discount', render: (row) => `${row.discountPercent}%` },
            {
              key: 'isActive',
              label: 'Status',
              render: (row) => row.isActive
                ? <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">Active</span>
                : <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">Paused</span>
            },
            { key: 'endsAt', label: 'Ends', render: (row) => row.endsAt ? compactDate(row.endsAt) : 'No end date' },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className="flex gap-2">
                  <button className="btn-secondary h-8 px-2" disabled={Boolean(busyAction)} onClick={() => toggleCode(row)} title={row.isActive ? 'Pause' : 'Activate'}>{busyAction === `${row.id}:toggle` ? '...' : row.isActive ? <Pause size={15} /> : <Check size={15} />}</button>
                  <button className="btn-secondary h-8 px-2" disabled={Boolean(busyAction)} onClick={() => openCodeEditor(row)} title="Edit"><Edit2 size={15} /></button>
                  <button className="btn-secondary h-8 px-2 text-rose-600" disabled={Boolean(busyAction)} onClick={() => removeCode(row)} title="Delete">{busyAction === `${row.id}:delete-code` ? '...' : <Trash2 size={15} />}</button>
                </div>
              )
            }
          ]}
        />
      </section>

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
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" placeholder="CTA label" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
            <input className="input" placeholder="CTA URL optional" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            <input className="input" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </div>
          <button className="btn-primary" disabled={saving || uploading}><Megaphone size={17} /> {saving ? 'Saving...' : 'Save promotion'}</button>
        </form>
      </Modal>

      <Modal title={editingCode ? 'Edit flash sale code' : 'Create flash sale code'} open={codeOpen} onClose={() => setCodeOpen(false)}>
        <form className="grid gap-3" onSubmit={saveCode}>
          <div className="rounded-xl bg-brand-50 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-500">
                <Percent size={22} />
              </div>
              <div>
                <p className="font-black">Onsite redeem code</p>
                <p className="text-xs font-semibold text-stone-500">Customers will see this in the flash sale popup.</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input uppercase" placeholder="Code e.g. ASAP10" value={codeForm.code} onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })} required />
            <input className="input" type="number" min="1" max="100" value={codeForm.discountPercent} onChange={(e) => setCodeForm({ ...codeForm, discountPercent: e.target.value })} required />
          </div>
          <input className="input" placeholder="Offer title" value={codeForm.title} onChange={(e) => setCodeForm({ ...codeForm, title: e.target.value })} required />
          <textarea className="input h-24 py-3" placeholder="Offer description" value={codeForm.description} onChange={(e) => setCodeForm({ ...codeForm, description: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="input" type="date" value={codeForm.startsAt} onChange={(e) => setCodeForm({ ...codeForm, startsAt: e.target.value })} />
            <input className="input" type="date" value={codeForm.endsAt} onChange={(e) => setCodeForm({ ...codeForm, endsAt: e.target.value })} />
            <input className="input" type="number" min="1" placeholder="Max redemptions" value={codeForm.maxRedemptions} onChange={(e) => setCodeForm({ ...codeForm, maxRedemptions: e.target.value })} />
          </div>
          <label className="flex items-center justify-between rounded-xl bg-brand-50 p-3">
            <span>
              <span className="block text-sm font-black text-stone-900">Active</span>
              <span className="text-xs font-semibold text-stone-500">Show this code to customers when valid.</span>
            </span>
            <input className="h-5 w-5 accent-brand-500" type="checkbox" checked={codeForm.isActive} onChange={(e) => setCodeForm({ ...codeForm, isActive: e.target.checked })} />
          </label>
          <button className="btn-primary" disabled={savingCode}><Percent size={17} /> {savingCode ? 'Saving...' : 'Save code'}</button>
        </form>
      </Modal>
    </>
  );
}
