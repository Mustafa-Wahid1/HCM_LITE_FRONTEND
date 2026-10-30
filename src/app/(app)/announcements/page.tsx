"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, ApiError, fmtDate } from "@/lib/api";
import { Button, Card, Empty, ErrorBox, Field, Input, Loading, PageHeader, Textarea, useToast } from "@/components/ui";

export default function Announcements() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<any[]>("/announcements");
  const [f, setF] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const canPost = user?.role !== "employee";

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await api("/announcements", { body: f }); toast("Announcement posted"); setF({ title: "", body: "" }); reload(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  async function del(id: number) {
    try { await api(`/announcements/${id}`, { method: "DELETE" }); reload(); } catch (e) { toast(e instanceof ApiError ? e.message : "Failed", "err"); }
  }

  return (
    <>
      <PageHeader title="Announcements" subtitle="Company-wide news. Everyone is notified when something is posted." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {error && <ErrorBox message={error} onRetry={reload} />}
          {loading && !data && <Loading />}
          {data && data.length === 0 && <Card><Empty title="No announcements yet" /></Card>}
          {data?.map((a) => (
            <Card key={a.id} title={a.title} actions={canPost && <Button size="sm" variant="ghost" onClick={() => del(a.id)} aria-label="Delete announcement"><Trash2 className="h-4 w-4" /></Button>}>
              <p className="whitespace-pre-wrap text-sm">{a.body}</p>
              <p className="mt-2 text-xs text-muted">{a.author || "System"} · {fmtDate(a.created_at)}</p>
            </Card>
          ))}
        </div>
        {canPost && (
          <Card title="Post an announcement" className="self-start">
            <form onSubmit={post} className="space-y-3">
              {err && <ErrorBox message={err} />}
              <Field label="Title"><Input required minLength={2} maxLength={150} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
              <Field label="Message"><Textarea required minLength={2} rows={5} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
              <Button type="submit" loading={busy} className="w-full">Post</Button>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}
