import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Minus,
  Phone,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  Users
} from 'lucide-react';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../components/DataTable.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Loading } from '../components/Loading.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';

const orderStatuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const reservationStatuses = ['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED'];

const statusStyles = {
  PENDING: 'bg-amber-50 text-amber-700',
  ACCEPTED: 'bg-sky-50 text-sky-700',
  PREPARING: 'bg-indigo-50 text-indigo-700',
  OUT_FOR_DELIVERY: 'bg-cyan-50 text-cyan-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CONFIRMED: 'bg-sky-50 text-sky-700',
  SEATED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-rose-50 text-rose-700'
};

const tabs = [
  { id: 'pos', label: 'POS', icon: ReceiptText, description: 'Create counter sales fast' },
  { id: 'online', label: 'Online orders', icon: Truck, description: 'Track delivery workflow' },
  { id: 'reservations', label: 'Reservations', icon: CalendarClock, description: 'Manage booking requests' }
];

const formatStatus = (status = 'PENDING') => status.replaceAll('_', ' ');
const fallbackImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80';

function StatusBadge({ status }) {
  return (
    <span className={clsx('rounded-full px-3 py-1 text-xs font-black uppercase tracking-normal', statusStyles[status] || 'bg-stone-100 text-stone-700')}>
      {formatStatus(status)}
    </span>
  );
}

function TabButton({ tab, active, onClick, badge }) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      role="tab"
      id={`sales-tab-${tab.id}`}
      aria-selected={active}
      aria-controls={`sales-panel-${tab.id}`}
      tabIndex={active ? 0 : -1}
      className={clsx(
        'flex min-h-[72px] flex-1 items-center gap-3 rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
        active ? 'border-brand-500 bg-white shadow-soft' : 'border-transparent bg-brand-50 hover:border-brand-200 hover:bg-white'
      )}
      onClick={onClick}
    >
      <span className={clsx('grid h-11 w-11 shrink-0 place-items-center rounded-lg', active ? 'bg-brand-100 text-brand-500' : 'bg-white text-stone-500')}>
        <Icon size={21} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-black">{tab.label}</span>
          {badge ? <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-black text-white">{badge}</span> : null}
        </span>
        <span className="mt-0.5 block text-xs font-semibold text-stone-500">{tab.description}</span>
      </span>
    </button>
  );
}

function RefreshButton({ onClick, loading, label = 'Refresh' }) {
  return (
    <button type="button" className="btn-secondary" onClick={onClick} disabled={loading}>
      <RefreshCw className={clsx(loading && 'animate-spin')} size={17} /> {label}
    </button>
  );
}

function SalesPanel({ id, active, children }) {
  if (!active) return null;
  return (
    <section id={`sales-panel-${id}`} role="tabpanel" aria-labelledby={`sales-tab-${id}`}>
      {children}
    </section>
  );
}

