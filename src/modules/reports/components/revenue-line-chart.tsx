"use client";

import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils/format";
import { CHART_COLORS, CHART_GRID_COLOR, CHART_AXIS_COLOR, CHART_SURFACE } from "@/modules/reports/components/chart-colors";
import { EmptyChartState } from "@/modules/reports/components/empty-chart-state";
import type { RevenueTrendPoint } from "@/modules/reports/types/dashboard.types";

export interface RevenueLineChartProps {
  data: RevenueTrendPoint[];
}

interface TooltipContentProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function formatDateLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

function RevenueTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="text-text-secondary">{formatDateLabel(label)}</p>
      <p className="font-medium text-text">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function RevenueLineChart({ data }: RevenueLineChartProps) {
  const hasData = data.some((point) => point.total > 0);

  if (!hasData) {
    return <EmptyChartState message="Sem faturamento registrado nos últimos 30 dias." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateLabel}
          tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID_COLOR }}
          tickLine={false}
          interval={Math.max(0, Math.floor(data.length / 6) - 1)}
        />
        <YAxis
          tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        <Tooltip content={<RevenueTooltip />} cursor={{ stroke: CHART_GRID_COLOR }} />
        <Line
          type="monotone"
          dataKey="total"
          stroke={CHART_COLORS.gold}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: CHART_SURFACE, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
