export function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-center text-sm text-text-secondary">
      {message}
    </div>
  );
}
