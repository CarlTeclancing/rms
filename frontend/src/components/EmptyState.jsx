import { AlertCircle, RefreshCw } from 'lucide-react';

export function EmptyState({ title = 'No data available', message = 'Check the API connection and try again.', onRetry }) {
  return (
    <div className="card grid min-h-52 place-items-center p-6 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-amber-50 text-amber-700">
          <AlertCircle size={24} />
        </div>
        <h2 className="mt-4 text-lg font-bold">{title}</h2>
        <p className="mt-1 max-w-md text-sm text-stone-500">{message}</p>
        {onRetry ? (
          <button className="btn-secondary mt-4" onClick={onRetry}>
            <RefreshCw size={17} /> Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