export default function Sales() {
  const menu = useApi(() => endpoints.menuItems({ limit: 100 }), []);
  const sales = useApi(() => endpoints.sales({ limit: 10 }), []);
  const onlineOrders = useApi(() => endpoints.onlineOrders(), []);
  const reservations = useApi(() => endpoints.reservations(), []);
  const [activeTab, setActiveTab] = useState('pos');
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [updatingReservationId, setUpdatingReservationId] = useState('');

  const menuItems = menu.data?.items || [];
  const availableItems = menuItems.filter((item) => item.isAvailable);
  const filteredItems = availableItems.filter((item) =>
    `${item.name} ${item.category?.name || ''}`.toLowerCase().includes(menuSearch.toLowerCase())
  );
  const onlineRows = onlineOrders.data?.items || [];
  const reservationRows = reservations.data?.items || [];
  const activeOnlineCount = onlineRows.filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.status)).length;
  const pendingReservationCount = reservationRows.filter((reservation) => reservation.status === 'PENDING').length;
  const onlineRevenue = onlineRows.filter((order) => order.status !== 'CANCELLED').reduce((sum, order) => sum + Number(order.total || 0), 0);
  const todayReservations = reservationRows.filter((reservation) => new Date(reservation.reservationAt).toDateString() === new Date().toDateString()).length;

  const add = (item) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.menuItemId === item.id);
      if (existing) return current.map((entry) => (entry.menuItemId === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      return [...current, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const updateQty = (id, delta) =>
    setCart((current) => current.map((item) => (item.menuItemId === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)));
  const remove = (id) => setCart((current) => current.filter((item) => item.menuItemId !== id));
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  const checkout = async () => {
    if (!cart.length) return toast.error('Add at least one item');
    setSaving(true);
    try {
      await endpoints.createSale({ items: cart.map(({ menuItemId, quantity }) => ({ menuItemId, quantity })), paymentMethod: 'CASH' });
      toast.success('Sale completed');
      setCart([]);
      menu.refetch();
      sales.refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sale failed');
    } finally {
      setSaving(false);
    }
  };

  const updateOrderStatus = async (id, status) => {
    setUpdatingOrderId(id);
    try {
      await endpoints.updateOnlineOrderStatus(id, { status });
      toast.success('Order status updated');
      onlineOrders.refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update order');
    } finally {
      setUpdatingOrderId('');
    }
  };

  const updateReservationStatus = async (id, status) => {
    setUpdatingReservationId(id);
    try {
      await endpoints.updateReservationStatus(id, { status });
      toast.success('Reservation status updated');
      reservations.refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update reservation');
    } finally {
      setUpdatingReservationId('');
    }
  };

  if (menu.loading && !menu.data) return <Loading label="Loading sales workspace" />;
  if (menu.error || !menu.data) return <EmptyState title="Sales unavailable" message="Menu items could not be loaded from the API." onRetry={menu.refetch} />;

  return (
    <>
      <PageHeader
        title="Sales"
        description="Run counter sales, manage online orders, and coordinate reservations from one workspace."
        action={
          <RefreshButton
            loading={menu.loading || onlineOrders.loading || reservations.loading || sales.loading}
            onClick={() => {
              menu.refetch();
              sales.refetch();
              onlineOrders.refetch();
              reservations.refetch();
            }}
            label="Refresh all"
          />
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3" role="tablist" aria-label="Sales work areas">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            badge={tab.id === 'online' ? activeOnlineCount : tab.id === 'reservations' ? pendingReservationCount : cart.length}
          />
        ))}
      </div>

      <SalesPanel id="pos" active={activeTab === 'pos'}>
        <div className="grid gap-4 xl:grid-cols-[1fr_390px]">
          <div className="min-w-0">
            <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <label className="relative block">
                <span className="sr-only">Search menu items</span>
                <Search className="pointer-events-none absolute left-3 top-3 text-stone-400" size={18} />
                <input
                  className="input pl-10"
                  value={menuSearch}
                  onChange={(event) => setMenuSearch(event.target.value)}
                  placeholder="Search meals or categories"
                />
              </label>
              <div className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-black text-brand-500">
                {filteredItems.length} available item{filteredItems.length === 1 ? '' : 's'}
              </div>
            </div>

            {filteredItems.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="card p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                    onClick={() => add(item)}
                  >
                    <img className="mb-3 h-32 w-full rounded-lg object-cover" src={item.imageUrl || fallbackImage} alt={item.name} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">{item.name}</p>
                        <p className="mt-1 text-sm text-stone-500">{item.category?.name || 'Menu item'}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-100 px-3 py-1 text-sm font-black text-brand-500">{currency(item.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No matching meals" message="Clear the search or add available menu items." />
            )}

            <div className="mt-6">
              <h2 className="mb-3 font-bold">Recent POS sales</h2>
              <DataTable
                rows={sales.data?.items || []}
                empty={sales.loading ? 'Loading recent sales...' : 'No POS sales yet'}
                columns={[
                  { key: 'orderNo', label: 'Receipt' },
                  { key: 'createdAt', label: 'Time', render: (row) => new Date(row.createdAt).toLocaleString() },
                  { key: 'user', label: 'Cashier', render: (row) => row.user?.name || 'Staff' },
                  { key: 'total', label: 'Total', render: (row) => currency(row.total) }
                ]}
              />
            </div>
          </div>

          <aside className="card sticky top-20 self-start p-4" aria-label="Current POS order">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">Current order</h2>
                <p className="text-xs font-semibold text-stone-500">{cart.length} line item{cart.length === 1 ? '' : 's'}</p>
              </div>
              <ShoppingBag size={20} className="text-brand-500" />
            </div>
            <div className="mt-4 space-y-3">
              {cart.length ? (
                cart.map((item) => (
                  <div key={item.menuItemId} className="rounded-lg bg-stone-50 p-3">
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold">{item.name}</p>
                      <button className="rounded-md p-1 text-rose-600 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500" onClick={() => remove(item.menuItemId)} aria-label={`Remove ${item.name}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2" aria-label={`Quantity for ${item.name}`}>
                        <button className="btn-secondary h-8 w-8 p-0" onClick={() => updateQty(item.menuItemId, -1)} aria-label={`Decrease ${item.name}`}><Minus size={15} /></button>
                        <span className="w-8 text-center font-bold" aria-live="polite">{item.quantity}</span>
                        <button className="btn-secondary h-8 w-8 p-0" onClick={() => updateQty(item.menuItemId, 1)} aria-label={`Increase ${item.name}`}><Plus size={15} /></button>
                      </div>
                      <span className="font-bold">{currency(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">Cart is empty. Select a meal to start a sale.</p>
              )}
            </div>
            <div className="mt-5 border-t border-stone-100 pt-4">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{currency(total)}</span>
              </div>
              <button className="btn-primary mt-4 w-full" disabled={saving || !cart.length} onClick={checkout}>
                {saving ? 'Completing...' : 'Complete sale'}
              </button>
            </div>
          </aside>
        </div>
      </SalesPanel>

      <SalesPanel id="online" active={activeTab === 'online'}>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard title="Active orders" value={activeOnlineCount} icon={Truck} tone="blue" detail="Needs kitchen or delivery action" />
          <StatCard title="Total orders" value={onlineRows.length} icon={ClipboardList} detail="Latest 100 portal orders" />
          <StatCard title="Online revenue" value={currency(onlineRevenue)} icon={CheckCircle2} tone="amber" detail="Excludes cancelled orders" />
        </div>

        {onlineRows.length ? (
          <div className="grid gap-4">
            {onlineRows.map((order) => (
              <article key={order.id} className="card p-4">
                <div className="grid gap-4 xl:grid-cols-[1fr_240px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black tracking-normal">{order.orderNo}</h2>
                      <StatusBadge status={order.status || 'PENDING'} />
                      <span className="text-xs font-semibold text-stone-500">{new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-stone-700 md:grid-cols-2">
                      <span>{order.customerName}</span>
                      <span className="flex items-center gap-2"><Phone size={15} /> {order.customerPhone}</span>
                      <span className="md:col-span-2">{order.deliveryAddress}</span>
                      {order.deliveryNote ? <span className="md:col-span-2 text-stone-500">Note: {order.deliveryNote}</span> : null}
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {(order.items || []).map((item) => (
                        <div key={item.id} className="rounded-lg bg-brand-50 px-3 py-2 text-sm">
                          <p className="font-black">{item.quantity} x {item.menuItem?.name || 'Menu item'}</p>
                          <p className="mt-0.5 font-semibold text-stone-500">
                            {item.variationName ? `${item.variationName} - ` : ''}{currency(item.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 self-start">
                    <label>
                      <span className="label">Status</span>
                      <select className="input mt-1 h-10" disabled={updatingOrderId === order.id} value={order.status || 'PENDING'} onChange={(event) => updateOrderStatus(order.id, event.target.value)}>
                        {orderStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
                      </select>
                      {updatingOrderId === order.id ? <span className="mt-1 block text-xs font-semibold text-stone-500">Updating status...</span> : null}
                    </label>
                    <div className="rounded-lg bg-brand-50 px-3 py-2 text-right">
                      <p className="text-xs font-black uppercase text-brand-500">Total</p>
                      <p className="text-xl font-black">{currency(order.total)}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No online orders yet" message="Orders placed from the public portal will appear here." onRetry={onlineOrders.refetch} />
        )}
      </SalesPanel>

      <SalesPanel id="reservations" active={activeTab === 'reservations'}>
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard title="Pending" value={pendingReservationCount} icon={Clock3} tone="amber" detail="Waiting for confirmation" />
          <StatCard title="Today" value={todayReservations} icon={CalendarClock} tone="blue" detail="Reservations scheduled today" />
          <StatCard title="Guests" value={reservationRows.reduce((sum, row) => sum + Number(row.partySize || 0), 0)} icon={Users} detail="Across listed bookings" />
        </div>

        {reservationRows.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {reservationRows.map((reservation) => (
              <article key={reservation.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black tracking-normal">{reservation.reservationNo}</h2>
                      <StatusBadge status={reservation.status || 'PENDING'} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-stone-500">{new Date(reservation.reservationAt).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-brand-50 px-3 py-2 text-right">
                    <p className="text-xs font-black uppercase text-brand-500">Guests</p>
                    <p className="text-lg font-black">{reservation.partySize}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm font-semibold text-stone-700 sm:grid-cols-2">
                  <span>{reservation.customerName}</span>
                  <span className="flex items-center gap-2"><Phone size={15} /> {reservation.customerPhone}</span>
                  {reservation.mealPreference ? <span className="sm:col-span-2">Meal: {reservation.mealPreference}</span> : null}
                  {reservation.note ? <span className="sm:col-span-2 text-stone-500">Note: {reservation.note}</span> : null}
                </div>
                <label className="mt-4 block">
                  <span className="label">Reservation status</span>
                  <select className="input mt-1 h-10" disabled={updatingReservationId === reservation.id} value={reservation.status || 'PENDING'} onChange={(event) => updateReservationStatus(reservation.id, event.target.value)}>
                    {reservationStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
                  </select>
                  {updatingReservationId === reservation.id ? <span className="mt-1 block text-xs font-semibold text-stone-500">Updating status...</span> : null}
                </label>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No reservations yet" message="Meal booking requests from the portal will appear here." onRetry={reservations.refetch} />
        )}
      </SalesPanel>
    </>
  );
}
