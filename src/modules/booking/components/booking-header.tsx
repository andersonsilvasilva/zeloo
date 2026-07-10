import Link from "next/link";
import { ChevronLeft, Scissors } from "lucide-react";

export interface BookingHeaderProps {
  logoUrl: string | null;
  businessName: string;
  backHref?: string;
}

export function BookingHeader({ logoUrl, businessName, backHref }: BookingHeaderProps) {
  return (
    <div className="mb-6 flex items-center gap-3">
      {backHref && (
        <Link
          href={backHref}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-booking-border text-booking-text focus-gold"
          aria-label="Voltar"
        >
          <ChevronLeft size={18} />
        </Link>
      )}
      <div className="flex flex-1 items-center justify-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={businessName} className="h-9 w-9 rounded-full object-contain" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-booking-primary text-booking-primary">
            <Scissors size={16} />
          </div>
        )}
        <span className="font-semibold text-booking-text">{businessName}</span>
      </div>
      {backHref && <div className="w-9" aria-hidden="true" />}
    </div>
  );
}
