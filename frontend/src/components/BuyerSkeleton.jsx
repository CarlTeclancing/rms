export function BuyerSkeleton() {
  return <main className="min-h-screen bg-[#F8F9FB] p-4" role="status" aria-label="Loading meals" aria-busy="true">
    <div className="mx-auto max-w-5xl motion-safe:animate-pulse">
      <div className="mb-6 h-12 w-48 rounded-xl bg-stone-200" />
      <div className="mb-6 h-12 rounded-xl bg-stone-200" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="rounded-2xl bg-white p-3"><div className="aspect-[4/3] rounded-xl bg-stone-200" /><div className="mt-4 h-5 rounded bg-stone-200" /><div className="mt-3 h-5 w-20 rounded bg-stone-200" /></div>)}</div>
      <span className="sr-only">Loading available meals…</span>
    </div>
  </main>;
}
