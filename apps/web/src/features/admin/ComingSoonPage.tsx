export default function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-md rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-500 ring-1 ring-amber-500/30">
          Coming soon
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-slate-800">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
