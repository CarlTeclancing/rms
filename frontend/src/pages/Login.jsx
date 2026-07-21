import { Lock, Mail, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

const chopasapLogo = '/chopasap-logo.png';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: 'admin@restaurant.test', password: 'Admin123!' });
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast.success('Signed in');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#eef8fa] px-4 py-8 text-[#151923]">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-xl bg-brand-200 shadow-md">
            <img className="h-full w-full object-cover" src={chopasapLogo} alt="ChopASAP" />
          </div>
          <p className="mt-4 text-xl font-black uppercase tracking-normal text-brand-500">CHOP ASAP</p>
          <p className="mt-1 text-sm font-semibold text-[#6f7a86]">Restaurant operations console</p>
        </div>

        <form className="rounded-xl border border-[#dbe5e8] bg-white p-6 shadow-soft" onSubmit={submit}>
          <div className="mb-6">
            <h1 className="text-2xl font-black tracking-normal">Login</h1>
            <p className="mt-1 text-sm font-semibold text-[#6f7a86]">Enter your account details to continue.</p>
          </div>
          <label className="label">Email</label>
          <div className="relative mt-1">
            <Mail className="pointer-events-none absolute left-3 top-3 text-stone-400" size={18} />
            <input className="input pl-10" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <label className="label mt-4 block">Password</label>
          <div className="relative mt-1">
            <Lock className="pointer-events-none absolute left-3 top-3 text-stone-400" size={18} />
            <input className="input pl-10" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button className="btn-primary mt-6 w-full rounded-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
          <a className="btn-secondary mt-3 w-full rounded-full" href="/portal">
            <ShoppingBag size={17} /> Open ordering portal
          </a>
        </form>
      </div>
    </div>
  );
}
