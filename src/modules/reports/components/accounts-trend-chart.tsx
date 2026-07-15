"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils/format";
import { CHART_COLORS, CHART_GRID_COLOR, CHART_AXIS_COLOR, CHART_SURFACE } from "@/modules/reports/components/chart-colors";
import { EmptyChartState } from "@/modules/reports/components/empty-chart-state";
import type { AccountsTrendPoint } from "@/modules/reports/types/dashboard.types";

export interface AccountsTrendChartProps {
  daily: AccountsTrendPoint[];
  monthly: AccountsTrendPoint[];
}

type Period = "month" | "6months" | "year";
type ChartType = "bar" | "line";

interface TooltipContentProps {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value: number }>;
  label?: string;
}

const SERIES_LABEL: Record<string, string> = {
  payable: "A pagar",
  receivable: "A receber",
};

function formatLabel(key: string): string {
  const parts = key.split("-");
  if (parts.length === 3) {
    const [, month, day] = parts;
    return `${day}/${month}`;
  }
  const [year, month] = parts;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function AccountsTrendTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 text-text-secondary">{formatLabel(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-text">
          {entry.dataKey ? SERIES_LABEL[entry.dataKey] : ""}:{" "}
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function AccountsTrendChart({ daily, monthly }: AccountsTrendChartProps) {
  const [period, setPeriod] = useState<Period>("6months");
  const [chartType, setChartType] = useState<ChartType>("bar");

  const data = useMemo(() => {
    if (period === "month") return daily;
    if (period === "6months") return monthly.slice(-6);
    return monthly;
  }, [period, daily, monthly]);

  const hasData = data.some((point) => point.payable > 0 || point.receivable > 0);
  const isDaily = period === "month";
  const tickInterval = isDaily ? Math.max(0, Math.floor(data.length / 8) - 1) : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="month">Mês atual</TabsTrigger>
            <TabsTrigger value="6months">6 meses</TabsTrigger>
            <TabsTrigger value="year">1 ano</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
          <TabsList>
            <TabsTrigger value="bar" aria-label="Gráfico de barras">
              <BarChart3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="line" aria-label="Gráfico de linhas">
              <LineChartIcon className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!hasData ? (
        <EmptyChartState message="Sem contas a pagar ou a receber no período selecionado." />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          {chartType === "bar" ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
              <XAxis
                dataKey="date"
                tickFormatter={formatLabel}
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
                axisLine={{ stroke: CHART_GRID_COLOR }}
                tickLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(value: number) => formatCompact(value)}
              />
              <Tooltip content={<AccountsTrendTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Legend
                verticalAlign="bottom"
                height={32}
                formatter={(value: string) => (
                  <span style={{ color: CHART_AXIS_COLOR, fontSize: 12 }}>{SERIES_LABEL[value] ?? value}</span>
                )}
              />
              <Bar dataKey="payable" name="payable" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="receivable" name="receivable" fill={CHART_COLORS.aqua} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
              <XAxis
                dataKey="date"
                tickFormatter={formatLabel}
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
                axisLine={{ stroke: CHART_GRID_COLOR }}
                tickLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fill: CHART_AXIS_COLOR, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={64}
                tickFormatter={(value: number) => formatCompact(value)}
              />
              <Tooltip content={<AccountsTrendTooltip />} cursor={{ stroke: CHART_GRID_COLOR }} />
              <Legend
                verticalAlign="bottom"
                height={32}
                formatter={(value: string) => (
                  <span style={{ color: CHART_AXIS_COLOR, fontSize: 12 }}>{SERIES_LABEL[value] ?? value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="payable"
                name="payable"
                stroke={CHART_COLORS.red}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: CHART_SURFACE, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="receivable"
                name="receivable"
                stroke={CHART_COLORS.aqua}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: CHART_SURFACE, strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}
