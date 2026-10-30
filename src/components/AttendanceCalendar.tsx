"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApi } from "@/lib/hooks";
import { fmtTime, thisMonth } from "@/lib/api";
import { cx, ErrorBox, Loading } from "./ui";

const COLORS: Record<string, string> = {
  present: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200",
  late: "bg-amber-500/25 text-amber-800 dark:text-amber-200",
  half_day: "bg-orange-500/25 text-orange-800 dark:text-orange-200",
  missing_checkout: "bg-yellow-500/25 text-yellow-800 dark:text-yellow-200",
  absent: "bg-red-500/20 text-red-800 dark:text-red-200",
  on_leave: "bg-sky-500/20 text-sky-800 dark:text-sky-200",
  holiday: "bg-violet-500/20 text-violet-800 dark:text-violet-200",
  weekend: "bg-gray-500/10 text-muted",
  pending: "bg-primary/10",
  upcoming: "",
  not_employed: "opacity-30",
};

function shift(m: string, delta: number) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function AttendanceCalendar({ employeeId, refreshKey }: { employeeId?: number; refreshKey?: number }) {
  const [month, setMonth] = useState(thisMonth());
  const { data, error, loading, reload } = useApi<any>(`/attendance/calendar?month=${month}${employeeId ? `&employee_id=${employeeId}` : ""}&k=${refreshKey ?? 0}`);
  const first = data?.days?.[0] ? new Date(data.days[0].date + "T00:00:00").getDay() : 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setMonth(shift(month, -1))} className="rounded p-1 hover:bg-soft" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-sm font-semibold">{new Date(month + "-01T00:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div>
        <button onClick={() => setMonth(shift(month, 1))} className="rounded p-1 hover:bg-soft" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
      </div>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: first }).map((_, i) => <div key={"b" + i} />)}
            {data.days.map((d: any) => (
              <div key={d.date} title={`${d.date} - ${d.status.replace(/_/g, " ")}${d.check_in ? ` (${fmtTime(d.check_in)} - ${fmtTime(d.check_out)})` : ""}${d.holiday ? ` - ${d.holiday}` : ""}`}
                className={cx("flex aspect-square min-h-9 flex-col items-center justify-center rounded-md border text-xs", COLORS[d.status])}>
                <span className="font-medium">{Number(d.date.slice(8))}</span>
                <span className="hidden text-[9px] capitalize leading-none sm:block">{d.status === "missing_checkout" ? "no out" : d.status.replace(/_/g, " ").slice(0, 7)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {(["present", "late", "half_day", "absent", "on_leave", "holiday"] as const).map((k) => (
              <span key={k} className="flex items-center gap-1"><span className={cx("inline-block h-3 w-3 rounded border", COLORS[k])} /> {k.replace("_", " ")}{data.summary[k] ? ` (${data.summary[k]})` : ""}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
