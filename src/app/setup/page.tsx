"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth, User } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { AuthShell } from "@/components/AuthShell";
import { Button, ErrorBox, Field, Input, Loading } from "@/components/ui";

export default function SetupPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [ready, setReady] = useState(false);
  const [f, setF] = useState({ company_name: "", admin_name: "", email: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ setup_done: boolean }>("/setup/status")
      .then((s) => (s.setup_done ? router.replace("/login") : setReady(true)))
      .catch((e) => { setError(e.message); setReady(true); });
  }, [router]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password !== f.confirm) return setError("Passwords do not match");
    setBusy(true); setError("");
    try {
      const r = await api<{ token: string; user: User }>("/setup", { body: { company_name: f.company_name, admin_name: f.admin_name, email: f.email, password: f.password } });
      setSession(r.token, r.user);
      router.replace("/organization");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Setup failed");
    } finally { setBusy(false); }
  }

  if (!ready) return <Loading />;
  return (
    <AuthShell title="Set up your company" subtitle="First run: name your company and create the Admin account.">
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox message={error} />}
        <Field label="Company name"><Input required minLength={2} value={f.company_name} onChange={set("company_name")} /></Field>
        <Field label="Admin full name"><Input required minLength={2} value={f.admin_name} onChange={set("admin_name")} /></Field>
        <Field label="Admin email"><Input type="email" required value={f.email} onChange={set("email")} /></Field>
        <Field label="Password" hint="At least 8 characters with letters and numbers">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={f.password}
              onChange={set("password")}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground transition-colors focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm password">
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              required
              autoComplete="new-password"
              value={f.confirm}
              onChange={set("confirm")}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground transition-colors focus:outline-none"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
              title={showConfirm ? "Hide confirm password" : "Show confirm password"}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" loading={busy} className="w-full">Create company</Button>
      </form>
    </AuthShell>
  );
}
