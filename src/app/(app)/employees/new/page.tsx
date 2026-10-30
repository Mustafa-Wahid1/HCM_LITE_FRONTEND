"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, ApiError } from "@/lib/api";
import { Button, Card, ErrorBox, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";

// HR registers employees; Admin uses the same form to create HR logins (/hr-users)
export default function NewEmployeePage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";
  const depts = useApi<any[]>("/departments");
  const desigs = useApi<any[]>("/designations");
  const [f, setF] = useState<any>({ first_name: "", last_name: "", email: "", phone: "", address: "", gender: "unspecified", department_id: "", designation_id: "", join_date: new Date().toLocaleDateString("en-CA"), status: "active", basic_salary: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [creds, setCreds] = useState<{ email: string; pw: string; id: number } | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const body: any = { ...f, department_id: Number(f.department_id), designation_id: f.designation_id ? Number(f.designation_id) : null };
      if (f.basic_salary !== "") body.basic_salary = Number(f.basic_salary); else delete body.basic_salary;
      const r = await api<any>(isAdmin ? "/hr-users" : "/employees", { body });
      setCreds({ email: f.email, pw: r.temporary_password, id: r.employee.id });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title={isAdmin ? "Create HR login" : "Register employee"} subtitle="This creates the login with a temporary password that must be changed on first sign-in." />
      <Card>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {error && <div className="sm:col-span-2"><ErrorBox message={error} /></div>}
          <Field label="First name"><Input required value={f.first_name} onChange={set("first_name")} /></Field>
          <Field label="Last name"><Input value={f.last_name} onChange={set("last_name")} /></Field>
          <Field label="Email (login)"><Input type="email" required value={f.email} onChange={set("email")} /></Field>
          <Field label="Phone"><Input value={f.phone} onChange={set("phone")} /></Field>
          <Field label="Department"><Select required value={f.department_id} onChange={set("department_id")}><option value="">Select...</option>{depts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
          <Field label="Designation"><Select value={f.designation_id} onChange={set("designation_id")}><option value="">None</option>{desigs.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
          <Field label="Join date"><Input type="date" required value={f.join_date} onChange={set("join_date")} /></Field>
          <Field label="Gender"><Select value={f.gender} onChange={set("gender")}><option value="unspecified">Unspecified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select></Field>
          {!isAdmin && <Field label="Status"><Select value={f.status} onChange={set("status")}><option value="active">Active</option><option value="probation">Probation</option></Select></Field>}
          <Field label={isAdmin ? "Basic salary (HR can set later)" : "Basic salary (monthly)"} hint="Gross = 1.5 x basic (HRA 40%, medical 10%)"><Input type="number" min={1} required={!isAdmin} value={f.basic_salary} onChange={set("basic_salary")} /></Field>
          <div className="sm:col-span-2"><Field label="Address"><Textarea rows={2} value={f.address} onChange={set("address")} /></Field></div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" loading={busy}>Create login & save</Button>
            <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </Card>
      <Modal open={!!creds} title="Login created" onClose={() => router.replace(isAdmin ? "/users" : `/employees/${creds?.id}`)}>
        <p className="text-sm">Share these credentials with the employee. The password is shown <b>only once</b> and must be changed on first sign-in.</p>
        <div className="mt-3 space-y-1 rounded-lg bg-soft p-3 font-mono text-sm"><div>{creds?.email}</div><div>{creds?.pw}</div></div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(`${creds?.email} / ${creds?.pw}`)}>Copy</Button>
          <Button onClick={() => router.replace(isAdmin ? "/users" : `/employees/${creds?.id}`)}>Done</Button>
        </div>
      </Modal>
    </>
  );
}
