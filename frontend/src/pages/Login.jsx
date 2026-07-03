import { ChefHat, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';

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
    <div className="min-h-screen bg-[#f6f7f4] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <section className="hidden lg:block">
          <div className="inline-grid h-14 w-14 place-items-center rounded-lg bg-brand-600 text-white">
            <ChefHat size={30} />
          </div>
          <h1 className="mt-6 max-w-xl text-5xl font-bold tracking-normal">Restaurant Management System</h1>
          <p className="mt-4 max-w-lg text-lg text-stone-600">
            Manage sales, stock, expenses, menu items, reports, and users from one responsive owner console.
          </p>
        </section>

        <form className="card mx-auto w-full max-w-md p-6" onSubmit={submit}>
          <div className="mb-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-brand-600 text-white lg:hidden">
              <ChefHat size={28} />
            </div>
            <h2 className="mt-4 text-2xl font-bold">Sign in</h2>
            <p className="mt-1 text-sm text-stone-500">Use your restaurant account to continue.</p>
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
          <button className="btn-primary mt-6 w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <a className="btn-secondary mt-3 w-full" href="/portal">Open ordering portal</a>
        </form>
      </div>
    </div>
  );
}
