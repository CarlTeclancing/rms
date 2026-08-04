import { BarChart3, CalendarClock, Download, Gift, Megaphone, Plus, Send, Sparkles, Target, TicketPercent, Trophy, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../components/EmptyState.jsx';
import { Loading } from '../components/Loading.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';

const modules = [
  { id: 'CAMPAIGN', label: 'Campaign Manager', icon: Megaphone },
  { id: 'DAILY_REWARD', label: 'Daily Rewards', icon: Gift },
  { id: 'SPIN_WHEEL', label: 'Spin Wheel', icon: Sparkles },
  { id: 'FLASH_DEAL', label: 'Flash Deals', icon: CalendarClock },
  { id: 'COUPON', label: 'Coupons', icon: TicketPercent },
  { id: 'REFERRAL_PROGRAM', label: 'Referral Program', icon: Users },
  { id: 'LOYALTY_PROGRAM', label: 'Loyalty Program', icon: Trophy },
  { id: 'DAILY_STREAK', label: 'Daily Streaks', icon: Target },
  { id: 'FEATURED_RESTAURANT', label: 'Featured Restaurants', icon: Sparkles },
  { id: 'HOMEPAGE_BANNER', label: 'Homepage Banners', icon: Megaphone },
  { id: 'PUSH_NOTIFICATION', label: 'Push Notifications', icon: Send },
  { id: 'CHALLENGE', label: 'Challenges', icon: Trophy },
  { id: 'ANNOUNCEMENT', label: 'Announcements', icon: Megaphone }
];

const campaignTypes = ['Flash Sale', 'Weekend Sale', 'Holiday Sale', 'Happy Hour', 'Restaurant Promotion', 'Product Promotion', 'Free Delivery', 'Buy One Get One', 'Cashback', 'Loyalty Bonus'];
const rewardTypes = ['Free Delivery', 'Percentage Discount', 'Fixed Discount', 'Free Drink', 'Free Dessert', 'Bonus Points', 'Cashback', 'Mystery Reward'];

const emptyForm = {
  type: 'CAMPAIGN',
  status: 'DRAFT',
  title: '',
  description: '',
  imageUrl: '',
  ctaLabel: '',
  deepLink: '',
  audience: 'All customers',
  startsAt: '',
  endsAt: '',
  priority: 0,
  config: {}
};

const inputClass = 'input mt-1';

const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[#edf0f2] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fff1ca] text-[#d71920]"><Icon size={20} /></span>
        <p className="text-right text-2xl font-black text-[#151923]">{value}</p>
      </div>
      <p className="mt-3 text-xs font-black uppercase tracking-wide text-stone-500">{label}</p>
    </div>
  );
}

function CompactList({ title, items }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="font-black text-[#151923]">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items?.length ? items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-[#f7fbfc] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-black">{item.title}</p>
              <span className="rounded-full bg-[#fff4d7] px-2 py-1 text-[11px] font-black text-[#8b5f00]">{item.effectiveStatus || item.status}</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-stone-500">{item.startsAt ? new Date(item.startsAt).toLocaleString() : 'No schedule'}</p>
          </div>
        )) : <p className="rounded-2xl bg-[#f7fbfc] p-4 text-sm font-semibold text-stone-500">Nothing scheduled.</p>}
      </div>
    </section>
  );
}

