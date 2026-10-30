"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, ApiError, fmtDate } from "@/lib/api";
import { Badge, Button, Card, ErrorBox, Loading, Modal, PageHeader, Table, Td, useToast } from "@/components/ui";

export default function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<any[]>("/users");
  const [pw, setPw] = useState<{ email: string; temporary_password: string } | null>(null);

  async function act(path: string, ok: string) {
    try {
      const r = await api<any>(path, { method: "POST", body: {} });
      if (r.temporary_password) setPw(r); else toast(ok);
      reload();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed", "err"); }
  }

  return (
    <>
      <PageHeader title="Logins" subtitle="Create HR logins; deactivate or reset any login. Employees are registered by HR."
        actions={<Link href="/employees/new"><Button><Plus className="h-4 w-4" /> Create HR login</Button></Link>} />
      <Card pad={false}>
        {error && <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div>}
        {loading && !data && <Loading />}
        {data && (
          <Table head={["Name", "Email", "Role", "Status", "Last login", ""]}>
            {data.map((u) => (
              <tr key={u.id}>
                <Td className="font-medium">{u.name}</Td><Td>{u.email}</Td><Td className="capitalize">{u.role}</Td>
                <Td>{u.active ? <Badge tone="green">active</Badge> : <Badge tone="red">deactivated</Badge>}{u.must_change_password && <Badge tone="amber">temp password</Badge>}</Td>
                <Td>{u.last_login_at ? fmtDate(u.last_login_at) : "never"}</Td>
                <Td className="whitespace-nowrap">
                  {u.id !== user?.id && u.role !== "admin" && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => act(`/users/${u.id}/reset-password`, "")}>Reset password</Button>{" "}
                      {u.active
                        ? <Button size="sm" variant="secondary" onClick={() => act(`/users/${u.id}/deactivate`, "Login deactivated")}>Deactivate</Button>
                        : <Button size="sm" variant="secondary" onClick={() => act(`/users/${u.id}/activate`, "Login activated")}>Activate</Button>}
                    </>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!pw} title="Temporary password" onClose={() => setPw(null)}>
        <p className="text-sm">Shown <b>only once</b>. The user must change it on next sign-in.</p>
        <div className="mt-3 space-y-1 rounded-lg bg-soft p-3 font-mono text-sm"><div>{pw?.email}</div><div>{pw?.temporary_password}</div></div>
        <Button className="mt-4" onClick={() => setPw(null)}>Done</Button>
      </Modal>
    </>
  );
}
