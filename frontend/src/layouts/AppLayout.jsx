import clsx from 'clsx';
import {
  BarChart3,
  Boxes,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Home,
  LogOut,
  Menu as MenuIcon,
  Megaphone,
  ReceiptText,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: Home },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/online-orders', label: 'Orders', icon: ShoppingBag },
  { to: '/stock', label: 'Stock', icon: Boxes },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText },
  { to: '/menu', label: 'Menu', icon: ChefHat },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/business-intelligence', label: 'BI', icon: LineChart },
  { to: '/promotions', label: 'Promotions', icon: Megaphone },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings }
];

const chopasapLogo = '/chopasap-logo.png';

function NavItem({ item, mobile = false }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-xl text-sm font-extrabold transition',
          mobile ? 'h-14 flex-1 flex-col justify-center gap-1 px-1 text-[11px]' : 'px-3 py-2.5',
          isActive
            ? 'bg-brand-500 text-white shadow-brand'
            : 'text-[#42495a] hover:bg-brand-100 hover:text-brand-500'
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
  const { settings } = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const primaryMobileItems = navItems.slice(0, 4);
  const sidebarWidth = collapsed ? 'lg:ml-24' : 'lg:ml-72';

  const renderDesktopNav = () => (
    <nav className="mt-8 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              clsx(
                'flex items-center rounded-xl text-sm font-extrabold transition',
                collapsed ? 'h-11 justify-center px-0' : 'gap-3 px-3 py-2.5',
                isActive ? 'bg-brand-500 text-white shadow-brand' : 'text-[#42495a] hover:bg-brand-100 hover:text-brand-500'
              )
            }
          >
            <Icon size={20} />
            {!collapsed ? <span>{item.label}</span> : null}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-app">
      <aside className={clsx('fixed inset-y-0 left-0 z-30 hidden border-r border-[#dbe5e8] bg-white transition-[width] duration-200 lg:block', collapsed ? 'w-24' : 'w-72')}>
        <div className="flex h-full min-h-0 flex-col p-5">
          <div className={clsx('flex shrink-0 items-center', collapsed ? 'justify-center' : 'gap-3')}>
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-brand-200 shadow-md">
              <img className="h-full w-full object-cover" src={chopasapLogo} alt="ChopASAP" />
            </div>
            {!collapsed ? <div>
              <p className="font-black uppercase tracking-normal text-brand-500">CHOP ASAP</p>
              <p className="text-xs font-semibold text-[#6f7a86]">{settings.shortName || 'Restaurant module'}</p>
            </div> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {renderDesktopNav()}
          </div>

          <div className={clsx('mt-4 shrink-0 rounded-xl border border-[#f3c463] bg-brand-50 p-3', collapsed ? 'px-2 text-center' : '')}>
            {!collapsed ? (
              <>
                <p className="text-sm font-black">{user?.name}</p>
                <p className="truncate text-xs text-stone-500">{user?.email}</p>
              </>
            ) : null}
            <button className={clsx('mt-3 flex items-center gap-2 text-sm font-black text-brand-500', collapsed ? 'mx-auto mt-0 justify-center' : '')} onClick={logout} title="Logout">
              <LogOut size={16} /> {!collapsed ? 'Logout' : null}
            </button>
          </div>
        </div>

        <button
          className="absolute -right-4 top-20 grid h-8 w-8 place-items-center rounded-full border border-[#dbe5e8] bg-white text-[#42495a] shadow-soft hover:text-brand-500"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </aside>

      {drawerOpen ? <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onClick={() => setDrawerOpen(false)} /> : null}
      <aside className={clsx('fixed inset-y-0 left-0 z-50 w-80 max-w-[86vw] border-r border-[#dbe5e8] bg-white p-5 shadow-2xl transition-transform lg:hidden', drawerOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img className="h-12 w-12 rounded-xl object-cover" src={chopasapLogo} alt="ChopASAP" />
            <div>
              <p className="font-black uppercase tracking-normal text-brand-500">CHOP ASAP</p>
              <p className="text-xs font-semibold text-[#6f7a86]">Admin console</p>
            </div>
          </div>
          <button className="btn-secondary h-9 w-9 p-0" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
            <ChevronLeft size={17} />
          </button>
        </div>
        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => (
            <div key={item.to} onClick={() => setDrawerOpen(false)}>
              <NavItem item={item} />
            </div>
          ))}
        </nav>
      </aside>

      <main className={clsx('pb-24 transition-[margin] duration-200 lg:pb-0', sidebarWidth)}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#dbe5e8] bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="btn-secondary h-9 w-9 p-0 lg:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open navigation">
              <MenuIcon size={18} />
            </button>
            <img className="h-9 w-9 rounded-xl object-cover lg:hidden" src={chopasapLogo} alt="ChopASAP" />
            <div>
              <p className="text-xs font-black uppercase tracking-normal text-brand-500">CHOP ASAP</p>
              <p className="font-semibold text-[#42495a]">{settings.restaurantName}</p>
            </div>
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

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-[#dbe5e8] bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_25px_rgba(40,50,60,0.08)] lg:hidden">
        {primaryMobileItems.map((item) => (
          <NavItem key={item.to} item={item} mobile />
        ))}
        <button className="flex h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-extrabold text-[#42495a] transition hover:text-brand-500" onClick={() => setDrawerOpen(true)}>
          <MenuIcon size={20} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
