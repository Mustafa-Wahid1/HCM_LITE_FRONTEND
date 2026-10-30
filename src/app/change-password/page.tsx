"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { AuthShell } from "@/components/AuthShell";
import { Button, ErrorBox, Field, Input, Loading, useToast } from "@/components/ui";

export default function ChangePasswordPage() {
  const { user, loading, refresh, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showAgain, setShowAgain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== again) return setError("New passwords do not match");
    setBusy(true); setError("");
    try {
      await api("/auth/change-password", { body: { current_password: cur, new_password: next } });
      await refresh();
      toast("Password changed");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password");
    } finally { setBusy(false); }
  }

  if (loading || !user) return <Loading />;
  return (
    <AuthShell title="Change your password" subtitle={user.must_change_password ? "You are using a temporary password. Choose a new one to continue." : "Choose a new password."}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox message={error} />}
        <Field label="Current password">
          <div className="relative">
            <Input
              type={showCur ? "text" : "password"}
              required
              autoComplete="current-password"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCur((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground transition-colors focus:outline-none"
              aria-label={showCur ? "Hide password" : "Show password"}
              title={showCur ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="New password" hint="At least 8 characters with letters and numbers">
          <div className="relative">
            <Input
              type={showNext ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNext((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground transition-colors focus:outline-none"
              aria-label={showNext ? "Hide password" : "Show password"}
              title={showNext ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm new password">
          <div className="relative">
            <Input
              type={showAgain ? "text" : "password"}
              required
              autoComplete="new-password"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowAgain((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground transition-colors focus:outline-none"
              aria-label={showAgain ? "Hide password" : "Show password"}
              title={showAgain ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showAgain ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" loading={busy} className="w-full">Update password</Button>
        <button type="button" onClick={() => { logout(); router.replace("/login"); }} className="block w-full text-center text-sm text-muted underline">Sign out</button>
      </form>
    </AuthShell>
  );
}
