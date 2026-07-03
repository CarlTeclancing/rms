import { Search } from 'lucide-react';
import { useState } from 'react';
import { Loading } from '../components/Loading.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ChartPanel } from '../components/ChartPanel.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';
import { Banknote, ReceiptText, ShoppingCart } from 'lucide-react';

export default function Reports() {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [params, setParams] = useState({});
  const sales = useApi(() => endpoints.salesReport(params), [params]);
  const expenses = useApi(() => endpoints.expensesReport(params), [params]);

  if (sales.loading || expenses.loading) return <Loading label="Loading reports" />;
  if (sales.error || expenses.error || !sales.data || !expenses.data) {
    return <EmptyState title="Reports unavailable" message="Report data could not be loaded from the API." onRetry={() => { sales.refetch(); expenses.refetch(); }} />;
  }

  const categoryData = Object.entries(expenses.data.byCategory || {}).map(([name, amount]) => ({ name, amount }));

  return (
    <>
      <PageHeader title="Reports" description="Review sales, expense, and profit performance by date range." />
      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); setParams(filters); }}>
        <input className="input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input className="input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <button className="btn-primary"><Search size={17} /> Apply</button>
      </form>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Sales" value={currency(sales.data.totalSales)} icon={Banknote} />
        <StatCard title="Expenses" value={currency(expenses.data.totalExpenses)} icon={ReceiptText} tone="amber" />
        <StatCard title="Orders" value={sales.data.orders} icon={ShoppingCart} tone="blue" />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ChartPanel title="Sales channels" labels={['POS', 'Online']} values={[sales.data.posSales || 0, sales.data.onlineSales || 0]} color="#dc2626" />
        <ChartPanel title="Expenses by category" labels={categoryData.map((item) => item.name)} values={categoryData.map((item) => item.amount)} color="#f97316" />
      </div>
    </>
  );
}
