"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { CATEGORICAL_ORDER, CHART_COLORS, CHART_SURFACE } from "@/modules/reports/components/chart-colors";
import { EmptyChartState } from "@/modules/reports/components/empty-chart-state";
import type { NamedCount } from "@/modules/reports/types/dashboard.types";

export interface ServicePieChartProps {
  data: NamedCount[];
}

interface TooltipContentProps {
  active?: boolean;
  payload?: Array<{ name?: string; value: number }>;
}

function ServiceTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="text-text">{entry.name}</p>
      <p className="text-text-secondary">{entry.value} agendamento(s)</p>
    </div>
  );
}

export function ServicePieChart({ data }: ServicePieChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return <EmptyChartState message="Sem serviços registrados no mês atual." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          stroke={CHART_SURFACE}
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={entry.name === "Outros" ? CHART_COLORS.other : CATEGORICAL_ORDER[index % CATEGORICAL_ORDER.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<ServiceTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={48}
          formatter={(value: string) => <span style={{ color: "#B5B5B5", fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
