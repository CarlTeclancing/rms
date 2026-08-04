import { ClipboardList, MapPin, Phone, RefreshCw, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { EmptyState } from '../components/EmptyState.jsx';
import { Loading } from '../components/Loading.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { useApi } from '../hooks/useApi.js';
import { apiBaseUrl, endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';

const statuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DRIVER_ASSIGNED', 'DRIVER_TO_RESTAURANT', 'DRIVER_ARRIVED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DRIVER_NEARBY', 'DELIVERED', 'CANCELLED'];

const statusStyles = {
  PENDING: 'bg-amber-50 text-amber-700',
  ACCEPTED: 'bg-sky-50 text-sky-700',
  PREPARING: 'bg-indigo-50 text-indigo-700',
  READY: 'bg-violet-50 text-violet-700',
  DRIVER_ASSIGNED: 'bg-blue-50 text-blue-700',
  DRIVER_TO_RESTAURANT: 'bg-cyan-50 text-cyan-700',
  DRIVER_ARRIVED: 'bg-teal-50 text-teal-700',
  PICKED_UP: 'bg-emerald-50 text-emerald-700',
  OUT_FOR_DELIVERY: 'bg-cyan-50 text-cyan-700',
  DRIVER_NEARBY: 'bg-lime-50 text-lime-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-rose-50 text-rose-700'
};

const formatStatus = (status = 'PENDING') => status.replaceAll('_', ' ');

export default function OnlineOrders() {
  const { data, loading, error, refetch, setData } = useApi(() => endpoints.onlineOrders(), []);
  const [updatingId, setUpdatingId] = useState('');
  const [trackingDrafts, setTrackingDrafts] = useState({});
  const orders = data?.items || [];
  const activeOrders = orders.filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.status));
  const totalRevenue = orders.filter((order) => order.status === 'DELIVERED').reduce((sum, order) => sum + Number(order.total || 0), 0);

  useEffect(() => {
    const socket = io(apiBaseUrl.replace(/\/api\/?$/, ''), { transports: ['websocket'], reconnection: true });
    socket.on('dispatch:order-updated', () => {
      refetch();
    });
    socket.on('order:updated', (order) => {
      setData((current) => ({
        ...(current || { items: [] }),
        items: (current?.items || []).map((entry) => (entry.id === order.id ? { ...entry, ...order } : entry))
      }));
    });
    return () => socket.disconnect();
  }, [refetch, setData]);

  const updateOrderStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await endpoints.updateOnlineOrderStatus(id, { status });
      toast.success('Order status updated');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update order');
    } finally {
      setUpdatingId('');
    }
  };

  const updateTrackingDraft = (id, patch) => {
    setTrackingDrafts((current) => ({ ...current, [id]: { ...(current[id] || {}), ...patch } }));
  };

  const saveTracking = async (order) => {
    const draft = trackingDrafts[order.id] || {};
    setUpdatingId(order.id);
    try {
      await endpoints.updateOnlineOrderTracking(order.id, {
        driverName: draft.driverName ?? order.driverName ?? '',
        driverPhone: draft.driverPhone ?? order.driverPhone ?? '',
        vehicleInfo: draft.vehicleInfo ?? order.vehicleInfo ?? '',
        etaMinutes: draft.etaMinutes ?? order.etaMinutes ?? '',
        distanceKm: draft.distanceKm ?? order.distanceKm ?? '',
        speedKph: draft.speedKph ?? order.driverSpeedKph ?? '',
        latitude: draft.latitude ?? order.driverLatitude ?? '',
        longitude: draft.longitude ?? order.driverLongitude ?? '',
        message: draft.message || 'Driver tracking updated.'
      });
      toast.success('Tracking updated');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update tracking');
    } finally {
      setUpdatingId('');
    }
  };

  if (loading) return <Loading label="Loading online orders" />;
  if (error || !data) return <EmptyState title="Online orders unavailable" message="Online delivery orders could not be loaded." onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Online Orders"
        description="Review delivery orders from the customer ordering portal and update their progress."
        action={
          <button className="btn-secondary" onClick={refetch}>
            <RefreshCw size={17} /> Refresh
          </button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard title="Total orders" value={orders.length} icon={ClipboardList} detail="Latest 100 portal orders" />
        <StatCard title="Active orders" value={activeOrders.length} icon={Truck} tone="blue" detail="Not delivered or cancelled" />
        <StatCard title="Online revenue" value={currency(totalRevenue)} icon={ClipboardList} tone="amber" detail="Delivered orders only" />
      </div>

      {orders.length ? (
        <div className="grid gap-4">
          {orders.map((order) => (
            <article key={order.id} className="card p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black tracking-normal">{order.orderNo}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyles[order.status || 'PENDING'] || 'bg-stone-100 text-stone-700'}`}>
                      {formatStatus(order.status || 'PENDING')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-stone-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-3 grid gap-2 text-sm font-semibold text-stone-700 sm:grid-cols-2">
                    <span>{order.customerName}</span>
                    <span className="flex items-center gap-2"><Phone size={15} /> {order.customerPhone}</span>
                    <span className="flex items-start gap-2 sm:col-span-2"><MapPin className="mt-0.5 shrink-0" size={15} /> {order.deliveryAddress}</span>
                    {order.deliveryNote ? <span className="sm:col-span-2 text-stone-500">Note: {order.deliveryNote}</span> : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[180px_180px] lg:flex lg:flex-col">
                  <select className="input h-10" disabled={updatingId === order.id} value={order.status || 'PENDING'} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                    {statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
                  </select>
                  {updatingId === order.id ? <p className="text-xs font-semibold text-stone-500">Updating status...</p> : null}
                  <div className="rounded-lg bg-brand-50 px-3 py-2 text-right">
                    <p className="text-xs font-black uppercase text-brand-500">Total</p>
                    <p className="text-lg font-black">{currency(order.total)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto border-t border-[#e2edf0] pt-4">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-xs uppercase text-stone-500">
                    <tr>
                      <th className="py-2 pr-4 font-black">Item</th>
                      <th className="py-2 pr-4 font-black">Qty</th>
                      <th className="py-2 pr-4 font-black">Unit</th>
                      <th className="py-2 text-right font-black">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2edf0]">
                    {(order.items || []).map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-4 font-bold">
                          {item.menuItem?.name || 'Menu item'}
                          {item.variationName ? <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-black text-brand-500">{item.variationName}</span> : null}
                        </td>
                        <td className="py-2 pr-4 font-semibold text-stone-600">{item.quantity}</td>
                        <td className="py-2 pr-4 font-semibold text-stone-600">{currency(item.unitPrice)}</td>
                        <td className="py-2 text-right font-bold">{currency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-2xl border border-[#e2edf0] bg-[#f7fbfc] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-[#151923]">Live delivery tracking</p>
                    <p className="text-xs font-semibold text-stone-500">Update driver and ETA details customers see on their tracking screen.</p>
                  </div>
                  <button className="btn-secondary h-9" disabled={updatingId === order.id} onClick={() => saveTracking(order)}>
                    <Truck size={16} /> Save tracking
                  </button>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <input className="input h-10" placeholder="Driver name" value={trackingDrafts[order.id]?.driverName ?? order.driverName ?? ''} onChange={(e) => updateTrackingDraft(order.id, { driverName: e.target.value })} />
                  <input className="input h-10" placeholder="Driver phone" value={trackingDrafts[order.id]?.driverPhone ?? order.driverPhone ?? ''} onChange={(e) => updateTrackingDraft(order.id, { driverPhone: e.target.value })} />
                  <input className="input h-10" placeholder="Vehicle e.g. Bike CM-123" value={trackingDrafts[order.id]?.vehicleInfo ?? order.vehicleInfo ?? ''} onChange={(e) => updateTrackingDraft(order.id, { vehicleInfo: e.target.value })} />
                  <input className="input h-10" placeholder="ETA minutes" type="number" value={trackingDrafts[order.id]?.etaMinutes ?? order.etaMinutes ?? ''} onChange={(e) => updateTrackingDraft(order.id, { etaMinutes: e.target.value })} />
                  <input className="input h-10" placeholder="Distance km" type="number" value={trackingDrafts[order.id]?.distanceKm ?? order.distanceKm ?? ''} onChange={(e) => updateTrackingDraft(order.id, { distanceKm: e.target.value })} />
                  <input className="input h-10" placeholder="Speed km/h" type="number" value={trackingDrafts[order.id]?.speedKph ?? order.driverSpeedKph ?? ''} onChange={(e) => updateTrackingDraft(order.id, { speedKph: e.target.value })} />
                  <input className="input h-10" placeholder="Driver latitude" type="number" value={trackingDrafts[order.id]?.latitude ?? order.driverLatitude ?? ''} onChange={(e) => updateTrackingDraft(order.id, { latitude: e.target.value })} />
                  <input className="input h-10" placeholder="Driver longitude" type="number" value={trackingDrafts[order.id]?.longitude ?? order.driverLongitude ?? ''} onChange={(e) => updateTrackingDraft(order.id, { longitude: e.target.value })} />
                </div>
                <input className="input mt-3 h-10" placeholder="Tracking update message" value={trackingDrafts[order.id]?.message ?? ''} onChange={(e) => updateTrackingDraft(order.id, { message: e.target.value })} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No online orders yet" message="Orders placed from the public portal will appear here." onRetry={refetch} />
      )}
    </>
  );
}
