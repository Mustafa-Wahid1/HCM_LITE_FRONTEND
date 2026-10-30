"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi, qs } from "@/lib/hooks";
import { api, ApiError, fmtDate, money } from "@/lib/api";
import { Bars, Donut, LineTrend } from "@/components/charts";
import { Button, Card, Empty, ErrorBox, Field, Input, Loading, PageHeader, Select, Stat, Table, Td } from "@/components/ui";
import { CheckInWidget } from "@/components/CheckInWidget";

function Filters({ f, setF, depts }: { f: any; setF: (x: any) => void; depts: any[] }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="From"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
      <Field label="To"><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
      <Field label="Department">
        <Select value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value })}>
          <option value="">All</option>
          {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </Field>
    </div>
  );
}

function AISummary({ filters }: { filters: any }) {
  const [bullets, setBullets] = useState<string[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setErr("");
    try {
      const r = await api<{ bullets: string[] }>("/ai/summary", { body: { from: filters.from || undefined, to: filters.to || undefined, department_id: filters.department_id ? Number(filters.department_id) : undefined } });
      setBullets(r.bullets);
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Summary unavailable"); }
    finally { setBusy(false); }
  }
  return (
    <Card title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI summary</span>}
      actions={<Button size="sm" onClick={run} loading={busy}>Summarize</Button>}>
      {err && <ErrorBox message={err} />}
      {!err && !bullets && <p className="text-sm text-muted">Click Summarize to get insights for the current filters. The AI only uses the numbers on this dashboard.</p>}
      {bullets && (
        <>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
          <p className="mt-3 text-[11px] uppercase tracking-wide text-muted">AI-generated</p>
        </>
      )}
    </Card>
  );
}

function Announcements({ items }: { items: any[] }) {
  return (
    <Card title="Announcements" actions={<Link href="/announcements" className="text-xs text-primary underline">All</Link>}>
      {items.length === 0 ? <p className="text-sm text-muted">No announcements yet.</p> : (
        <ul className="space-y-3">{items.map((a) => (
          <li key={a.id}><div className="text-sm font-medium">{a.title}</div><div className="text-xs text-muted">{fmtDate(a.created_at)}</div><p className="mt-0.5 line-clamp-2 text-sm">{a.body}</p></li>
        ))}</ul>
      )}
    </Card>
  );
}

