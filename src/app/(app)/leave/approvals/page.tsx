"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, ApiError, fmtDate } from "@/lib/api";
import { Button, Card, Empty, ErrorBox, Field, Loading, Modal, PageHeader, StatusBadge, Table, Td, Textarea, useToast } from "@/components/ui";

export default function Approvals() {
  const { user } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState("pending");
  const { data, error, loading, reload } = useApi<any[]>(`/leave?status=${status}`);
  const [sel, setSel] = useState<{ l: any; approve: boolean } | null>(null);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const canReview = (l: any) => l.status === "pending" && l.employee_id !== user?.employee_id && (user?.role === "hr" ? l.employee_role !== "hr" : l.employee_role === "hr");

  async function decide() {
    if (!sel) return;
    if (!sel.approve && !comment.trim()) return setErr("Please add a comment when rejecting");
    setBusy(true); setErr("");
    try {
      await api(`/leave/${sel.l.id}/${sel.approve ? "approve" : "reject"}`, { body: { comment: comment || undefined } });
      toast(sel.approve ? "Leave approved" : "Leave rejected"); setSel(null); setComment(""); reload();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Leave approvals" subtitle={user?.role === "hr" ? "Approve or reject employee requests. HR leave is approved by Admin." : "Approve HR leave requests. Employee requests are handled by HR."}
        actions={<div className="flex gap-1">{["pending", "approved", "rejected", "cancelled"].map((s) => <Button key={s} size="sm" variant={status === s ? "primary" : "secondary"} onClick={() => setStatus(s)} className="capitalize">{s}</Button>)}</div>} />
      <Card pad={false}>
        {error && <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div>}
        {loading && !data && <Loading />}
        {data && data.length === 0 && <Empty title={`No ${status} leave requests`} />}
        {data && data.length > 0 && (
          <Table head={["Employee", "Type", "Dates", "Days", "Reason", "Status", ""]}>
            {data.map((l) => (
              <tr key={l.id}>
                <Td><div className="font-medium">{l.employee_name}</div><div className="text-xs text-muted">{l.department || "-"}</div></Td>
                <Td>{l.leave_type}</Td><Td className="whitespace-nowrap">{fmtDate(l.start_date)}{l.end_date !== l.start_date && ` - ${fmtDate(l.end_date)}`}</Td>
                <Td>{l.days}</Td><Td className="max-w-xs">{l.reason || "-"}</Td><Td><StatusBadge status={l.status} /></Td>
                <Td className="whitespace-nowrap">{canReview(l) && <><Button size="sm" onClick={() => { setErr(""); setSel({ l, approve: true }); }}>Approve</Button> <Button size="sm" variant="secondary" onClick={() => { setErr(""); setSel({ l, approve: false }); }}>Reject</Button></>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!sel} title={sel?.approve ? "Approve leave" : "Reject leave"} onClose={() => setSel(null)}>
        {sel && <p className="mb-3 text-sm">{sel.l.employee_name}: {sel.l.leave_type}, {fmtDate(sel.l.start_date)} to {fmtDate(sel.l.end_date)} ({sel.l.days} day(s))</p>}
        {err && <ErrorBox message={err} />}
        <Field label={sel?.approve ? "Comment (optional)" : "Comment (required)"}><Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        <Button className="mt-3" variant={sel?.approve ? "primary" : "danger"} loading={busy} onClick={decide}>{sel?.approve ? "Approve" : "Reject"}</Button>
      </Modal>
    </>
  );
}
