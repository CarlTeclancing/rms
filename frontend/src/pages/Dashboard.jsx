import { AlertTriangle, Banknote, ReceiptText, TrendingUp } from 'lucide-react';
import { Loading } from '../components/Loading.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ChartPanel } from '../components/ChartPanel.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';

export default function Dashboard() {
  const { data, loading, error, refetch } = useApi(() => endpoints.dashboard(), []);
  if (loading) return <Loading label="Loading dashboard" />;
  if (error || !data) return <EmptyState title="Dashboard unavailable" message="The dashboard API did not return data. Make sure the backend and database are running." onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Dashboard" description="Live snapshot of restaurant performance and stock health." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Today's sales" value={currency(data.dailySales)} icon={Banknote} />
        <StatCard title="Monthly sales" value={currency(data.monthlySales)} icon={TrendingUp} tone="blue" />
        <StatCard title="Monthly expenses" value={currency(data.monthlyExpenses)} icon={ReceiptText} tone="amber" />
        <StatCard title="Low stock alerts" value={data.lowStockCount} icon={AlertTriangle} tone="rose" detail="Items at or below reorder level" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard title="Online orders" value={data.onlineOrdersCount || 0} icon={Banknote} tone="blue" detail={`${currency(data.onlineOrdersTotal)} this month`} />
        <StatCard title="Reservations today" value={data.reservationsToday || 0} icon={TrendingUp} detail="Pending and confirmed meal bookings" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartPanel title="Top selling items" labels={(data.topItems || []).map((item) => item.name)} values={(data.topItems || []).map((item) => item.quantity)} />
        <div className="card p-4">
          <h2 className="font-bold">Low stock</h2>
          <div className="mt-4 space-y-3">
            {data.lowStockItems?.length ? (
              (data.lowStockItems || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-stone-50 p-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-stone-500">Reorder at {Number(item.reorderLevel)} {item.unit}</p>
                  </div>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700">
                    {Number(item.quantity)} {item.unit}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-500">No low-stock items.</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6">
        <ChartPanel title="Inventory on hand" labels={(data.stockItems || []).map((item) => item.name)} values={(data.stockItems || []).map((item) => Number(item.quantity))} color="#0284c7" />
      </div>
    </>
  );
}
