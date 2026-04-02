export function StatCard({
  label,
  value,
  sub,
  accent = false,
  dot,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  dot?: 'green' | 'red' | 'amber';
}) {
  const dotColor = { green: 'bg-emerald-400', red: 'bg-red-400', amber: 'bg-amber-400' };
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {dot && (
          <span
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${dotColor[dot]}`}
          />
        )}
        <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
      </div>
      <div
        className={`text-3xl font-bold ${accent ? 'text-amber-400' : 'text-white'}`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-slate-500 mt-1.5">{sub}</div>}
    </div>
  );
}
