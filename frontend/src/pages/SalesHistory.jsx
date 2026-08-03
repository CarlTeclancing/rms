import { CalendarDays, Download, Search, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '../components/DataTable.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Loading } from '../components/Loading.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';

const todayValue = () => new Date().toISOString().slice(0, 10);
const monthStartValue = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
};

export default function SalesHistory() {
  const [filters, setFilters] = useState({ from: monthStartValue(), to: todayValue() });
  const [params, setParams] = useState(filters);
  const { data, loading, error, refetch } = useApi(() => endpoints.salesReport(params), [params]);

  const lines = useMemo(() => {
    const posLines = (data?.sales || []).map((sale) => ({
      id: sale.id,
      date: sale.createdAt,
      orderNo: sale.orderNo,
      channel: 'POS',
      customer: sale.user?.name || 'Staff',
      status: sale.status,
      total: sale.total
    }));
    const onlineLines = (data?.onlineOrders || []).map((order) => ({
      id: order.id,
      date: order.createdAt,
      orderNo: order.orderNo,
      channel: 'Online',
      customer: order.customerName,
      status: order.status,
      total: order.total
    }));
    return [...posLines, ...onlineLines].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data]);

  const exportCsv = () => {
    const header = ['Date', 'Order', 'Channel', 'Customer/Staff', 'Status', 'Total'];
    const body = lines.map((row) => [
      new Date(row.date).toLocaleString(),
      row.orderNo,
      row.channel,
      row.customer,
      row.status,
      Number(row.total || 0)
    ]);
    const csv = [header, ...body].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-history-${params.from || 'start'}-${params.to || 'today'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !data) return <Loading label="Loading sales history" />;
  if (error || !data) return <EmptyState title="History unavailable" message="Past sales could not be loaded from the API." onRetry={refetch} />;

  const breakdown = data.categoryBreakdown || {};

  return (
    <>
      <PageHeader
        title="History"
        description="Filter past completed sales by day, month, or custom date range."
        action={<button className="btn-secondary" onClick={exportCsv} disabled={!lines.length}><Download size={17} /> Export</button>}
      />

      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); setParams(filters); }}>
        <input className="input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input className="input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <button className="btn-primary"><Search size={17} /> Apply</button>
      </form>

      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <StatCard title="Total sales" value={currency(data.totalSales)} icon={ShoppingCart} />
        <StatCard title="Food" value={currency(breakdown.food?.total || 0)} icon={CalendarDays} tone="amber" detail={`${breakdown.food?.quantity || 0} items`} />
        <StatCard title="Drinks" value={currency(breakdown.drink?.total || 0)} icon={CalendarDays} tone="blue" detail={`${breakdown.drink?.quantity || 0} items`} />
        <StatCard title="Orders" value={data.orders} icon={ShoppingCart} detail="Completed only" />
      </div>

      <div className="mb-5">
        <h2 className="mb-3 text-xl font-black">Daily totals</h2>
        <DataTable
          rows={data.history || []}
          empty="No sales found in this period."
          columns={[
            { key: 'date', label: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
            { key: 'posSales', label: 'POS', render: (row) => currency(row.posSales) },
            { key: 'onlineSales', label: 'Online', render: (row) => currency(row.onlineSales) },
            { key: 'totalSales', label: 'Total', render: (row) => currency(row.totalSales) },
            { key: 'orders', label: 'Orders' }
          ]}
        />
      </div>

      <div>
        <h2 className="mb-3 text-xl font-black">Transactions</h2>
        <DataTable
          rows={lines}
          empty="No completed transactions found."
          columns={[
            { key: 'date', label: 'Date', render: (row) => new Date(row.date).toLocaleString() },
            { key: 'orderNo', label: 'Order' },
            { key: 'channel', label: 'Channel' },
            { key: 'customer', label: 'Customer/Staff' },
            { key: 'status', label: 'Status' },
            { key: 'total', label: 'Total', render: (row) => currency(row.total) }
          ]}
        />
      </div>
    </>
  );
}