function ManagerDashboard({ role }: { role: "admin" | "hr" }) {
  const first = new Date(); first.setDate(1);
  const [f, setF] = useState({ from: first.toLocaleDateString("en-CA"), to: new Date().toLocaleDateString("en-CA"), department_id: "" });
  const { data: depts } = useApi<any[]>("/departments");
  const path = `/dashboard/${role}` + qs(f);
  const { data, error, loading, reload } = useApi<any>(path);
  const ann = useApi<any[]>("/announcements");

  return (
    <>
      <PageHeader title={role === "admin" ? "Company dashboard" : "HR dashboard"} subtitle="Live numbers computed from the records in the system." actions={<Filters f={f} setF={setF} depts={depts || []} />} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <div className="space-y-4">
          {role === "admin" ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Headcount" value={data.kpis.headcount} />
              <Stat label="Attrition YTD" value={`${data.kpis.attrition_ytd_pct}%`} sub={`${data.attrition.exits} exit(s)`} />
              <Stat label="Payroll cost (gross)" value={money(data.kpis.payroll_cost_gross)} sub={`Net ${money(data.kpis.payroll_cost_net)}`} />
              <Stat label="Average salary" value={money(data.kpis.average_salary)} sub="gross / month" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Stat label="Headcount" value={data.kpis.headcount} />
              <Stat label="Present today" value={data.kpis.present_today} tone="green" />
              <Stat label="On leave" value={data.kpis.on_leave_today} />
              <Stat label="Late today" value={data.kpis.late_today} tone="amber" />
              <Stat label="Pending approvals" value={data.kpis.pending_approvals} sub={`${data.pending_approvals.leave} leave, ${data.pending_approvals.corrections} corrections`} />
            </div>
          )}

          <AISummary filters={f} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={`Attendance trend (rate %) - overall ${data.kpis.attendance_rate}%`}>
              {data.attendance_trend.length ? <LineTrend data={data.attendance_trend} x="date" unit="%" lines={[{ key: "rate", name: "Attendance rate" }]} /> : <Empty title="No attendance data in this range" hint="Records appear once employees check in on working days." />}
            </Card>
            {role === "hr" ? (
              <Card title="Absenteeism by department (%)">
                {data.absenteeism_by_department.length ? <Bars data={data.absenteeism_by_department} x="department" unit="%" bars={[{ key: "absenteeism_pct", name: "Absenteeism %" }, { key: "late_pct", name: "Late %" }]} /> : <Empty title="No data" />}
              </Card>
            ) : (
              <Card title="Headcount by department">
                {data.headcount_by_department.length ? <Bars data={data.headcount_by_department} x="department" bars={[{ key: "headcount", name: "Headcount" }]} /> : <Empty title="No employees yet" />}
              </Card>
            )}
          </div>

          {role === "hr" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Leave by type (approved days)">
                {data.leave_by_type.some((l: any) => l.approved_days_in_range) ? <Bars data={data.leave_by_type} x="name" bars={[{ key: "approved_days_in_range", name: "Days" }]} /> : <Empty title="No approved leave in this range" />}
                <div className="mt-3 text-xs text-muted">Utilization of yearly quota: {data.leave_by_type.filter((l: any) => l.utilization_pct != null).map((l: any) => `${l.name} ${l.utilization_pct}%`).join(" · ") || "-"}</div>
              </Card>
              <Card title="Top 5 late-comers">
                {data.top_late_comers.length === 0 ? <Empty title="Nobody was late in this range" /> : (
                  <Table head={["Employee", "Department", "Late"]}>
                    {data.top_late_comers.map((l: any) => <tr key={l.employee_id}><Td>{l.name}</Td><Td>{l.department || "-"}</Td><Td>{l.late_count}</Td></tr>)}
                  </Table>
                )}
              </Card>
              <Card title="On leave today">
                {data.on_leave_today.length === 0 ? <p className="text-sm text-muted">Nobody is on leave today.</p> : (
                  <ul className="space-y-1 text-sm">{data.on_leave_today.map((l: any) => <li key={l.employee_id}><b>{l.name}</b> <span className="text-muted">({l.leave_type}, until {fmtDate(l.end_date)})</span></li>)}</ul>
                )}
              </Card>
              <Announcements items={ann.data || []} />
            </div>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Payroll cost by department (gross vs net)">
                  {data.payroll_cost_by_department.length ? <Bars data={data.payroll_cost_by_department} x="department" bars={[{ key: "gross", name: "Gross" }, { key: "net", name: "Net" }]} /> : <Empty title="No payroll runs in this range" hint="HR creates a monthly draft, then Admin finalizes." />}
                </Card>
                <Card title="Payroll cost by month">
                  {data.payroll_by_month.length ? <Bars data={data.payroll_by_month} x="month" bars={[{ key: "gross", name: "Gross" }, { key: "net", name: "Net" }]} /> : <Empty title="No payroll runs yet" />}
                </Card>
                <Card title="Gender"><Donut data={data.gender} name="gender" value="count" /></Card>
                <Card title="Tenure"><Donut data={data.tenure} name="bucket" value="count" /></Card>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Average salary by department and designation" pad={false}>
                  {data.average_salary_by_dept_designation.length === 0 ? <div className="p-4"><Empty title="No salary data" /></div> : (
                    <Table head={["Department", "Designation", "People", "Avg gross"]}>
                      {data.average_salary_by_dept_designation.map((r: any, i: number) => <tr key={i}><Td>{r.department}</Td><Td>{r.designation}</Td><Td>{r.employees}</Td><Td>{money(r.avg_gross)}</Td></tr>)}
                    </Table>
                  )}
                </Card>
                <Card title="Recent activity" actions={<Link href="/audit" className="text-xs text-primary underline">Audit log</Link>} pad={false}>
                  {data.audit_feed.length === 0 ? <div className="p-4"><Empty title="No activity yet" /></div> : (
                    <Table head={["When", "Who", "Action"]}>
                      {data.audit_feed.map((a: any) => <tr key={a.id}><Td className="whitespace-nowrap">{fmtDate(a.created_at)}</Td><Td>{a.actor_email}</Td><Td>{a.action} {a.entity}</Td></tr>)}
                    </Table>
                  )}
                </Card>
              </div>
              <Announcements items={ann.data || []} />
            </>
          )}
        </div>
      )}
    </>
  );
}

function EmployeeDashboard() {
  const { data, error, loading, reload } = useApi<any>("/dashboard/employee");
  return (
    <>
      <PageHeader title="My dashboard" subtitle="Your attendance, leave and pay at a glance." />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1"><CheckInWidget onChange={reload} /></div>
            <div className="grid grid-cols-2 gap-3 lg:col-span-2">
              <Stat label="Hours this week" value={`${data.kpis.hours_this_week} / ${data.kpis.weekly_target_hours}`} sub={`${Math.min(100, Math.round((data.kpis.hours_this_week / data.kpis.weekly_target_hours) * 100))}% of target`} />
              <Stat label="Late this month" value={data.kpis.late_count_this_month} tone={data.kpis.late_count_this_month > 2 ? "amber" : undefined} />
              <Stat label="Last payslip" value={data.kpis.last_payslip ? money(data.kpis.last_payslip.net) : "-"} sub={data.kpis.last_payslip ? `${data.kpis.last_payslip.month} net` : "None finalized yet"} />
              <Stat label="Leave left (all types)" value={data.leave_balance.filter((b: any) => b.remaining != null).reduce((a: number, b: any) => a + b.remaining, 0)} sub="days with a quota" />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Leave balance" actions={<Link href="/leave" className="text-xs text-primary underline">Apply</Link>} pad={false}>
              <Table head={["Type", "Quota", "Used", "Pending", "Left"]}>
                {data.leave_balance.map((b: any) => (
                  <tr key={b.code}><Td>{b.name}</Td><Td>{b.yearly_quota ?? "Unlimited"}</Td><Td>{b.used}</Td><Td>{b.pending}</Td><Td className="font-medium">{b.remaining ?? "-"}</Td></tr>
                ))}
              </Table>
            </Card>
            <Announcements items={data.announcements} />
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "employee" ? <EmployeeDashboard /> : <ManagerDashboard role={user.role} />;
}
