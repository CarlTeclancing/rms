import clsx from 'clsx';
import {
  BarChart3,
  Boxes,
  ChefHat,
  Home,
  LogOut,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/stock', label: 'Stock', icon: Boxes },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText },
  { to: '/menu', label: 'Menu', icon: ChefHat },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings }
];

function NavItem({ item, mobile = false }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg text-sm font-semibold transition',
          mobile ? 'h-14 flex-1 flex-col justify-center gap-1 px-1 text-[11px]' : 'px-3 py-2.5',
          isActive ? 'bg-brand-600 text-white' : 'text-stone-600 hover:bg-stone-100 hover:text-ink'
        )
      }
    >
      <Icon size={mobile ? 20 : 19} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const mobileItems = navItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#f6f7f4]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-stone-200 bg-white p-5 lg:block">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-brand-600 text-white">
            <ChefHat size={23} />
          </div>
          <div>
            <p className="font-bold">Restaurant MS</p>
            <p className="text-xs text-stone-500">Owner console</p>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-stone-200 p-3">
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="truncate text-xs text-stone-500">{user?.email}</p>
          <button className="mt-3 flex items-center gap-2 text-sm font-semibold text-rose-600" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      <main className="pb-24 lg:ml-72 lg:pb-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Restaurant Management System</p>
            <p className="font-semibold lg:hidden">{user?.name}</p>
          </div>
          <button className="btn-secondary h-9 px-3 lg:hidden" onClick={logout}>
            <LogOut size={16} />
          </button>
        </header>
        <div className="mx-auto max-w-7xl p-4 lg:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-stone-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {mobileItems.map((item) => (
          <NavItem key={item.to} item={item} mobile />
        ))}
      </nav>
    </div>
  );
}
