"use client";

import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils/format";
import { CHART_COLORS, CHART_GRID_COLOR, CHART_AXIS_COLOR } from "@/modules/reports/components/chart-colors";
import { EmptyChartState } from "@/modules/reports/components/empty-chart-state";
import type { NamedTotal } from "@/modules/reports/types/dashboard.types";

export interface ProfessionalBarChartProps {
  data: NamedTotal[];
}

interface TooltipContentProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function ProfessionalTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="text-text">{label}</p>
      <p className="text-text-secondary">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function ProfessionalBarChart({ data }: ProfessionalBarChartProps) {
  if (data.length === 0) {
    return <EmptyChartState message="Sem atendimentos registrados no mês atual." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
        <XAxis
          dataKey="name"
          tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID_COLOR }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        <Tooltip content={<ProfessionalTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="total" fill={CHART_COLORS.gold} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
