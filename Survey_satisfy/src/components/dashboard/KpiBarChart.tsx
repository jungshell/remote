"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CHART = {
  grid: "#2d2d2d",
  axis: "#7d7d7d",
  tooltipBg: "#111",
  tooltipBorder: "#3a3a3a",
  cursor: "rgba(255,255,255,0.04)",
} as const;

interface KpiBarChartProps<T extends object> {
  data: T[];
  dataKey?: string;
  fill?: string;
  domainMax?: number;
  emptyText?: string;
  /** 라벨이 긴 데이터(문항별 등)는 X축 라벨을 기울여 표시 */
  angledLabels?: boolean;
}

/** 대시보드 공용 막대 차트 — 빈 상태 처리 포함 */
export function KpiBarChart<T extends object>({
  data,
  dataKey = "satisfaction",
  fill = "#ffffff",
  domainMax = 5,
  emptyText = "표시할 응답 데이터가 없습니다.",
  angledLabels = false,
}: KpiBarChartProps<T>) {
  if (data.length === 0) {
    return (
      <div className="grid h-full place-items-center border border-[var(--hairline)] text-sm text-[var(--text-muted)]">
        {emptyText}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={320}>
      <BarChart data={data}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="name"
          stroke={CHART.axis}
          tickLine={false}
          axisLine={false}
          {...(angledLabels ? { interval: 0 as const, angle: -20, textAnchor: "end", height: 70 } : {})}
        />
        <YAxis stroke={CHART.axis} tickLine={false} axisLine={false} domain={[0, domainMax]} />
        <Tooltip
          cursor={{ fill: CHART.cursor }}
          contentStyle={{ background: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: 0 }}
        />
        <Bar dataKey={dataKey} fill={fill} radius={0} />
      </BarChart>
    </ResponsiveContainer>
  );
}
