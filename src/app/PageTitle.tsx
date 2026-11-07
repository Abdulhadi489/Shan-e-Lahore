// Page heading in the heritage heading font. The title comes already translated, so English pages show English
// only and Urdu pages show Urdu only.
export function PageTitle({ title }: { title: string }) {
  return (
    <h1 className="flex flex-wrap items-baseline gap-x-4 font-heading text-[clamp(2.25rem,1.75rem+2vw,3.5rem)] leading-tight font-semibold rtl:leading-[1.9]">
      {title}
    </h1>
  )
}
