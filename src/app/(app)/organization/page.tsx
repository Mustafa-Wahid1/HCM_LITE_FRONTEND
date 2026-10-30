"use client";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, ApiError, fmtDate } from "@/lib/api";
import { Button, Card, Empty, ErrorBox, Field, Input, Loading, PageHeader, Select, Table, Td, useToast, cx } from "@/components/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Settings({ readOnly }: { readOnly: boolean }) {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<any>("/settings");
  const [f, setF] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (data) setF({ ...data, office_lat: data.office_lat ?? "", office_lng: data.office_lng ?? "" }); }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/settings", { method: "PUT", body: {
        company_name: f.company_name, timezone: f.timezone, office_start: f.office_start, grace_minutes: Number(f.grace_minutes), half_day_hours: Number(f.half_day_hours),
        weekend_days: f.weekend_days, radius_m: Number(f.radius_m),
        office_lat: f.office_lat === "" ? null : Number(f.office_lat), office_lng: f.office_lng === "" ? null : Number(f.office_lng),
      } });
      toast("Settings saved (applies to new records only)"); reload();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => setF({ ...f, office_lat: p.coords.latitude.toFixed(6), office_lng: p.coords.longitude.toFixed(6) }),
      () => toast("Could not read your location", "err"));
  }

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!f) return null;
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      {err && <div className="sm:col-span-2"><ErrorBox message={err} /></div>}
      <Field label="Company name"><Input disabled={readOnly} required value={f.company_name} onChange={set("company_name")} /></Field>
      <Field label="Time zone" hint="IANA name, e.g. Asia/Karachi"><Input disabled={readOnly} required value={f.timezone} onChange={set("timezone")} /></Field>
      <Field label="Office start"><Input type="time" disabled={readOnly} required value={f.office_start} onChange={set("office_start")} /></Field>
      <Field label="Grace time (minutes)" hint="Check-in after start + grace is late"><Input type="number" min={0} disabled={readOnly} value={f.grace_minutes} onChange={set("grace_minutes")} /></Field>
      <Field label="Half day under (hours)"><Input type="number" step="0.5" min={1} disabled={readOnly} value={f.half_day_hours} onChange={set("half_day_hours")} /></Field>
      <Field label="Weekend">
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d, i) => {
            const on = f.weekend_days.includes(i);
            return <button type="button" key={d} disabled={readOnly} onClick={() => setF({ ...f, weekend_days: on ? f.weekend_days.filter((x: number) => x !== i) : [...f.weekend_days, i] })}
              className={cx("rounded-lg border px-2.5 py-1.5 text-sm", on ? "bg-primary text-primary-fg" : "bg-card")} aria-pressed={on}>{d}</button>;
          })}
        </div>
      </Field>
      <Field label="Office latitude"><Input type="number" step="any" disabled={readOnly} value={f.office_lat} onChange={set("office_lat")} /></Field>
      <Field label="Office longitude"><Input type="number" step="any" disabled={readOnly} value={f.office_lng} onChange={set("office_lng")} /></Field>
      <Field label="Allowed radius (meters)" hint="Used by camera check-in"><Input type="number" min={10} disabled={readOnly} value={f.radius_m} onChange={set("radius_m")} /></Field>
      {!readOnly && (
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" loading={busy}>Save settings</Button>
          <Button type="button" variant="secondary" onClick={locate}>Use my current location</Button>
        </div>
      )}
    </form>
  );
}

