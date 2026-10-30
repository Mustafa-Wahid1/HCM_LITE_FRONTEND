"use client";
import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button, Card, Empty, ErrorBox, PageHeader, Table, Td, Textarea, useToast } from "@/components/ui";

const SAMPLE = "first_name,last_name,email,department,designation,join_date,basic_salary,phone\nAyesha,Khan,ayesha@example.com,Engineering,Developer,2026-01-15,120000,0300-1111111";

export default function ImportPage() {
  const toast = useToast();
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [creds, setCreds] = useState<any[] | null>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((t) => { setCsv(t); setResult(null); });
  }

  async function run(dry: boolean) {
    setBusy(true); setError("");
    try {
      const r = await api<any>(`/employees/import?dry_run=${dry}`, { body: { csv } });
      setResult(r);
      if (!dry) { setCreds(r.credentials); toast(`${r.imported} employees imported`); }
    } catch (e) {
      if (e instanceof ApiError && e.details) setResult(e.details);
      setError(e instanceof ApiError ? e.message : "Import failed");
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Import employees (CSV)" subtitle="Run a dry run first: every problem is reported with row, field and reason." actions={<Link href="/employees"><Button variant="secondary">Back</Button></Link>} />
      <div className="space-y-4">
        <Card title="1. Provide CSV">
          <p className="mb-2 text-sm text-muted">Required columns: first_name, email, department (must exist), join_date (YYYY-MM-DD), basic_salary (&gt; 0). Optional: last_name, code, designation, phone, address, gender.</p>
          <input type="file" accept=".csv,text/csv" onChange={pick} className="mb-3 block text-sm" aria-label="CSV file" />
          <Textarea rows={6} value={csv} onChange={(e) => { setCsv(e.target.value); setResult(null); }} placeholder={SAMPLE} className="font-mono text-xs" />
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setCsv(SAMPLE)}>Use sample</Button>
            <Button onClick={() => run(true)} loading={busy} disabled={!csv.trim()}>Dry run</Button>
            <Button onClick={() => run(false)} loading={busy} disabled={!csv.trim() || !result || result.error_rows > 0 || !!creds}>Import</Button>
          </div>
        </Card>
        {error && !result && <ErrorBox message={error} />}
        {result && (
          <Card title={`Result: ${result.valid_rows} valid, ${result.error_rows} with errors of ${result.total_rows} rows`}>
            {result.errors?.length === 0 && !creds && <p className="text-sm text-emerald-600">No errors. You can import now.</p>}
            {result.errors?.length > 0 && (
              <Table head={["Row", "Field", "Reason"]}>
                {result.errors.map((e: any, i: number) => <tr key={i}><Td>{e.row}</Td><Td className="font-mono text-xs">{e.field}</Td><Td>{e.reason}</Td></tr>)}
              </Table>
            )}
          </Card>
        )}
        {creds && (
          <Card title="Temporary passwords (shown once)">
            {creds.length === 0 ? <Empty title="None" /> : (
              <Table head={["Email", "Temporary password"]}>{creds.map((c) => <tr key={c.email}><Td>{c.email}</Td><Td className="font-mono">{c.temporary_password}</Td></tr>)}</Table>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
