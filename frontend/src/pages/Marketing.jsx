import { BarChart3, CalendarClock, Download, Gift, HelpCircle, ImagePlus, Megaphone, Plus, Send, Sparkles, Target, TicketPercent, Trophy, Users, X } from 'lucide-react';
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
const couponTypes = ['Percentage Coupon', 'Fixed Coupon', 'Restaurant Coupon', 'Category Coupon', 'Free Delivery Coupon', 'Referral Coupon', 'First Order Coupon', 'Birthday Coupon'];
const audienceOptions = ['All customers', 'New customers', 'Returning customers', 'Inactive customers', 'High-value customers', 'Referral users', 'Birthday users'];

const moduleGroups = [
  {
    title: 'Campaigns',
    helper: 'Sales pushes, restaurant promotions, banners, announcements.',
    items: ['CAMPAIGN', 'FLASH_DEAL', 'HOMEPAGE_BANNER', 'FEATURED_RESTAURANT', 'ANNOUNCEMENT']
  },
  {
    title: 'Rewards & Retention',
    helper: 'Daily hooks that increase repeat visits and order frequency.',
    items: ['DAILY_REWARD', 'SPIN_WHEEL', 'LOYALTY_PROGRAM', 'DAILY_STREAK']
  },
  {
    title: 'Acquisition',
    helper: 'Coupons, referrals, and challenges that grow the customer base.',
    items: ['COUPON', 'REFERRAL_PROGRAM', 'CHALLENGE', 'PUSH_NOTIFICATION']
  }
];

const optionSections = [
  {
    title: 'Campaign Types',
    helper: 'Use these when the goal is to lift orders, move stock, or promote a restaurant/product.',
    items: campaignTypes,
    tone: 'bg-[#fff4d7] text-[#8b5f00]'
  },
  {
    title: 'Reward Types',
    helper: 'Use these to increase daily activity, repeat orders, streaks, and loyalty engagement.',
    items: rewardTypes,
    tone: 'bg-[#e7f8ef] text-[#0b8f4f]'
  },
  {
    title: 'Coupon Types',
    helper: 'Use these when marketers need a clear discount rule with eligibility and limits.',
    items: couponTypes,
    tone: 'bg-[#eef8fa] text-[#29384d]'
  },
  {
    title: 'Target Audiences',
    helper: 'Choose who should see the campaign so the customer experience stays clean.',
    items: audienceOptions,
    tone: 'bg-[#fff4f4] text-[#d71920]'
  }
];

const workspaceSections = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'analytics', label: 'Analytics', icon: Target },
  { id: 'help', label: 'Help', icon: HelpCircle }
];

const createActions = [
  { label: 'New campaign', type: 'CAMPAIGN', icon: Megaphone },
  { label: 'New flash deal', type: 'FLASH_DEAL', icon: CalendarClock },
  { label: 'New coupon', type: 'COUPON', icon: TicketPercent },
  { label: 'New reward', type: 'DAILY_REWARD', icon: Gift },
  { label: 'New banner', type: 'HOMEPAGE_BANNER', icon: Sparkles },
  { label: 'New notification', type: 'PUSH_NOTIFICATION', icon: Send }
];

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

