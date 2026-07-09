import { format } from "date-fns";

export interface PrintHeaderProps {
  logoUrl: string | null;
  businessName: string;
  title: string;
  subtitle?: string;
}

/** Cabeçalho exibido apenas na impressão/PDF, já que a navegação e os filtros ficam ocultos (`print:hidden`). */
export function PrintHeader({ logoUrl, businessName, title, subtitle }: PrintHeaderProps) {
  return (
    <div className="mb-6 hidden items-center justify-between border-b border-border pb-4 print:flex">
      <div className="flex items-center gap-3">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logomarca" className="h-14 w-14 object-contain" />
        )}
        <div>
          <p className="font-semibold text-text">{businessName}</p>
          <h1 className="text-lg font-semibold text-text">{title}</h1>
          {subtitle && <p className="text-sm text-text-secondary">{subtitle}</p>}
        </div>
      </div>
      <p className="text-xs text-text-secondary">Gerado em {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
    </div>
  );
}
