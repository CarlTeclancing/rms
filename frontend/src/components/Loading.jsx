export function Loading({ label = 'Loading' }) {
  return (
    <div className="fixed inset-0 z-[100] grid min-h-screen w-screen place-items-center bg-[#eaf5f8] px-4 py-8" role="status" aria-live="polite" aria-label={label}>
      <div className="chop-loader relative w-full max-w-sm overflow-hidden rounded-3xl border border-[#ffd8dc] bg-white p-6 text-center shadow-[0_22px_60px_rgba(17,24,39,0.12)]">
        <div className="pointer-events-none absolute inset-x-6 top-5 h-24 rounded-full bg-[#fff4d7] blur-2xl" />
        <div className="relative mx-auto h-40 w-60">
          <div className="chop-loader-food chop-loader-food-one" />
          <div className="chop-loader-food chop-loader-food-two" />
          <div className="chop-loader-food chop-loader-food-three" />

          <div className="chop-loader-logo-wrap">
            <span className="chop-loader-ring" />
            <img className="chop-loader-logo" src="/chopasap-logo.png" alt="" aria-hidden="true" />
          </div>

          <div className="chop-loader-hand chop-loader-hand-left">
            <span />
          </div>
          <div className="chop-loader-hand chop-loader-hand-right">
            <span />
          </div>
        </div>

        <div className="relative mt-1">
          <p className="text-base font-black text-[#151923]">{label}</p>
          <p className="mt-1 text-xs font-semibold text-stone-500">Fresh moments are landing on your plate.</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#fff1ca]">
            <span className="chop-loader-progress block h-full rounded-full bg-[#d71920]" />
          </div>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