function OptionDirectory({ sections }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#151923]">Campaign option directory</h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-stone-500">
            Marketers can pick the right strategy without scanning a crowded wall of options. Expand only the category they need.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {sections.map((section, index) => (
          <details key={section.title} className="rounded-2xl border border-[#edf0f2] bg-[#f7fbfc] p-4" open={index === 0}>
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-[#151923]">{section.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-stone-500">{section.helper}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-stone-500">{section.items.length}</span>
              </div>
            </summary>
            <div className="mt-4 flex flex-wrap gap-2">
              {section.items.map((item) => (
                <span key={item} className={`rounded-full px-3 py-2 text-xs font-black ${section.tone}`}>
                  {item}
                </span>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function AnalyticsView({ kpis, items }) {
  const moduleCounts = modules.map((module) => ({
    label: module.label,
    value: items.filter((item) => item.type === module.id).length
  })).filter((entry) => entry.value > 0);
  const statusCounts = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'].map((status) => ({
    label: status,
    value: items.filter((item) => item.status === status || item.effectiveStatus === status).length
  }));
  const maxModule = Math.max(1, ...moduleCounts.map((entry) => entry.value));
  const maxStatus = Math.max(1, ...statusCounts.map((entry) => entry.value));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Campaign Revenue" value={currency(kpis.campaignRevenue || 0)} icon={TicketPercent} />
        <MetricCard label="Referral Signups" value={kpis.referralSignups || 0} icon={Users} />
        <MetricCard label="Coupon Usage" value={kpis.couponUsage || 0} icon={TicketPercent} />
        <MetricCard label="Push CTR" value={`${kpis.pushCtr || 0}%`} icon={Send} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-black text-[#151923]">Module mix</h2>
          <p className="mt-1 text-sm font-semibold text-stone-500">How marketing work is distributed across modules.</p>
          <div className="mt-5 grid gap-3">
            {moduleCounts.length ? moduleCounts.map((entry) => (
              <div key={entry.label}>
                <div className="flex items-center justify-between text-sm font-black">
                  <span>{entry.label}</span>
                  <span>{entry.value}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#fff1ca]">
                  <div className="h-full rounded-full bg-[#d71920]" style={{ width: `${Math.max(8, (entry.value / maxModule) * 100)}%` }} />
                </div>
              </div>
            )) : <p className="rounded-2xl bg-[#f7fbfc] p-4 text-sm font-semibold text-stone-500">Create marketing items to see module distribution.</p>}
          </div>
        </section>
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-black text-[#151923]">Campaign status</h2>
          <p className="mt-1 text-sm font-semibold text-stone-500">Track what is live, scheduled, paused, or still in draft.</p>
          <div className="mt-5 grid gap-3">
            {statusCounts.map((entry) => (
              <div key={entry.label}>
                <div className="flex items-center justify-between text-sm font-black">
                  <span>{entry.label}</span>
                  <span>{entry.value}</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#eef8fa]">
                  <div className="h-full rounded-full bg-[#151923]" style={{ width: `${entry.value ? Math.max(8, (entry.value / maxStatus) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function HelpView() {
  const guides = [
    { title: 'Campaigns', body: 'Use campaigns for time-bound pushes like weekend sales, happy hour, product promotions, and free delivery.' },
    { title: 'Rewards', body: 'Use rewards, streaks, and spin wheel items to create daily habits without crowding the home screen.' },
    { title: 'Coupons', body: 'Use coupon rules when the offer needs eligibility, a minimum order, usage limits, or a maximum discount.' },
    { title: 'Priority', body: 'Higher priority items appear first. Keep only one major promotion above the fold for a cleaner customer experience.' },
    { title: 'Scheduling', body: 'Scheduled and active items appear only when the start and end dates match. Draft and paused items stay hidden.' },
    { title: 'Images', body: 'Upload campaign images directly. Use clear food, reward, restaurant, or campaign visuals instead of generic artwork.' }
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {guides.map((guide) => (
        <section key={guide.title} className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-black text-[#151923]">{guide.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-stone-500">{guide.body}</p>
        </section>
      ))}
    </div>
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
  const [imageUploading, setImageUploading] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [editorOpen, setEditorOpen] = useState(false);

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

  const openEditor = (item, type = activeType) => {
    setEditingId(item?.id || null);
    setForm(item ? {
      ...emptyForm,
      ...item,
      startsAt: toLocalInput(item.startsAt),
      endsAt: toLocalInput(item.endsAt),
      config: item.config || {}
    } : { ...emptyForm, type });
    setActiveType(item?.type || type);
    setEditorOpen(true);
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
          rewardType: form.config.rewardType || rewardTypes[0],
          couponType: form.config.couponType || couponTypes[0]
        }
      };
      if (editingId) await endpoints.updateMarketingItem(editingId, payload);
      else await endpoints.createMarketingItem(payload);
      toast.success(editingId ? 'Marketing item updated' : 'Marketing item created');
      setForm({ ...emptyForm, type: activeType });
      setEditingId(null);
      setEditorOpen(false);
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

  const uploadMarketingImage = async (file) => {
    if (!file) return;
    const data = new FormData();
    data.append('image', file);
    data.append('folder', 'restaurant-system/marketing');
    setImageUploading(true);
    try {
      const response = await endpoints.uploadImage(data);
      setForm((current) => ({ ...current, imageUrl: response.data.url }));
      toast.success('Marketing image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
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
      />

      <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl bg-white p-3 shadow-sm">
          <p className="px-2 pb-2 text-xs font-black uppercase tracking-wide text-stone-500">Marketing workspace</p>
          <div className="mb-5 grid gap-1">
            {workspaceSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-black ${activeSection === section.id ? 'bg-[#151923] text-white' : 'text-[#42495a] hover:bg-[#f7fbfc]'}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon size={17} /> {section.label}
                </button>
              );
            })}
          </div>

          <p className="px-2 pb-2 text-xs font-black uppercase tracking-wide text-stone-500">Create</p>
          <div className="mb-5 grid gap-1">
            {createActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.type}
                  type="button"
                  className="flex items-center gap-3 rounded-2xl bg-[#fff4f4] px-3 py-2.5 text-left text-sm font-black text-[#d71920] hover:bg-[#ffe8e9]"
                  onClick={() => openEditor(null, action.type)}
                >
                  <Icon size={17} /> {action.label}
                </button>
              );
            })}
          </div>

          <p className="px-2 pb-2 text-xs font-black uppercase tracking-wide text-stone-500">Manage modules</p>
          <div className="grid gap-4">
            {moduleGroups.map((group) => (
              <div key={group.title}>
                <p className="px-2 text-xs font-black uppercase text-stone-500">{group.title}</p>
                <p className="px-2 pb-2 pt-1 text-xs font-semibold leading-4 text-stone-400">{group.helper}</p>
                <div className="grid gap-1">
                  {group.items.map((moduleId) => {
                    const module = modules.find((entry) => entry.id === moduleId);
                    if (!module) return null;
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
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {activeSection === 'dashboard' ? (
            <>
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

              <OptionDirectory sections={optionSections} />
            </>
          ) : null}

          {activeSection === 'analytics' ? <AnalyticsView kpis={kpis} items={items} /> : null}
          {activeSection === 'help' ? <HelpView /> : null}

          {activeSection === 'dashboard' ? (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
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
                      <p className="mt-2 text-xs font-black uppercase text-stone-500">{item.audience || 'All customers'} - Priority {item.priority}</p>
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
          </section>
          ) : null}

        </main>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#151923]/55 px-4 py-6 backdrop-blur-sm">
          <form className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-5 shadow-2xl" onSubmit={submit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">{editingId ? 'Edit marketing item' : 'Create marketing item'}</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-stone-500">Fill this once and the system handles scheduling, placement, and customer visibility.</p>
              </div>
              <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-[#f7fbfc] text-[#151923]" onClick={() => setEditorOpen(false)} aria-label="Close form">
                <X size={20} />
              </button>
            </div>
            <div className="mt-5 grid gap-5">
              <section className="grid gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#d71920]">1. Campaign identity</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">These details help staff identify the campaign internally and help customers understand it externally.</p>
                </div>
                <label>
                  <span className="label">Marketing module</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Choose where this item belongs: campaign, reward, coupon, banner, notification, or challenge.</p>
                  <select className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{modules.map((module) => <option key={module.id} value={module.id}>{module.label}</option>)}</select>
                </label>
                <label>
                  <span className="label">Campaign name shown to staff</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Use a clear name like "Weekend Free Delivery" or "Lunch Happy Hour".</p>
                  <input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
                </label>
                <label>
                  <span className="label">Customer-facing message</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Short copy customers will see on banners, reward cards, notifications, or deal previews.</p>
                  <textarea className={inputClass} value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                </label>
              </section>

              <section className="grid gap-3 border-t border-[#edf0f2] pt-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#d71920]">2. Schedule and priority</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Control when the campaign appears and how strongly it competes for customer attention.</p>
                </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label">Publication status</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Draft stays hidden. Scheduled and Active can appear when dates match. Paused hides it.</p>
                  <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'ARCHIVED'].map((status) => <option key={status}>{status}</option>)}</select>
                </label>
                <label>
                  <span className="label">Display priority</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Higher numbers appear first when multiple promotions are active.</p>
                  <input className={inputClass} type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label">Start date and time</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">When customers should start seeing this campaign.</p>
                  <input className={inputClass} type="datetime-local" value={form.startsAt || ''} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
                </label>
                <label>
                  <span className="label">End date and time</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">When the campaign should automatically stop showing.</p>
                  <input className={inputClass} type="datetime-local" value={form.endsAt || ''} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
                </label>
              </div>
              </section>

              <section className="grid gap-3 border-t border-[#edf0f2] pt-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#d71920]">3. Creative and action</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Add the visual and the tap target customers will see.</p>
                </div>
              <div>
                <span className="label">Campaign image, banner, or prize image</span>
                <p className="mt-1 text-xs font-semibold text-stone-500">Upload the image used for homepage banners, campaign cards, flash deals, or spin-wheel prizes.</p>
                <div className="mt-1 rounded-2xl border border-dashed border-[#dbe5e8] bg-[#f7fbfc] p-3">
                  {form.imageUrl ? (
                    <div className="relative overflow-hidden rounded-xl">
                      <img className="h-36 w-full object-cover" src={form.imageUrl} alt="Marketing creative preview" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-[#d71920] shadow-sm"
                        onClick={() => setForm({ ...form, imageUrl: '' })}
                        aria-label="Remove uploaded image"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl bg-white px-4 py-6 text-center">
                      <ImagePlus className="text-[#d71920]" size={28} />
                      <span className="mt-2 text-sm font-black text-[#151923]">{imageUploading ? 'Uploading image...' : 'Upload image'}</span>
                      <span className="mt-1 text-xs font-semibold text-stone-500">Use this for banners, prize images, and campaign creatives.</span>
                      <input className="hidden" type="file" accept="image/*" disabled={imageUploading} onChange={(event) => uploadMarketingImage(event.target.files?.[0])} />
                    </label>
                  )}
                  {form.imageUrl ? (
                    <label className="mt-3 flex h-10 cursor-pointer items-center justify-center rounded-xl bg-white text-xs font-black text-[#d71920]">
                      {imageUploading ? 'Uploading image...' : 'Replace image'}
                      <input className="hidden" type="file" accept="image/*" disabled={imageUploading} onChange={(event) => uploadMarketingImage(event.target.files?.[0])} />
                    </label>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label">Button text</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Text on the customer action button, for example "Order now" or "Claim reward".</p>
                  <input className={inputClass} value={form.ctaLabel || ''} onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })} />
                </label>
                <label>
                  <span className="label">Destination link</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Where the button should send the customer, such as meals, a category, a restaurant, or checkout.</p>
                  <input className={inputClass} value={form.deepLink || ''} onChange={(event) => setForm({ ...form, deepLink: event.target.value })} />
                </label>
              </div>
              </section>

              <section className="grid gap-3 border-t border-[#edf0f2] pt-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#d71920]">4. Targeting and offer rules</p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Define who gets the offer and what type of campaign, reward, or coupon it is.</p>
                </div>
              <label>
                <span className="label">Customer group</span>
                <p className="mt-1 text-xs font-semibold text-stone-500">Select the group that should see or receive this campaign.</p>
                <select className={inputClass} value={form.audience || audienceOptions[0]} onChange={(event) => setForm({ ...form, audience: event.target.value })}>{audienceOptions.map((audience) => <option key={audience}>{audience}</option>)}</select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label">Campaign strategy</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">The business goal of the promotion, such as flash sale or free delivery.</p>
                  <select className={inputClass} value={form.config?.campaignType || campaignTypes[0]} onChange={(event) => setForm({ ...form, config: { ...form.config, campaignType: event.target.value } })}>{campaignTypes.map((type) => <option key={type}>{type}</option>)}</select>
                </label>
                <label>
                  <span className="label">Reward issued to customer</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">What the customer receives after claiming, spinning, ordering, or completing a challenge.</p>
                  <select className={inputClass} value={form.config?.rewardType || rewardTypes[0]} onChange={(event) => setForm({ ...form, config: { ...form.config, rewardType: event.target.value } })}>{rewardTypes.map((type) => <option key={type}>{type}</option>)}</select>
                </label>
              </div>
              <label>
                <span className="label">Coupon rule</span>
                <p className="mt-1 text-xs font-semibold text-stone-500">Choose how the discount should behave if this item includes a coupon.</p>
                <select className={inputClass} value={form.config?.couponType || couponTypes[0]} onChange={(event) => setForm({ ...form, config: { ...form.config, couponType: event.target.value } })}>{couponTypes.map((type) => <option key={type}>{type}</option>)}</select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="label">Maximum claims or stock</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Optional cap for reward claims, coupon uses, spin-wheel winners, or prize stock.</p>
                  <input className={inputClass} type="number" value={form.config?.maxClaims || ''} onChange={(event) => setForm({ ...form, config: { ...form.config, maxClaims: event.target.value } })} />
                </label>
                <label>
                  <span className="label">Minimum order amount</span>
                  <p className="mt-1 text-xs font-semibold text-stone-500">Optional basket value required before customers can use the offer.</p>
                  <input className={inputClass} type="number" value={form.config?.minimumOrder || ''} onChange={(event) => setForm({ ...form, config: { ...form.config, minimumOrder: event.target.value } })} />
                </label>
              </div>
              </section>
              <button className="btn-primary justify-center" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create item'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