function Lookup({ path, label, cols, fields, readOnly }: { path: string; label: string; cols: { key: string; label: string; render?: (r: any) => React.ReactNode }[]; fields: { key: string; label: string; type?: string; placeholder?: string; optional?: boolean }[]; readOnly: boolean }) {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<any[]>(path);
  const [f, setF] = useState<any>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const body: any = {};
      for (const fld of fields) {
        const v = f[fld.key];
        if (fld.type === "number") body[fld.key] = v === "" || v == null ? (fld.optional ? null : undefined) : Number(v);
        else if (fld.type === "checkbox") body[fld.key] = v !== false;
        else body[fld.key] = v;
      }
      await api(path, { body }); toast(`${label} added`); setF({}); reload();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  async function remove(id: number) {
    try { await api(`${path}/${id}`, { method: "DELETE" }); toast(`${label} deleted`); reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : "Failed", "err"); }
  }

  return (
    <div>
      {!readOnly && (
        <form onSubmit={add} className="mb-4 flex flex-wrap items-end gap-2">
          {fields.map((fld) => (
            <Field key={fld.key} label={fld.label}>
              {fld.type === "checkbox"
                ? <Select value={f[fld.key] === false ? "no" : "yes"} onChange={(e) => setF({ ...f, [fld.key]: e.target.value === "yes" })}><option value="yes">Yes</option><option value="no">No</option></Select>
                : <Input type={fld.type || "text"} required={!fld.optional} placeholder={fld.placeholder} value={f[fld.key] ?? ""} onChange={(e) => setF({ ...f, [fld.key]: e.target.value })} />}
            </Field>
          ))}
          <Button type="submit" loading={busy}>Add {label.toLowerCase()}</Button>
        </form>
      )}
      {err && <div className="mb-3"><ErrorBox message={err} /></div>}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && data.length === 0 && <Empty title={`No ${label.toLowerCase()}s yet`} hint={readOnly ? undefined : "Add the first one above."} />}
      {data && data.length > 0 && (
        <Table head={[...cols.map((c) => c.label), ...(readOnly ? [] : [""])]}>
          {data.map((r) => (
            <tr key={r.id}>
              {cols.map((c) => <Td key={c.key}>{c.render ? c.render(r) : r[c.key]}</Td>)}
              {!readOnly && <Td><Button size="sm" variant="ghost" onClick={() => remove(r.id)} aria-label={`Delete ${label}`}><Trash2 className="h-4 w-4" /></Button></Td>}
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

export default function Organization() {
  const { user } = useAuth();
  const readOnly = user?.role !== "admin";
  const tabs = ["Company settings", "Departments", "Designations", "Leave types", "Holidays"];
  const [tab, setTab] = useState(0);
  return (
    <>
      <PageHeader title="Organization setup" subtitle={readOnly ? "Read-only view. Only Admin can change these." : "Rules apply to new records only."} />
      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {tabs.map((t, i) => <button key={t} onClick={() => setTab(i)} className={cx("-mb-px border-b-2 px-3 py-2 text-sm", tab === i ? "border-primary font-semibold text-primary" : "border-transparent text-muted hover:text-foreground")}>{t}</button>)}
      </div>
      <Card>
        {tab === 0 && <Settings readOnly={readOnly} />}
        {tab === 1 && <Lookup path="/departments" label="Department" readOnly={readOnly} cols={[{ key: "name", label: "Name" }]} fields={[{ key: "name", label: "Name", placeholder: "Engineering" }]} />}
        {tab === 2 && <Lookup path="/designations" label="Designation" readOnly={readOnly} cols={[{ key: "name", label: "Name" }]} fields={[{ key: "name", label: "Name", placeholder: "Senior Developer" }]} />}
        {tab === 3 && <Lookup path="/leave-types" label="Leave type" readOnly={readOnly}
          cols={[{ key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "yearly_quota", label: "Yearly quota", render: (r) => r.yearly_quota ?? "Unlimited" }, { key: "paid", label: "Paid", render: (r) => (r.paid ? "Yes" : "No") }]}
          fields={[{ key: "name", label: "Name" }, { key: "code", label: "Code", placeholder: "maternity" }, { key: "yearly_quota", label: "Yearly quota", type: "number", optional: true, placeholder: "blank = unlimited" }, { key: "paid", label: "Paid", type: "checkbox" }]} />}
        {tab === 4 && <Lookup path="/holidays" label="Holiday" readOnly={readOnly} cols={[{ key: "date", label: "Date", render: (r) => fmtDate(r.date) }, { key: "name", label: "Name" }]} fields={[{ key: "date", label: "Date", type: "date" }, { key: "name", label: "Name", placeholder: "Eid ul Fitr" }]} />}
      </Card>
    </>
  );
}
