export default function AgendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-booking-bg text-booking-text">
      <div className="mx-auto max-w-md px-4 py-6">{children}</div>
    </div>
  );
}
