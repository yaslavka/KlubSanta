/**
 * Branded full-screen splash — the preloader of Klub Santa.
 * - Public site: shown by the root loading.tsx while the server renders the page.
 * - Admin panel: shown by AdminProvider while the session is resolved.
 * Keep both identical on purpose: one crest, one brand moment.
 */
export function BrandSplash({ label = 'Preparing the sanctuary…' }: { label?: string }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#7D0A16] to-[#3A0008]"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <img src="/media/logo.svg" alt="Klub Santa crest" className="size-16 animate-pulse" />
      <p className="font-serif text-sm tracking-wide text-[#D0A56A]">{label}</p>
    </div>
  )
}
