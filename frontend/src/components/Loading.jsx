export function Loading({ label = 'Loading' }) {
  return (
    <div className="grid min-h-52 place-items-center">
      <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-medium text-stone-600 shadow-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        {label}
      </div>
    </div>
  );
}
