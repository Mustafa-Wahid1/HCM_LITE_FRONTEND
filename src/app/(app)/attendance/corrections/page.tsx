"use client";
import { useState } from "react";
import { useApi } from "@/lib/hooks";
import { api, ApiError, fmtDate } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, StatusBadge, Table, Td, Textarea, useToast } from "@/components/ui";

export default function Corrections() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState("pending");
  const { data, error, loading, reload } = useApi<any[]>(`/attendance/corrections?status=${status}`);
  const [sel, setSel] = useState<{ c: any; approve: boolean } | null>(null);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const canReview = (c: any) => c.status === "pending" && c.employee_id !== user?.employee_id && (user?.role === "hr" ? c.employee_role !== "hr" : c.employee_role === "hr");

  async function decide() {
    if (!sel) return;
    setBusy(true); setErr("");
    try {
      await api(`/attendance/corrections/${sel.c.id}/${sel.approve ? "approve" : "reject"}`, { body: { comment: comment || undefined } });
      toast(sel.approve ? "Correction approved" : "Correction rejected"); setSel(null); setComment(""); reload();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Attendance corrections" subtitle={user?.role === "hr" ? "Review employee requests. HR requests are reviewed by Admin." : "Review corrections requested by HR."}
        actions={<div className="flex gap-1">{["pending", "approved", "rejected"].map((s) => <Button key={s} size="sm" variant={status === s ? "primary" : "secondary"} onClick={() => setStatus(s)} className="capitalize">{s}</Button>)}</div>} />
      <Card pad={false}>
        {error && <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div>}
        {loading && !data && <Loading />}
        {data && data.length === 0 && <Empty title={`No ${status} requests`} />}
        {data && data.length > 0 && (
          <Table head={["Employee", "Date", "In", "Out", "Reason", "Status", ""]}>
            {data.map((c) => (
              <tr key={c.id}>
                <Td><div className="font-medium">{c.employee_name}</div><div className="font-mono text-xs text-muted">{c.employee_code}</div></Td>
                <Td>{fmtDate(c.date)}</Td><Td>{c.check_in_time || "-"}</Td><Td>{c.check_out_time || "-"}</Td><Td className="max-w-xs">{c.reason}</Td>
                <Td><StatusBadge status={c.status} /></Td>
                <Td className="whitespace-nowrap">{canReview(c) && <><Button size="sm" onClick={() => setSel({ c, approve: true })}>Approve</Button> <Button size="sm" variant="secondary" onClick={() => setSel({ c, approve: false })}>Reject</Button></>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!sel} title={sel?.approve ? "Approve correction" : "Reject correction"} onClose={() => setSel(null)}>
        {err && <ErrorBox message={err} />}
        <Field label="Comment (optional)"><Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        <Button className="mt-3" variant={sel?.approve ? "primary" : "danger"} loading={busy} onClick={decide}>{sel?.approve ? "Approve" : "Reject"}</Button>
      </Modal>
    </>
  );
}
