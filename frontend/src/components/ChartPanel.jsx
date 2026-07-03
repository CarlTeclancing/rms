import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#17211f', padding: 10 }
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#78716c' } },
    y: { grid: { color: '#e7e5e4' }, ticks: { color: '#78716c' }, beginAtZero: true }
  }
};

export function ChartPanel({ title, labels, values, type = 'bar', color = '#20966d' }) {
  const data = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: color,
        backgroundColor: color,
        borderRadius: 6,
        tension: 0.35
      }
    ]
  };
  const Chart = type === 'line' ? Line : Bar;

  return (
    <div className="card p-4">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-4 h-72">
        <Chart data={data} options={baseOptions} />
      </div>
    </div>
  );
}
