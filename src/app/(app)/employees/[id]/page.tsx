"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, ApiError, fmtDate, money } from "@/lib/api";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { Button, Card, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Stat, StatusBadge, Table, Td, useToast } from "@/components/ui";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b py-1.5 text-sm last:border-0"><span className="text-muted">{k}</span><span className="text-right font-medium">{v || "-"}</span></div>;
}

export default function Employee360({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<any>(`/employees/${id}/360`);
  const depts = useApi<any[]>("/departments");
  const desigs = useApi<any[]>("/designations");
  const [edit, setEdit] = useState<any>(null);
  const [salary, setSalary] = useState<any>(null);
  const [err, setErr] = useState("");
  const isHR = user?.role === "hr";

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;
  const p = data.profile;
  const isSelf = user?.employee_id === p.id;

  async function save(path: string, body: any, method = "PUT") {
    setErr("");
    try { await api(path, { method, body }); toast("Saved"); setEdit(null); setSalary(null); reload(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); }
  }

  return (
    <>
      <PageHeader title={`${p.first_name} ${p.last_name}`} subtitle={`${p.code} · ${p.designation || "No designation"} · ${p.department || "No department"}`}
        actions={<>
          <StatusBadge status={p.status} />
          {isHR && <Button variant="secondary" onClick={() => setEdit({ ...p, department_id: p.department_id ?? "", designation_id: p.designation_id ?? "" })}>Edit</Button>}
          {isHR && !isSelf && <Button variant="secondary" onClick={() => setSalary({ basic_salary: p.basic_salary, hra_pct: p.hra_pct, medical_pct: p.medical_pct })}>Salary structure</Button>}
          <Link href="/employees"><Button variant="ghost">Back</Button></Link>
        </>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Profile">
          <Row k="Email" v={p.email} /><Row k="Phone" v={p.phone} /><Row k="Address" v={p.address} /><Row k="Gender" v={p.gender} />
          <Row k="Login role" v={<span className="capitalize">{p.role}</span>} /><Row k="Joined" v={fmtDate(p.join_date)} />
          {p.exit_date && <Row k="Exit date" v={fmtDate(p.exit_date)} />}
          {p.basic_salary != null && <><Row k="Basic salary" v={money(p.basic_salary)} /><Row k="Gross (basic + HRA + medical)" v={money(p.basic_salary * (1 + p.hra_pct / 100 + p.medical_pct / 100))} /></>}
        </Card>
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Present" value={["present", "late", "half_day", "missing_checkout"].reduce((a, k) => a + (data.attendance.summary[k] || 0), 0)} sub={data.attendance.month} />
            <Stat label="Late" value={data.attendance.summary.late || 0} tone="amber" />
            <Stat label="Absent" value={data.attendance.summary.absent || 0} tone="red" />
            <Stat label="On leave" value={data.attendance.summary.on_leave || 0} />
          </div>
          <Card title="Leave balance" pad={false}>
            <Table head={["Type", "Quota", "Used", "Pending", "Left"]}>
              {data.leave.balances.map((b: any) => <tr key={b.code}><Td>{b.name}</Td><Td>{b.yearly_quota ?? "Unlimited"}</Td><Td>{b.used}</Td><Td>{b.pending}</Td><Td className="font-medium">{b.remaining ?? "-"}</Td></tr>)}
            </Table>
          </Card>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Attendance calendar"><AttendanceCalendar employeeId={p.id} /></Card>
        <div className="space-y-4">
          <Card title="Leave history" pad={false}>
            {data.leave.history.length === 0 ? <p className="p-4 text-sm text-muted">No leave requests.</p> : (
              <Table head={["Type", "Dates", "Days", "Status"]}>
                {data.leave.history.slice(0, 8).map((l: any) => <tr key={l.id}><Td>{l.leave_type}</Td><Td className="whitespace-nowrap">{fmtDate(l.start_date)} - {fmtDate(l.end_date)}</Td><Td>{l.days}</Td><Td><StatusBadge status={l.status} /></Td></tr>)}
              </Table>
            )}
          </Card>
          <Card title="Payslips" pad={false}>
            {data.payslips.length === 0 ? <p className="p-4 text-sm text-muted">No payslips yet.</p> : (
              <Table head={["Month", "Gross", "Net", "Run"]}>
                {data.payslips.map((s: any) => <tr key={s.id}><Td>{s.month}</Td><Td>{money(s.gross)}</Td><Td>{money(s.net)}</Td><Td><StatusBadge status={s.status} /></Td></tr>)}
              </Table>
            )}
          </Card>
        </div>
      </div>

      <Modal open={!!edit} title="Edit employee" onClose={() => setEdit(null)} wide>
        {edit && (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
            e.preventDefault();
            save(`/employees/${p.id}`, { first_name: edit.first_name, last_name: edit.last_name, phone: edit.phone, address: edit.address, gender: edit.gender, status: edit.status,
              department_id: Number(edit.department_id), designation_id: edit.designation_id ? Number(edit.designation_id) : null, exit_date: edit.status === "exited" ? edit.exit_date || null : null });
          }}>
            {err && <div className="sm:col-span-2"><ErrorBox message={err} /></div>}
            <Field label="First name"><Input required value={edit.first_name} onChange={(e) => setEdit({ ...edit, first_name: e.target.value })} /></Field>
            <Field label="Last name"><Input value={edit.last_name} onChange={(e) => setEdit({ ...edit, last_name: e.target.value })} /></Field>
            <Field label="Phone"><Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Gender"><Select value={edit.gender} onChange={(e) => setEdit({ ...edit, gender: e.target.value })}><option value="unspecified">Unspecified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select></Field>
            <Field label="Department"><Select required value={edit.department_id} onChange={(e) => setEdit({ ...edit, department_id: e.target.value })}>{depts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Field label="Designation"><Select value={edit.designation_id} onChange={(e) => setEdit({ ...edit, designation_id: e.target.value })}><option value="">None</option>{desigs.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Field label="Status"><Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="active">Active</option><option value="probation">Probation</option><option value="exited">Exited</option></Select></Field>
            {edit.status === "exited" && <Field label="Exit date"><Input type="date" required value={edit.exit_date || ""} onChange={(e) => setEdit({ ...edit, exit_date: e.target.value })} /></Field>}
            <div className="sm:col-span-2"><Field label="Address"><Input value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Button type="submit">Save</Button></div>
          </form>
        )}
      </Modal>
      <Modal open={!!salary} title="Salary structure" onClose={() => setSalary(null)}>
        {salary && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(`/employees/${p.id}/salary`, { basic_salary: Number(salary.basic_salary), hra_pct: Number(salary.hra_pct), medical_pct: Number(salary.medical_pct) }); }}>
            {err && <ErrorBox message={err} />}
            <Field label="Basic salary (monthly)"><Input type="number" min={1} required value={salary.basic_salary} onChange={(e) => setSalary({ ...salary, basic_salary: e.target.value })} /></Field>
            <Field label="HRA % of basic"><Input type="number" min={0} max={100} value={salary.hra_pct} onChange={(e) => setSalary({ ...salary, hra_pct: e.target.value })} /></Field>
            <Field label="Medical % of basic"><Input type="number" min={0} max={100} value={salary.medical_pct} onChange={(e) => setSalary({ ...salary, medical_pct: e.target.value })} /></Field>
            <p className="text-xs text-muted">Gross = basic + HRA + medical = {money(Number(salary.basic_salary) * (1 + Number(salary.hra_pct) / 100 + Number(salary.medical_pct) / 100))}</p>
            <Button type="submit">Save</Button>
          </form>
        )}
      </Modal>
    </>
  );
}
