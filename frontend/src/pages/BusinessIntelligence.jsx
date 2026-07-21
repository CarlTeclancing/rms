import { AlertTriangle, Download, FileText, Search, Target, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ChartPanel } from '../components/ChartPanel.jsx';
import { DataTable } from '../components/DataTable.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Loading } from '../components/Loading.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { endpoints } from '../services/api.js';
import { currency } from '../utils/format.js';
import { useApi } from '../hooks/useApi.js';

const percent = (value) => `${Number(value || 0).toFixed(1)}%`;

function Badge({ value }) {
  const styles = {
    CRITICAL: 'bg-rose-50 text-rose-700',
    HIGH: 'bg-amber-50 text-amber-700',
    MEDIUM: 'bg-blue-50 text-blue-700',
    WARNING: 'bg-amber-50 text-amber-700'
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${styles[value] || 'bg-stone-100 text-stone-600'}`}>{value}</span>;
}

export default function BusinessIntelligence() {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [params, setParams] = useState({});
  const { data, loading, error, refetch } = useApi(() => endpoints.businessIntelligence(params), [params]);

  const recommendationColumns = useMemo(
    () => [
      { key: 'problem', label: 'Problem' },
      { key: 'priority', label: 'Priority', render: (row) => <Badge value={row.priority} /> },
      { key: 'supportingData', label: 'Supporting data' },
      { key: 'recommendedAction', label: 'Recommended action' }
    ],
    []
  );

  const productColumns = useMemo(
    () => [
      { key: 'name', label: 'Product' },
      { key: 'unitsSold', label: 'Units' },
      { key: 'revenue', label: 'Revenue', render: (row) => currency(row.revenue) },
      { key: 'grossProfit', label: 'Gross profit', render: (row) => currency(row.grossProfit) },
      { key: 'grossMargin', label: 'Margin', render: (row) => percent(row.grossMargin) },
      { key: 'classification', label: 'Class' }
    ],
    []
  );

  const downloadReport = async (format) => {
    const response = await endpoints.exportBusinessIntelligence({ ...params, format });
    const type = format === 'pdf' ? 'application/pdf' : 'text/csv';
    const extension = format === 'pdf' ? 'pdf' : 'csv';
    const url = URL.createObjectURL(new Blob([response.data], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `business-intelligence-report.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loading label="Loading business intelligence" />;
  if (error || !data) return <EmptyState title="Business intelligence unavailable" message="The analytics API did not return data." onRetry={refetch} />;

  return (
    <>
      <PageHeader
        title="Business Intelligence"
        description="Profit, cash flow, stock risk, forecasts, alerts, and management recommendations."
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => downloadReport('csv')}>
              <Download size={17} /> Excel
            </button>
            <button className="btn-secondary" onClick={() => downloadReport('pdf')}>
              <FileText size={17} /> PDF
            </button>
          </div>
        }
      />

      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); setParams(filters); }}>
        <input className="input" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        <input className="input" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
        <button className="btn-primary"><Search size={17} /> Apply</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Gross profit" value={currency(data.summary.grossProfit)} icon={TrendingUp} />
        <StatCard title="Net profit" value={currency(data.summary.netProfit)} icon={Target} tone={data.summary.netProfit < 0 ? 'rose' : 'blue'} detail={`${percent(data.summary.netMargin)} net margin`} />
        <StatCard title="Food cost" value={percent(data.summary.foodCostPercentage)} icon={FileText} tone={data.summary.foodCostPercentage > 35 ? 'amber' : 'blue'} />
        <StatCard title="Active alerts" value={data.alerts.length} icon={AlertTriangle} tone={data.alerts.length ? 'rose' : 'blue'} detail={`${data.summary.lowStockCount} low-stock items`} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ChartPanel title="Daily sales trend" type="line" labels={(data.charts.dailySales || []).map((row) => row.date)} values={(data.charts.dailySales || []).map((row) => row.total)} color="#2563eb" />
        <ChartPanel title="Expenses by category" labels={(data.charts.expensesByCategory || []).map((row) => row.category)} values={(data.charts.expensesByCategory || []).map((row) => row.amount)} color="#f59e0b" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <h2 className="font-black">Cash flow</h2>
          <div className="mt-4 space-y-3 text-sm font-semibold text-stone-700">
            <p className="flex justify-between"><span>Inflows</span><span>{currency(data.cashFlow.inflows)}</span></p>
            <p className="flex justify-between"><span>Outflows</span><span>{currency(data.cashFlow.outflows)}</span></p>
            <p className="flex justify-between"><span>Net movement</span><span>{currency(data.cashFlow.netCashMovement)}</span></p>
          </div>
        </div>
        <div className="card p-4">
          <h2 className="font-black">Break-even</h2>
          <div className="mt-4 space-y-3 text-sm font-semibold text-stone-700">
            <p className="flex justify-between"><span>Break-even sales</span><span>{currency(data.breakEven.breakEvenSales)}</span></p>
            <p className="flex justify-between"><span>Margin of safety</span><span>{currency(data.breakEven.marginOfSafety)}</span></p>
            <p className="flex justify-between"><span>Contribution margin</span><span>{percent(data.breakEven.contributionMarginPercentage)}</span></p>
          </div>
        </div>
        <div className="card p-4">
          <h2 className="font-black">7-day forecast</h2>
          <div className="mt-4 space-y-2 text-sm font-semibold text-stone-700">
            {(data.forecast || []).slice(0, 4).map((row) => (
              <p key={row.date} className="flex justify-between"><span>{row.date}</span><span>{currency(row.expected)}</span></p>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-500">Predictions are estimates based on historical data.</p>
        </div>
      </div>

      <div className="mt-5">
        <h2 className="mb-3 font-black">Recommendations</h2>
        <DataTable columns={recommendationColumns} rows={data.recommendations} empty="No recommendations for the selected period." />
      </div>

      <div className="mt-5">
        <h2 className="mb-3 font-black">Product profitability</h2>
        <DataTable columns={productColumns} rows={data.productProfitability} empty="No product sales for the selected period." />
      </div>
    </>
  );
}
