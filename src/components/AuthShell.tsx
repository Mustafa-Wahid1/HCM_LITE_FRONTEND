"use client";
import { ShieldCheck } from "lucide-react";

function HRFlowLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path
        d="M8 28V12c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v6h4v-6c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2v-6h-4v6c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2z"
        fill="currentColor"
      />
      <circle cx="12" cy="8" r="3.5" fill="currentColor" />
      <circle cx="20" cy="6" r="3.5" fill="currentColor" />
      <circle cx="28" cy="8" r="3.5" fill="currentColor" />
    </svg>
  );
}

export function AuthShell({
  title = "Welcome back",
  subtitle = "Sign in to your HRFlow account to continue",
  children,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-[100dvh] min-h-screen overflow-x-hidden">
      {/* Decorative green waves — softer / smaller on mobile */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Mobile: soft full-bleed green gradient at top */}
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-emerald-500/90 via-emerald-600/40 to-transparent sm:hidden" />
        {/* Desktop / tablet organic blobs */}
        <div
          className="absolute -left-32 -top-20 hidden h-[70%] w-[55%] rounded-[40%_60%_70%_30%/60%_30%_70%_40%] bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 opacity-90 sm:block"
          style={{ transform: "rotate(-8deg)" }}
        />
        <div
          className="absolute -left-20 top-[35%] hidden h-[50%] w-[45%] rounded-[60%_40%_30%_70%/40%_60%_40%_60%] bg-gradient-to-tr from-emerald-400/80 to-teal-500/70 sm:block"
          style={{ transform: "rotate(12deg)" }}
        />
        <div className="absolute bottom-0 left-0 hidden h-[40%] w-[40%] rounded-tr-[100%] bg-gradient-to-tr from-teal-600/60 to-emerald-400/40 sm:block" />
        <div
          className="absolute bottom-[15%] left-[8%] hidden h-40 w-32 opacity-20 sm:block"
          style={{
            background: "radial-gradient(ellipse at 30% 50%, #a7f3d0 0%, transparent 70%)",
            transform: "rotate(-25deg)",
          }}
        />
        <div className="absolute left-6 top-8 hidden grid-cols-4 gap-1.5 opacity-40 sm:grid">
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/70" />
          ))}
        </div>
        <div className="absolute bottom-10 left-10 hidden grid-cols-3 gap-1.5 opacity-30 sm:grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/60" />
          ))}
        </div>
      </div>

      {/* Card — centered on mobile, right-aligned on large screens */}
      <div className="relative z-10 flex w-full items-center justify-center px-4 py-8 sm:p-6 lg:justify-end lg:pr-[8%] xl:pr-[12%]">
        <div className="w-full max-w-[400px] sm:max-w-[420px]">
          <div className="rounded-2xl border border-white/70 bg-white/95 p-5 shadow-xl shadow-emerald-900/5 backdrop-blur-sm sm:p-8">
            <div className="mb-5 flex items-center justify-center gap-2 text-emerald-600 sm:mb-6 sm:gap-2.5">
              <HRFlowLogo className="h-8 w-8 sm:h-9 sm:w-9" />
              <span className="text-xl font-bold tracking-tight text-emerald-600 sm:text-2xl">HRFlow</span>
            </div>

            <div className="mb-5 text-center sm:mb-6">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-slate-500 sm:mt-1.5">{subtitle}</p>}
            </div>

            <div>{children}</div>

            <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-slate-100 pt-4 text-[11px] text-slate-400 sm:mt-6 sm:pt-5 sm:text-xs">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span>Secure sign in powered by HRFlow</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export { HRFlowLogo };
