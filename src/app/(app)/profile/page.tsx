"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, ApiError, fmtDate, money } from "@/lib/api";
import { Button, Card, ErrorBox, Field, Input, Loading, PageHeader, Textarea, useToast } from "@/components/ui";

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<any>(user?.employee_id ? `/employees/${user.employee_id}` : null);
  const [f, setF] = useState({ phone: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (data) setF({ phone: data.phone || "", address: data.address || "" }); }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await api("/me/profile", { method: "PATCH", body: f }); toast("Profile updated"); reload(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="My profile" actions={<Link href="/change-password"><Button variant="secondary">Change password</Button></Link>} />
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Details">
            {[["Name", `${data.first_name} ${data.last_name}`], ["Employee code", data.code], ["Email", data.email], ["Department", data.department], ["Designation", data.designation], ["Joined", fmtDate(data.join_date)], ["Basic salary", money(data.basic_salary)]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-1.5 text-sm last:border-0"><span className="text-muted">{k}</span><span className="font-medium">{v || "-"}</span></div>
            ))}
          </Card>
          <Card title="Contact (you can edit these)">
            <form onSubmit={save} className="space-y-3">
              {err && <ErrorBox message={err} />}
              <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
              <Field label="Address"><Textarea rows={3} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
              <Button type="submit" loading={busy}>Save</Button>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
