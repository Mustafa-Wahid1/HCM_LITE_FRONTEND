"use client";
import { useState } from "react";
import { CheckInWidget } from "@/components/CheckInWidget";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { useApi } from "@/lib/hooks";
import { api, ApiError, fmtDate } from "@/lib/api";
import { Button, Card, Empty, ErrorBox, Field, Input, Modal, PageHeader, StatusBadge, Table, Td, Textarea, useToast } from "@/components/ui";

export default function MyAttendance() {
  const toast = useToast();
  const [k, setK] = useState(0);
  const corr = useApi<any[]>(`/attendance/corrections?k=${k}`);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: new Date().toLocaleDateString("en-CA"), check_in_time: "", check_out_time: "", reason: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/attendance/corrections", { body: { date: f.date, reason: f.reason, ...(f.check_in_time ? { check_in_time: f.check_in_time } : {}), ...(f.check_out_time ? { check_out_time: f.check_out_time } : {}) } });
      toast("Correction request sent"); setOpen(false); setK(k + 1);
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="My attendance" subtitle="Check in and out, review your calendar, and request corrections." actions={<Button variant="secondary" onClick={() => setOpen(true)}>Request correction</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <CheckInWidget onChange={() => setK(k + 1)} />
        <div className="lg:col-span-2"><Card title="Calendar"><AttendanceCalendar refreshKey={k} /></Card></div>
      </div>
      <Card title="My correction requests" className="mt-4" pad={false}>
        {corr.error && <div className="p-4"><ErrorBox message={corr.error} onRetry={corr.reload} /></div>}
        {corr.data && corr.data.length === 0 && <Empty title="No correction requests" hint="Forgot to check in or out? Request a correction and HR will review it." />}
        {corr.data && corr.data.length > 0 && (
          <Table head={["Date", "Check in", "Check out", "Reason", "Status", "Comment"]}>
            {corr.data.map((c) => <tr key={c.id}><Td>{fmtDate(c.date)}</Td><Td>{c.check_in_time || "-"}</Td><Td>{c.check_out_time || "-"}</Td><Td className="max-w-xs">{c.reason}</Td><Td><StatusBadge status={c.status} /></Td><Td>{c.review_comment || "-"}</Td></tr>)}
          </Table>
        )}
      </Card>
      <Modal open={open} title="Request attendance correction" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          {err && <ErrorBox message={err} />}
          <Field label="Date"><Input type="date" required max={new Date().toLocaleDateString("en-CA")} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in time"><Input type="time" value={f.check_in_time} onChange={(e) => setF({ ...f, check_in_time: e.target.value })} /></Field>
            <Field label="Check-out time"><Input type="time" value={f.check_out_time} onChange={(e) => setF({ ...f, check_out_time: e.target.value })} /></Field>
          </div>
          <Field label="Reason"><Textarea required minLength={5} rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          <Button type="submit" loading={busy}>Send request</Button>
        </form>
      </Modal>
    </>
  );
}
