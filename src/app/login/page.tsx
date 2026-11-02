"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { AuthShell } from "@/components/AuthShell";
import { Button, ErrorBox, cx } from "@/components/ui";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace(user.must_change_password ? "/change-password" : "/dashboard");
  }, [user, loading, router]);

  useEffect(() => {
    api<{ setup_done: boolean }>("/setup/status").then((s) => !s.setup_done && router.replace("/setup")).catch(() => {});
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(email.trim(), password);
      router.replace(u.must_change_password ? "/change-password" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:py-2.5 sm:text-sm";

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your HRFlow account to continue">
      <form onSubmit={submit} className="space-y-4 sm:space-y-5">
        {error && <ErrorBox message={error} />}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className={inputBase}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={cx(inputBase, "pr-16")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center gap-1 rounded-md px-1.5 text-xs font-medium text-slate-500 transition hover:text-emerald-600 sm:min-h-0 sm:min-w-0 sm:right-2.5"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> : <Eye className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
              <span className="hidden xs:inline sm:inline">{showPassword ? "Hide" : "Show"}</span>
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="min-h-[44px] text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline sm:min-h-0"
              onClick={() => alert("Please contact your administrator to reset your password.")}
            >
              Forgot password?
            </button>
          </div>
        </div>

        <Button
          type="submit"
          loading={busy}
          className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 sm:py-3"
        >
          <User className="h-4 w-4" />
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
