"use client";
import { useState } from "react";
import Link from "next/link";
import { useApi, qs } from "@/lib/hooks";
import { fmtTime } from "@/lib/api";
import { Card, Empty, ErrorBox, Field, Input, Loading, PageHeader, Select, StatusBadge, Table, Td } from "@/components/ui";

export default function Board() {
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [dept, setDept] = useState("");
  const depts = useApi<any[]>("/departments");
  const { data, error, loading, reload } = useApi<any>(`/attendance/board${qs({ date, department_id: dept })}`);

  return (
    <>
      <PageHeader title="Daily attendance board" subtitle="Everyone employed on the selected day, with their status."
        actions={<div className="flex gap-2">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Department"><Select value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All</option>{depts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        </div>} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-sm">
            {data.holiday && <StatusBadge status="holiday" />}
            {Object.entries(data.counts).map(([k, v]) => <span key={k} className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1"><StatusBadge status={k} /> <b>{String(v)}</b></span>)}
          </div>
          <Card pad={false}>
            {data.rows.length === 0 ? <Empty title="Nobody was employed on this date" /> : (
              <Table head={["Employee", "Department", "Check in", "Check out", "Hours", "Source", "Status"]}>
                {data.rows.map((r: any) => (
                  <tr key={r.employee_id} className="hover:bg-soft">
                    <Td><Link href={`/employees/${r.employee_id}`} className="font-medium text-primary hover:underline">{r.name}</Link><div className="font-mono text-xs text-muted">{r.code}</div></Td>
                    <Td>{r.department || "-"}</Td><Td>{fmtTime(r.check_in)}</Td><Td>{fmtTime(r.check_out)}</Td><Td>{r.worked_hours ?? "-"}</Td>
                    <Td className="capitalize">{r.source || "-"}</Td>
                    <Td><StatusBadge status={r.status} />{r.is_late && r.status !== "late" && <span className="ml-1 text-xs text-amber-600">late</span>}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </>
      )}
    </>
  );
}
