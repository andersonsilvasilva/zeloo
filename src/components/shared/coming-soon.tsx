export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-text">{title}</h1>
      <p className="text-sm text-text-secondary">
        Este módulo ainda está em construção. Volte em breve.
      </p>
    </div>
  );
}
