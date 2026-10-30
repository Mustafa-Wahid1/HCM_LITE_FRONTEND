"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, ApiError, money, thisMonth } from "@/lib/api";
import { Button, Card, Empty, ErrorBox, Field, Input, Loading, Modal, PageHeader, Stat, StatusBadge, Table, Td, useToast } from "@/components/ui";

export default function Payroll() {
  const { user } = useAuth();
  const toast = useToast();
  const [k, setK] = useState(0);
  const runs = useApi<any[]>(`/payroll/runs?k=${k}`);
  const [openId, setOpenId] = useState<number | null>(null);
  const detail = useApi<any>(openId ? `/payroll/runs/${openId}?k=${k}` : null);
  const [month, setMonth] = useState(thisMonth());
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState(false);
  const isHR = user?.role === "hr";
  const isAdmin = user?.role === "admin";

  async function generate(m: string) {
    setBusy("gen");
    try {
      const r = await api<any>("/payroll/runs", { body: { month: m } });
      toast(`Draft for ${m} ready (${r.payslips.length} payslips)`); setOpenId(r.id); setK(k + 1);
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed", "err"); }
    finally { setBusy(""); }
  }
  async function finalize() {
    setBusy("fin");
    try { await api(`/payroll/runs/${openId}/finalize`, { method: "POST", body: {} }); toast("Payroll finalized and locked"); setConfirm(false); setK(k + 1); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed", "err"); setConfirm(false); }
    finally { setBusy(""); }
  }

  const d = detail.data;
  return (
    <>
      <PageHeader title="Payroll" subtitle="HR prepares the monthly draft; only Admin can finalize (which locks the month)."
        actions={isHR && (
          <>
            <Field label="Month"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Field>
            <Button onClick={() => generate(month)} loading={busy === "gen"} className="self-end">Create / recalculate draft</Button>
          </>
        )} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Runs" pad={false} className="lg:col-span-1">
          {runs.loading && !runs.data && <Loading />}
          {runs.error && <div className="p-4"><ErrorBox message={runs.error} onRetry={runs.reload} /></div>}
          {runs.data && runs.data.length === 0 && <Empty title="No payroll runs yet" hint={isHR ? "Pick a month and create the first draft." : "HR has not created a draft yet."} />}
          {runs.data && runs.data.length > 0 && (
            <ul className="divide-y">
              {runs.data.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setOpenId(r.id)} className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-soft ${openId === r.id ? "bg-soft" : ""}`}>
                    <div><div className="font-medium">{r.month}</div><div className="text-xs text-muted">{r.employees} employees · net {money(r.total_net)}</div></div>
                    <StatusBadge status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="lg:col-span-2">
          {!openId && <Card><Empty title="Select a payroll run" hint="Open a run to review each payslip." /></Card>}
          {openId && detail.loading && !d && <Loading />}
          {detail.error && <ErrorBox message={detail.error} onRetry={detail.reload} />}
          {d && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Employees" value={d.totals.employees} />
                <Stat label="Gross (earned)" value={money(d.totals.total_earned)} />
                <Stat label="Tax" value={money(d.totals.total_tax)} />
                <Stat label="Net pay" value={money(d.totals.total_net)} tone="green" />
              </div>
              <Card title={<span className="flex items-center gap-2">Payslips {d.month} <StatusBadge status={d.status} /></span>}
                actions={isAdmin && d.status === "draft" && <Button size="sm" onClick={() => setConfirm(true)}>Finalize & lock</Button>} pad={false}>
                <Table head={["Employee", "Gross", "Days", "Absent", "Unpaid", "Half", "Deductions", "Tax", "Net"]}>
                  {d.payslips.map((p: any) => (
                    <tr key={p.id}>
                      <Td><div className="font-medium">{p.employee_name}</div><div className="text-xs text-muted">{p.department || "-"}</div></Td>
                      <Td>{money(p.gross)}{p.employed_days !== p.working_days && <div className="text-[11px] text-muted">prorated {money(p.earned_gross)}</div>}</Td>
                      <Td>{p.employed_days}/{p.working_days}</Td><Td>{p.absent_days}</Td><Td>{p.unpaid_days}</Td><Td>{p.half_days}</Td>
                      <Td>{money(p.deductions)}</Td><Td>{money(p.tax)}</Td><Td className="font-semibold">{money(p.net)}</Td>
                    </tr>
                  ))}
                </Table>
              </Card>
              {d.status === "draft" && <p className="text-xs text-muted">Draft: attendance and leave changes are picked up when HR recalculates. Finalized runs are locked.</p>}
            </div>
          )}
        </div>
      </div>
      <Modal open={confirm} title="Finalize payroll?" onClose={() => setConfirm(false)}>
        <p className="text-sm">This locks <b>{d?.month}</b>. It can no longer be recalculated or edited, and every employee is notified that their payslip is ready.</p>
        <div className="mt-4 flex gap-2"><Button onClick={finalize} loading={busy === "fin"}>Finalize</Button><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button></div>
      </Modal>
    </>
  );
}
