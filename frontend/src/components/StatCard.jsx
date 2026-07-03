import clsx from 'clsx';

export function StatCard({ title, value, icon: Icon, tone = 'brand', detail }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    blue: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700'
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-normal">{value}</p>
          {detail ? <p className="mt-1 text-xs text-stone-500">{detail}</p> : null}
        </div>
        <div className={clsx('grid h-11 w-11 shrink-0 place-items-center rounded-lg', tones[tone])}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}
