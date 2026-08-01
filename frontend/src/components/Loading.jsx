export function Loading({ label = 'Loading' }) {
  return (
    <div className="fixed inset-0 z-[100] h-screen w-screen bg-[#eaf5f8]" role="status" aria-live="polite" aria-label={label}>
      <div className="chop-loader relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-white px-6 py-8 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-56 -translate-y-1/2 rounded-full bg-[#fff4d7] blur-3xl" />
        <div className="relative mx-auto h-48 w-72 max-w-[82vw]">
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

        <div className="relative mt-4 w-full max-w-sm">
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
