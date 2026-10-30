"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useApi } from "@/lib/hooks";
import { api, ApiError, fmtDate } from "@/lib/api";
import { Button, Card, Empty, ErrorBox, Field, Input, Loading, PageHeader, Select, StatusBadge, Table, Td, Textarea, useToast } from "@/components/ui";

export default function MyLeave() {
  const toast = useToast();
  const [k, setK] = useState(0);
  const bal = useApi<any>(`/leave/balance?k=${k}`);
  const hist = useApi<any[]>(`/leave?mine=true&k=${k}`);
  const types = useApi<any[]>("/leave-types");

  const today = new Date().toLocaleDateString("en-CA");
  const [f, setF] = useState({ leave_type_id: "", start_date: today, end_date: today, reason: "" });
  const [preview, setPreview] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [text, setText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!f.start_date || !f.end_date || f.end_date < f.start_date) { setPreview(null); return; }
    const t = setTimeout(() => api<any>(`/leave/preview?start_date=${f.start_date}&end_date=${f.end_date}`).then((r) => setPreview(r.working_days)).catch(() => setPreview(null)), 250);
    return () => clearTimeout(t);
  }, [f.start_date, f.end_date]);

  async function smart() {
    setAiBusy(true); setAiMsg(null);
    try {
      const r = await api<any>("/ai/smart-leave", { body: { text } });
      const s = r.suggestion;
      setF({ leave_type_id: String(s.leave_type_id), start_date: s.start_date, end_date: s.end_date, reason: s.reason || "" });
      setAiMsg({ kind: "ok", text: `AI-generated: ${s.leave_type}, ${fmtDate(s.start_date)} to ${fmtDate(s.end_date)} (${s.working_days} working day${s.working_days === 1 ? "" : "s"}). Review the form below and confirm - nothing is saved yet.` });
    } catch (e) {
      setAiMsg({ kind: "err", text: (e instanceof ApiError ? e.message : "AI is unavailable.") + " You can fill the form manually." });
    } finally { setAiBusy(false); }
  }

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/leave", { body: { leave_type_id: Number(f.leave_type_id), start_date: f.start_date, end_date: f.end_date, reason: f.reason || undefined } });
      toast("Leave request sent"); setK(k + 1); setText(""); setAiMsg(null); setF({ ...f, reason: "" });
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function cancel(id: number) {
    try { await api(`/leave/${id}/cancel`, { method: "POST", body: {} }); toast("Leave cancelled"); setK(k + 1); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed", "err"); }
  }

  return (
    <>
      <PageHeader title="My leave" subtitle="Weekends and public holidays are not counted. Approval is by HR (HR requests go to Admin)." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Balance (this year)" pad={false}>
            {bal.loading && !bal.data && <Loading />}
            {bal.error && <div className="p-4"><ErrorBox message={bal.error} onRetry={bal.reload} /></div>}
            {bal.data && (
              <Table head={["Type", "Quota", "Approved", "Pending", "Left"]}>
                {bal.data.balances.map((b: any) => <tr key={b.code}><Td>{b.name}</Td><Td>{b.yearly_quota ?? "Unlimited"}</Td><Td>{b.used}</Td><Td>{b.pending}</Td><Td className="font-semibold">{b.remaining ?? "-"}</Td></tr>)}
              </Table>
            )}
          </Card>
          <Card title="History" pad={false}>
            {hist.loading && !hist.data && <Loading />}
            {hist.data && hist.data.length === 0 && <Empty title="No leave requests yet" hint="Use the form to apply, or describe your leave in plain words." />}
            {hist.data && hist.data.length > 0 && (
              <Table head={["Type", "Dates", "Days", "Status", "Comment", ""]}>
                {hist.data.map((l) => (
                  <tr key={l.id}>
                    <Td>{l.leave_type}</Td><Td className="whitespace-nowrap">{fmtDate(l.start_date)}{l.end_date !== l.start_date && ` - ${fmtDate(l.end_date)}`}</Td><Td>{l.days}</Td>
                    <Td><StatusBadge status={l.status} /></Td><Td className="max-w-[10rem]">{l.review_comment || "-"}</Td>
                    <Td>{["pending", "approved"].includes(l.status) && l.start_date >= today && <Button size="sm" variant="ghost" onClick={() => cancel(l.id)}>Cancel</Button>}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Smart leave</span>}>
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. I need next Monday and Tuesday off for my sister's wedding" aria-label="Describe your leave" />
            <Button className="mt-2 w-full" variant="secondary" onClick={smart} loading={aiBusy} disabled={text.trim().length < 3}>Fill the form for me</Button>
            {aiMsg && <p className={`mt-2 text-xs ${aiMsg.kind === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-red-600"}`}>{aiMsg.text}</p>}
          </Card>
          <Card title="Apply for leave">
            <form onSubmit={apply} className="space-y-3">
              {err && <ErrorBox message={err} />}
              <Field label="Type"><Select required value={f.leave_type_id} onChange={(e) => setF({ ...f, leave_type_id: e.target.value })}><option value="">Select...</option>{types.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From"><Input type="date" required min={today} value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value, end_date: f.end_date < e.target.value ? e.target.value : f.end_date })} /></Field>
                <Field label="To"><Input type="date" required min={f.start_date} value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
              </div>
              {preview !== null && <p className="text-xs text-muted">{preview} working day{preview === 1 ? "" : "s"} will be deducted.</p>}
              <Field label="Reason"><Textarea rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
              <Button type="submit" loading={busy} className="w-full">Submit request</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
