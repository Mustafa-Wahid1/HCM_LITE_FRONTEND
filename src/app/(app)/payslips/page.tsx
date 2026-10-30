"use client";
import { Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { download, money } from "@/lib/api";
import { Button, Card, Empty, ErrorBox, Loading, PageHeader, StatusBadge, Table, Td, useToast } from "@/components/ui";

export default function Payslips() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<any[]>("/payslips");
  const mine = user?.role === "employee";
  return (
    <>
      <PageHeader title={mine ? "My payslips" : "Payslips"} subtitle={mine ? "Available once Admin finalizes the month." : "All employees' payslips, including drafts."} />
      <Card pad={false}>
        {error && <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div>}
        {loading && !data && <Loading />}
        {data && data.length === 0 && <Empty title="No payslips yet" hint={mine ? "Your payslip appears here after payroll is finalized." : "Create a payroll run first."} />}
        {data && data.length > 0 && (
          <Table head={mine ? ["Month", "Gross", "Deductions", "Tax", "Net", ""] : ["Month", "Employee", "Gross", "Deductions", "Tax", "Net", "Run", ""]}>
            {data.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium">{p.month}</Td>
                {!mine && <Td>{p.employee_name}<div className="font-mono text-xs text-muted">{p.employee_code}</div></Td>}
                <Td>{money(p.earned_gross)}</Td><Td>{money(p.deductions)}</Td><Td>{money(p.tax)}</Td><Td className="font-semibold">{money(p.net)}</Td>
                {!mine && <Td><StatusBadge status={p.run_status} /></Td>}
                <Td><Button size="sm" variant="secondary" onClick={() => download(`/payslips/${p.id}/pdf`, `payslip-${p.employee_code}-${p.month}.pdf`).catch((e) => toast(e.message, "err"))}><Download className="h-3.5 w-3.5" /> PDF</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
