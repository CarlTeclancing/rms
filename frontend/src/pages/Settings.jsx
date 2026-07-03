import { Bell, Cloud, Database, KeyRound, Save, ShieldCheck, Store, Truck } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components/PageHeader.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState(settings);

  const submit = (event) => {
    event.preventDefault();
    updateSettings(form);
    toast.success('Settings saved');
  };

  const systemSettings = [
    { title: 'API base URL', value: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', icon: Database },
    { title: 'Authentication', value: 'JWT bearer tokens with role permissions', icon: KeyRound },
    { title: 'File storage', value: 'Cloudinary receipt uploads', icon: Cloud },
    { title: 'Security', value: 'Helmet, rate limits, bcrypt, validation, protected routes', icon: ShieldCheck }
  ];

  return (
    <>
      <PageHeader title="Settings" description="Control storefront identity, ordering behavior, and application defaults." />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <form className="card p-5" onSubmit={submit}>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-700">
              <Store size={22} />
            </div>
            <div>
              <h2 className="font-black">Storefront settings</h2>
              <p className="text-sm font-semibold text-stone-500">These values update the admin shell and customer portal.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Restaurant name</label>
              <input className="input mt-1" value={form.restaurantName} onChange={(e) => setForm({ ...form, restaurantName: e.target.value })} />
            </div>
            <div>
              <label className="label">Short name</label>
              <input className="input mt-1" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input mt-1" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="USD">USD</option>
                <option value="XAF">XAF</option>
                <option value="NGN">NGN</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="label">Delivery fee</label>
              <input className="input mt-1" type="number" min="0" step="0.01" value={form.deliveryFee} onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })} />
            </div>
            <div>
              <label className="label">Support phone</label>
              <input className="input mt-1" value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl bg-red-50 p-4">
              <span className="flex items-center gap-3">
                <Truck className="text-red-700" size={20} />
                <span>
                  <span className="block text-sm font-black">Online ordering</span>
                  <span className="text-xs font-semibold text-stone-500">Enable customer delivery orders.</span>
                </span>
              </span>
              <input className="h-5 w-5 accent-red-600" type="checkbox" checked={form.publicOrdering} onChange={(e) => setForm({ ...form, publicOrdering: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between rounded-2xl bg-red-50 p-4">
              <span className="flex items-center gap-3">
                <Bell className="text-red-700" size={20} />
                <span>
                  <span className="block text-sm font-black">Reservations</span>
                  <span className="text-xs font-semibold text-stone-500">Enable meal booking requests.</span>
                </span>
              </span>
              <input className="h-5 w-5 accent-red-600" type="checkbox" checked={form.reservations} onChange={(e) => setForm({ ...form, reservations: e.target.checked })} />
            </label>
          </div>

          <button className="btn-primary mt-5"><Save size={17} /> Save settings</button>
        </form>

        <section className="grid gap-4">
          {systemSettings.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="card p-5">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-red-50 text-red-700">
                    <Icon size={21} />
                  </div>
                  <div>
                    <h2 className="font-black">{item.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-stone-500">{item.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