export default function Marketing() {
  const [dashboard, setDashboard] = useState(null);
  const [items, setItems] = useState([]);
  const [activeType, setActiveType] = useState('CAMPAIGN');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeItems = useMemo(() => items.filter((item) => item.type === activeType), [items, activeType]);
  const activeModule = modules.find((module) => module.id === activeType) || modules[0];

  const load = async () => {
    const [dashboardResponse, itemsResponse] = await Promise.all([
      endpoints.marketingDashboard(),
      endpoints.marketingItems()
    ]);
    setDashboard(dashboardResponse.data);
    setItems(itemsResponse.data.items || []);
  };

  useEffect(() => {
    load().catch(() => toast.error('Marketing data could not be loaded')).finally(() => setLoading(false));
  }, []);

  const openEditor = (item) => {
    setEditingId(item?.id || null);
    setForm(item ? {
      ...emptyForm,
      ...item,
      startsAt: toLocalInput(item.startsAt),
      endsAt: toLocalInput(item.endsAt),
      config: item.config || {}
    } : { ...emptyForm, type: activeType });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        priority: Number(form.priority || 0),
        config: {
          ...form.config,
          campaignType: form.config.campaignType || campaignTypes[0],
          rewardType: form.config.rewardType || rewardTypes[0]
        }
      };
      if (editingId) await endpoints.updateMarketingItem(editingId, payload);
      else await endpoints.createMarketingItem(payload);
      toast.success(editingId ? 'Marketing item updated' : 'Marketing item created');
      setForm({ ...emptyForm, type: activeType });
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save marketing item');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete ${item.title}?`)) return;
    await endpoints.deleteMarketingItem(item.id);
    toast.success('Marketing item deleted');
    await load();
  };

  const exportReport = async () => {
    const response = await endpoints.exportMarketingReport();
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'marketing-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loading label="Loading marketing dashboard" />;
  if (!dashboard) return <EmptyState title="Marketing unavailable" message="The marketing dashboard could not be loaded." onRetry={load} />;

  const kpis = dashboard.kpis || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing & Growth"
        description="Create, schedule, and measure retention campaigns without developer support."
        action={<button className="btn-primary" onClick={() => openEditor()}><Plus size={18} /> New item</button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Daily Active Users" value={kpis.dailyActiveUsers || 0} icon={Users} />
        <MetricCard label="Orders Today" value={kpis.ordersToday || 0} icon={BarChart3} />
        <MetricCard label="Campaign Revenue" value={currency(kpis.campaignRevenue || 0)} icon={TicketPercent} />
        <MetricCard label="Reward Claims" value={kpis.dailyRewardClaims || 0} icon={Gift} />
        <MetricCard label="Active Campaigns" value={kpis.activeCampaigns || 0} icon={Megaphone} />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <CompactList title="Recent Campaigns" items={dashboard.recentCampaigns} />
        <CompactList title="Upcoming Campaigns" items={dashboard.upcomingCampaigns} />
        <CompactList title="Today's Flash Deals" items={dashboard.todaysFlashDeals} />
        <CompactList title="Scheduled Notifications" items={dashboard.scheduledNotifications} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl bg-white p-3 shadow-sm">
          <p className="px-2 pb-2 text-xs font-black uppercase tracking-wide text-stone-500">Marketing modules</p>
          <div className="grid gap-1">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.id}
                  type="button"
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-black ${activeType === module.id ? 'bg-[#d71920] text-white' : 'text-[#42495a] hover:bg-[#fff4f4] hover:text-[#d71920]'}`}
                  onClick={() => {
                    setActiveType(module.id);
                    setForm({ ...emptyForm, type: module.id });
                    setEditingId(null);
                  }}
                >
                  <Icon size={17} /> {module.label}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{activeModule.label}</h2>
                <p className="mt-1 text-sm font-semibold text-stone-500">{activeItems.length} configured item{activeItems.length === 1 ? '' : 's'}</p>
              </div>
              <button className="btn-secondary" onClick={exportReport}><Download size={17} /> Export report</button>
            </div>
            <div className="mt-5 grid gap-3">
              {activeItems.length ? activeItems.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[#edf0f2] bg-[#f7fbfc] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-black text-[#151923]">{item.title}</p>
                      <p className="mt-1 text-sm font-semibold text-stone-500">{item.description || 'No description'}</p>
                      <p className="mt-2 text-xs font-black uppercase text-stone-500">{item.audience || 'All customers'} · Priority {item.priority}</p>
                    </div>
                    <span className="rounded-full bg-[#e7f8ef] px-3 py-1 text-xs font-black text-[#16894d]">{item.effectiveStatus || item.status}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#d71920]" onClick={() => openEditor(item)}>Edit</button>
                    <button className="rounded-xl bg-white px-3 py-2 text-xs font-black text-stone-600" onClick={() => remove(item)}>Delete</button>
                  </div>
                </article>
              )) : <p className="rounded-2xl bg-[#f7fbfc] p-6 text-center text-sm font-semibold text-stone-500">No items in this module yet.</p>}
            </div>
          </div>

          <form className="rounded-3xl bg-white p-5 shadow-sm" onSubmit={submit}>
            <h2 className="text-lg font-black">{editingId ? 'Edit marketing item' : 'Create marketing item'}</h2>
            <div className="mt-4 grid gap-3">
              <label><span className="label">Module</span><select className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{modules.map((module) => <option key={module.id} value={module.id}>{module.label}</option>)}</select></label>
              <label><span className="label">Name</span><input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
              <label><span className="label">Description</span><textarea className={inputClass} value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="label">Status</span><select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ARCHIVED'].map((status) => <option key={status}>{status}</option>)}</select></label>
                <label><span className="label">Priority</span><input className={inputClass} type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} /></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="label">Start</span><input className={inputClass} type="datetime-local" value={form.startsAt || ''} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
                <label><span className="label">End</span><input className={inputClass} type="datetime-local" value={form.endsAt || ''} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
              </div>
              <label><span className="label">Image or banner URL</span><input className={inputClass} value={form.imageUrl || ''} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="label">CTA label</span><input className={inputClass} value={form.ctaLabel || ''} onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })} /></label>
                <label><span className="label">Deep link</span><input className={inputClass} value={form.deepLink || ''} onChange={(event) => setForm({ ...form, deepLink: event.target.value })} /></label>
              </div>
              <label><span className="label">Target audience</span><input className={inputClass} value={form.audience || ''} onChange={(event) => setForm({ ...form, audience: event.target.value })} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="label">Campaign type</span><select className={inputClass} value={form.config?.campaignType || campaignTypes[0]} onChange={(event) => setForm({ ...form, config: { ...form.config, campaignType: event.target.value } })}>{campaignTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label><span className="label">Reward type</span><select className={inputClass} value={form.config?.rewardType || rewardTypes[0]} onChange={(event) => setForm({ ...form, config: { ...form.config, rewardType: event.target.value } })}>{rewardTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="label">Usage / stock limit</span><input className={inputClass} type="number" value={form.config?.maxClaims || ''} onChange={(event) => setForm({ ...form, config: { ...form.config, maxClaims: event.target.value } })} /></label>
                <label><span className="label">Minimum order</span><input className={inputClass} type="number" value={form.config?.minimumOrder || ''} onChange={(event) => setForm({ ...form, config: { ...form.config, minimumOrder: event.target.value } })} /></label>
              </div>
              <button className="btn-primary justify-center" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create item'}</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
