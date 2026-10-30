"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi, qs } from "@/lib/hooks";
import { download, fmtDate } from "@/lib/api";
import { Button, Card, Empty, ErrorBox, Input, Loading, PageHeader, Pager, Select, StatusBadge, Table, Td, useToast } from "@/components/ui";

export default function EmployeesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const depts = useApi<any[]>("/departments");
  const { data, error, loading, reload } = useApi<any>(`/employees${qs({ search: q, department_id: dept, status, page, limit: 15 })}`);
  const isHR = user?.role === "hr";

  return (
    <>
      <PageHeader title="Employees" subtitle="Directory with server-side search, filters and paging."
        actions={isHR && (
          <>
            <Button variant="secondary" onClick={() => download("/employees/export", "employees.csv").catch((e) => toast(e.message, "err"))}><Download className="h-4 w-4" /> Export CSV</Button>
            <Link href="/employees/import"><Button variant="secondary"><Upload className="h-4 w-4" /> Import CSV</Button></Link>
            <Link href="/employees/new"><Button><Plus className="h-4 w-4" /> Register employee</Button></Link>
          </>
        )} />
      <Card pad={false}>
        <div className="flex flex-wrap gap-2 border-b p-3">
          <Input className="max-w-xs" placeholder="Search name, email or code" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
          <Select className="max-w-[12rem]" value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }} aria-label="Department">
            <option value="">All departments</option>
            {depts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select className="max-w-[10rem]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
            <option value="">Any status</option>
            <option value="active">Active</option><option value="probation">Probation</option><option value="exited">Exited</option>
          </Select>
        </div>
        {error && <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div>}
        {loading && !data && <Loading />}
        {data && data.data.length === 0 && (
          <Empty title="No employees found" hint={isHR ? "Register your first employee, or import a CSV." : "Try changing the filters."}
            action={isHR && <Link href="/employees/new"><Button>Register employee</Button></Link>} />
        )}
        {data && data.data.length > 0 && (
          <>
            <Table head={["Code", "Name", "Department", "Designation", "Role", "Joined", "Status"]}>
              {data.data.map((e: any) => (
                <tr key={e.id} className="hover:bg-soft">
                  <Td className="font-mono text-xs">{e.code}</Td>
                  <Td><Link href={`/employees/${e.id}`} className="font-medium text-primary hover:underline">{e.first_name} {e.last_name}</Link><div className="text-xs text-muted">{e.email}</div></Td>
                  <Td>{e.department || "-"}</Td><Td>{e.designation || "-"}</Td>
                  <Td className="capitalize">{e.role}</Td><Td>{fmtDate(e.join_date)}</Td><Td><StatusBadge status={e.status} /></Td>
                </tr>
              ))}
            </Table>
            <div className="px-3 pb-3"><Pager page={data.page} pages={data.pages} onPage={setPage} /></div>
          </>
        )}
      </Card>
    </>
  );
}
