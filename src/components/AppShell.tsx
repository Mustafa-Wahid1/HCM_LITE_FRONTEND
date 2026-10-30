"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, Building2, CalendarCheck, CalendarDays, ClipboardCheck, FileText, LayoutDashboard, LogOut, Megaphone, Menu, Moon, ScrollText,
  ShieldCheck, Sun, UserCog, UserRound, Users, Wallet, X, Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { api, fmtDate } from "@/lib/api";
import { AIChat } from "./AIChat";
import { cx, Loading } from "./ui";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
const NAV: Record<string, NavItem[]> = {
  admin: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/employees", label: "Employees", icon: Users },
    { href: "/attendance/board", label: "Attendance board", icon: ClipboardCheck },
    { href: "/attendance/corrections", label: "Corrections", icon: Clock },
    { href: "/leave/approvals", label: "Leave (HR requests)", icon: CalendarCheck },
    { href: "/payroll", label: "Payroll", icon: Wallet },
    { href: "/payslips", label: "Payslips", icon: FileText },
    { href: "/organization", label: "Organization setup", icon: Building2 },
    { href: "/users", label: "Logins", icon: UserCog },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
    { href: "/audit", label: "Audit log", icon: ScrollText },
  ],
  hr: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/employees", label: "Employees", icon: Users },
    { href: "/attendance", label: "My attendance", icon: Clock },
    { href: "/attendance/board", label: "Attendance board", icon: ClipboardCheck },
    { href: "/attendance/corrections", label: "Corrections", icon: ShieldCheck },
    { href: "/leave", label: "My leave", icon: CalendarDays },
    { href: "/leave/approvals", label: "Leave approvals", icon: CalendarCheck },
    { href: "/payroll", label: "Payroll", icon: Wallet },
    { href: "/payslips", label: "Payslips", icon: FileText },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
    { href: "/profile", label: "My profile", icon: UserRound },
  ],
  employee: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/attendance", label: "My attendance", icon: Clock },
    { href: "/leave", label: "My leave", icon: CalendarDays },
    { href: "/payslips", label: "My payslips", icon: FileText },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
    { href: "/profile", label: "My profile", icon: UserRound },
  ],
};

function Notifications() {
  const [open, setOpen] = useState(false);
  const { data, reload } = useApi<{ unread: number; items: { id: number; title: string; body: string; read: boolean; created_at: string }[] }>("/notifications");
  useEffect(() => { const t = setInterval(reload, 60000); return () => clearInterval(t); }, [reload]);
  async function markAll() { await api("/notifications/read-all", { method: "POST", body: {} }); reload(); }
  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open) reload(); }} className="relative rounded-lg p-2 hover:bg-soft" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {!!data?.unread && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">{data.unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[min(92vw,22rem)] rounded-xl border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-2.5 text-sm font-semibold">
              Notifications
              {!!data?.unread && <button onClick={markAll} className="text-xs font-normal text-primary underline">Mark all read</button>}
            </div>
            <ul className="max-h-80 divide-y overflow-y-auto">
              {data?.items.length === 0 && <li className="p-6 text-center text-sm text-muted">Nothing yet</li>}
              {data?.items.map((n) => (
                <li key={n.id} className={cx("px-4 py-2.5 text-sm", !n.read && "bg-soft")}>
                  <div className="font-medium">{n.title}</div>
                  {n.body && <div className="text-xs text-muted">{n.body}</div>}
                  <div className="mt-0.5 text-[11px] text-muted">{fmtDate(n.created_at)}</div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);
  useEffect(() => { setMenu(false); }, [path]);
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.must_change_password) router.replace("/change-password");
  }, [user, loading, router]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("hcm_theme", next ? "dark" : "light"); } catch {}
  }

  if (loading || !user || user.must_change_password) return <Loading />;
  const items = NAV[user.role];
  // Longest matching prefix wins so /attendance/board does not also light up /attendance
  const active = items.filter((i) => path === i.href || path.startsWith(i.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Main">
      <div className="mb-3 flex items-center gap-2 px-2 py-1">
        <span className="rounded-lg bg-primary p-1.5 text-primary-fg"><Users className="h-4 w-4" /></span>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">HCM Lite</div>
          <div className="truncate text-xs text-muted">{user.company_name}</div>
        </div>
      </div>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition", active === i.href ? "bg-primary text-primary-fg" : "hover:bg-soft")}>
          <i.icon className="h-4 w-4 shrink-0" /> {i.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r bg-card lg:block">{sidebar}</aside>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenu(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 overflow-y-auto bg-card shadow-xl">
            <button onClick={() => setMenu(false)} className="absolute right-2 top-2 rounded p-1 hover:bg-soft" aria-label="Close menu"><X className="h-4 w-4" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-2.5 backdrop-blur">
          <button onClick={() => setMenu(true)} className="rounded-lg p-2 hover:bg-soft lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm text-muted lg:block">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="rounded-lg p-2 hover:bg-soft" aria-label="Toggle dark mode">{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            <Notifications />
            <div className="mx-2 hidden text-right leading-tight sm:block">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs capitalize text-muted">{user.role}</div>
            </div>
            <button onClick={() => { logout(); router.replace("/login"); }} className="rounded-lg p-2 hover:bg-soft" aria-label="Sign out" title="Sign out"><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
      <AIChat />
    </div>
  );
}
