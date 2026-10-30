"use client";
import { useState } from "react";
import { useApi, qs } from "@/lib/hooks";
import { Card, Empty, ErrorBox, Input, Loading, Modal, PageHeader, Pager, Select, Table, Td } from "@/components/ui";

export default function Audit() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("");
  const [actor, setActor] = useState("");
  const [sel, setSel] = useState<any>(null);
  const { data, error, loading, reload } = useApi<any>(`/audit-logs${qs({ page, entity, actor, limit: 20 })}`);
  const entities = ["setup", "company", "settings", "department", "designation", "leave_type", "holiday", "employee", "salary_structure", "user", "attendance_correction", "leave_request", "payroll_run", "announcement"];

  return (
    <>
      <PageHeader title="Audit log" subtitle="Append-only record of important actions. Entries cannot be edited or deleted." />
      <Card pad={false}>
        <div className="flex flex-wrap gap-2 border-b p-3">
          <Select className="max-w-[13rem]" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} aria-label="Entity">
            <option value="">All entities</option>{entities.map((e) => <option key={e} value={e}>{e}</option>)}
          </Select>
          <Input className="max-w-xs" placeholder="Filter by actor email" value={actor} onChange={(e) => { setActor(e.target.value); setPage(1); }} aria-label="Actor" />
        </div>
        {error && <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div>}
        {loading && !data && <Loading />}
        {data && data.data.length === 0 && <Empty title="No audit entries" />}
        {data && data.data.length > 0 && (
          <>
            <Table head={["When", "Actor", "Action", "Entity", "ID", ""]}>
              {data.data.map((a: any) => (
                <tr key={a.id} className="hover:bg-soft">
                  <Td className="whitespace-nowrap">{new Date(a.created_at).toLocaleString("en-GB")}</Td><Td>{a.actor_email}</Td>
                  <Td className="capitalize">{a.action.replace(/_/g, " ")}</Td><Td>{a.entity}</Td><Td>{a.entity_id || "-"}</Td>
                  <Td><button className="text-xs text-primary underline" onClick={() => setSel(a)}>Details</button></Td>
                </tr>
              ))}
            </Table>
            <div className="px-3 pb-3"><Pager page={data.page} pages={data.pages} onPage={setPage} /></div>
          </>
        )}
      </Card>
      <Modal open={!!sel} title={sel ? `${sel.action} ${sel.entity} #${sel.entity_id ?? ""}` : ""} onClose={() => setSel(null)} wide>
        {sel && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div><div className="mb-1 text-xs font-medium uppercase text-muted">Before</div><pre className="max-h-72 overflow-auto rounded-lg bg-soft p-3 text-xs">{sel.before ? JSON.stringify(sel.before, null, 2) : "-"}</pre></div>
            <div><div className="mb-1 text-xs font-medium uppercase text-muted">After</div><pre className="max-h-72 overflow-auto rounded-lg bg-soft p-3 text-xs">{sel.after ? JSON.stringify(sel.after, null, 2) : "-"}</pre></div>
          </div>
        )}
      </Modal>
    </>
  );
}
