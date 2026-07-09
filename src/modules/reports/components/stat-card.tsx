export interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
}

export function StatCard({ label, value, caption }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-1 line-clamp-2 text-2xl font-semibold leading-tight text-text" title={value}>
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-text-secondary">{caption}</p>}
    </div>
  );
}
