"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7", "#14b8a6", "#f97316"];
const axis = { fontSize: 11, fill: "var(--muted)" };
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };

export function LineTrend({ data, x, lines, unit }: { data: any[]; x: string; lines: { key: string; name: string }[]; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={x} tick={axis} tickFormatter={(v) => String(v).slice(5)} />
        <YAxis tick={axis} unit={unit} />
        <Tooltip {...tip} />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {lines.map((l, i) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={COLORS[i]} strokeWidth={2} dot={data.length < 20} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, x, bars, unit, height = 240 }: { data: any[]; x: string; bars: { key: string; name: string }[]; unit?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={x} tick={axis} interval={0} />
        <YAxis tick={axis} unit={unit} allowDecimals={false} />
        <Tooltip {...tip} />
        {bars.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} name={b.name} fill={COLORS[i]} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, name, value }: { data: any[]; name: string; value: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey={value} nameKey={name} innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
