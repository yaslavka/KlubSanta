export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-serif text-2xl font-semibold text-[#3A0008] md:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1 max-w-2xl text-sm text-[#7D0A16]/70">{subtitle}</p> : null}
    </div>
  )
}
