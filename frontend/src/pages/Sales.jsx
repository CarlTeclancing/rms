import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { DataTable } from '../components/DataTable.jsx';
import { Loading } from '../components/Loading.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';

export default function Sales() {
  const { data, loading, error, refetch } = useApi(() => endpoints.menuItems({ limit: 100 }), []);
  const onlineOrders = useApi(() => endpoints.onlineOrders(), []);
  const reservations = useApi(() => endpoints.reservations(), []);
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);

  const add = (item) => {
    setCart((current) => {
      const existing = current.find((entry) => entry.menuItemId === item.id);
      if (existing) return current.map((entry) => (entry.menuItemId === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry));
      return [...current, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };
  const updateQty = (id, delta) => setCart((current) => current.map((item) => (item.menuItemId === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)));
  const remove = (id) => setCart((current) => current.filter((item) => item.menuItemId !== id));
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  const checkout = async () => {
    if (!cart.length) return toast.error('Add at least one item');
    setSaving(true);
    try {
      await endpoints.createSale({ items: cart.map(({ menuItemId, quantity }) => ({ menuItemId, quantity })), paymentMethod: 'CASH' });
      toast.success('Sale completed');
      setCart([]);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sale failed');
    } finally {
      setSaving(false);
    }
  };

  const updateOrderStatus = async (id, status) => {
    await endpoints.updateOnlineOrderStatus(id, { status });
    toast.success('Order status updated');
    onlineOrders.refetch();
  };

  const updateReservationStatus = async (id, status) => {
    await endpoints.updateReservationStatus(id, { status });
    toast.success('Reservation status updated');
    reservations.refetch();
  };

  if (loading) return <Loading label="Loading POS" />;
  if (error || !data) return <EmptyState title="POS unavailable" message="Menu items could not be loaded from the API." onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Sales / POS" description="Tap items into the cart and complete cash sales." />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(data.items || []).filter((item) => item.isAvailable).map((item) => (
            <button key={item.id} className="card p-4 text-left transition hover:-translate-y-0.5 hover:border-red-300" onClick={() => add(item)}>
              <img
                className="mb-3 h-32 w-full rounded-lg object-cover"
                src={item.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80'}
                alt={item.name}
              />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="mt-1 text-sm text-stone-500">{item.category?.name}</p>
                </div>
                <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-700">{currency(item.price)}</span>
              </div>
            </button>
          ))}
        </div>
        <aside className="card sticky top-20 self-start p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Current order</h2>
            <ShoppingBag size={20} className="text-red-600" />
          </div>
          <div className="mt-4 space-y-3">
            {cart.length ? (
              cart.map((item) => (
                <div key={item.menuItemId} className="rounded-lg bg-stone-50 p-3">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">{item.name}</p>
                    <button onClick={() => remove(item.menuItemId)} aria-label="Remove item">
                      <Trash2 size={16} className="text-rose-600" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button className="btn-secondary h-8 w-8 p-0" onClick={() => updateQty(item.menuItemId, -1)}><Minus size={15} /></button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button className="btn-secondary h-8 w-8 p-0" onClick={() => updateQty(item.menuItemId, 1)}><Plus size={15} /></button>
                    </div>
                    <span className="font-bold">{currency(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">Cart is empty.</p>
            )}
          </div>
          <div className="mt-5 border-t border-stone-100 pt-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>{currency(total)}</span>
            </div>
            <button className="btn-primary mt-4 w-full" disabled={saving} onClick={checkout}>
              {saving ? 'Completing...' : 'Complete sale'}
            </button>
          </div>
        </aside>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-bold">Online delivery orders</h2>
          <DataTable
            rows={onlineOrders.data?.items || []}
            empty="No online orders yet"
            columns={[
              { key: 'orderNo', label: 'Order' },
              { key: 'customerName', label: 'Customer' },
              { key: 'deliveryAddress', label: 'Location' },
              { key: 'total', label: 'Total', render: (row) => currency(row.total) },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <select className="input h-9 min-w-40" value={row.status} onChange={(e) => updateOrderStatus(row.id, e.target.value)}>
                    {['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                )
              }
            ]}
          />
        </section>
        <section>
          <h2 className="mb-3 font-bold">Meal reservations</h2>
          <DataTable
            rows={reservations.data?.items || []}
            empty="No reservations yet"
            columns={[
              { key: 'reservationNo', label: 'No.' },
              { key: 'customerName', label: 'Customer' },
              { key: 'partySize', label: 'Guests' },
              { key: 'reservationAt', label: 'Time', render: (row) => new Date(row.reservationAt).toLocaleString() },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <select className="input h-9 min-w-36" value={row.status} onChange={(e) => updateReservationStatus(row.id, e.target.value)}>
                    {['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED'].map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                )
              }
            ]}
          />
        </section>
      </div>
    </>
  );
}
