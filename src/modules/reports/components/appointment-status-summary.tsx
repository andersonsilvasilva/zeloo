import { Badge } from "@/components/ui/badge";
import type { AppointmentStatusCount } from "@/modules/reports/types/period-report.types";

const STATUS_CONFIG: Record<string, { label: string; variant: "neutral" | "primary" | "success" | "danger" | "warning" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  CONFIRMED: { label: "Confirmado", variant: "primary" },
  IN_PROGRESS: { label: "Em atendimento", variant: "primary" },
  COMPLETED: { label: "Concluído", variant: "success" },
  CANCELLED: { label: "Cancelado", variant: "danger" },
  NO_SHOW: { label: "Não compareceu", variant: "neutral" },
};

export function AppointmentStatusSummary({ data }: { data: AppointmentStatusCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-text-secondary">Sem agendamentos no período.</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {data.map((entry) => {
        const config = STATUS_CONFIG[entry.status] ?? { label: entry.status, variant: "neutral" as const };
        return (
          <div key={entry.status} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Badge variant={config.variant}>{config.label}</Badge>
            <span className="text-sm font-medium text-text">{entry.count}</span>
          </div>
        );
      })}
    </div>
  );
}
