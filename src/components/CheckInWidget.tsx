"use client";
import { useState } from "react";
import { Camera, LogIn, LogOut, MapPin } from "lucide-react";
import { api, ApiError, fmtTime } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { Badge, Button, Card, ErrorBox, Loading, StatusBadge, useToast } from "./ui";
import { CameraCheckIn } from "./CameraCheckIn";

export function CheckInWidget({ onChange }: { onChange?: () => void }) {
  const { data, error, loading, reload } = useApi<any>("/attendance/today");
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [err, setErr] = useState("");

  async function act(kind: "check-in" | "check-out") {
    setBusy(true); setErr("");
    try {
      await api(`/attendance/${kind}`, { method: "POST", body: kind === "check-in" ? { source: "web" } : {} });
      toast(kind === "check-in" ? "Checked in" : "Checked out");
      await reload(); onChange?.();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  const rec = data?.record;
  return (
    <Card title="Today" actions={rec ? <StatusBadge status={rec.status} /> : undefined}>
      {loading && !data && <Loading />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-muted">Check in</div><div className="text-lg font-semibold">{fmtTime(rec?.check_in)}</div></div>
            <div><div className="text-xs text-muted">Check out</div><div className="text-lg font-semibold">{fmtTime(rec?.check_out)}</div></div>
          </div>
          {rec?.source === "camera" && <Badge tone="violet">Camera + location verified</Badge>}
          {data.on_leave && <p className="text-sm text-muted">You are on approved leave today.</p>}
          {!data.is_working_day && !rec && <p className="text-xs text-muted">Today is a weekend.</p>}
          {err && <ErrorBox message={err} />}
          <div className="flex flex-wrap gap-2">
            {!rec && !data.on_leave && (
              <>
                <Button onClick={() => act("check-in")} loading={busy}><LogIn className="h-4 w-4" /> Check in</Button>
                <Button variant="secondary" onClick={() => setCamera(true)}><Camera className="h-4 w-4" /> Camera check-in</Button>
              </>
            )}
            {rec && !rec.check_out && <Button onClick={() => act("check-out")} loading={busy} variant="secondary"><LogOut className="h-4 w-4" /> Check out</Button>}
            {rec && rec.check_out && <span className="text-sm text-muted">{rec.worked_hours} h worked</span>}
          </div>
          {!rec && data.office?.lat != null && <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" /> Camera check-in needs a face and you inside {data.office.radius_m} m of the office.</p>}
          {!rec && data.office?.lat == null && <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><MapPin className="h-3 w-3" /> Note: Admin must set Office Location in Organization Setup for camera check-in.</p>}
        </div>
      )}
      <CameraCheckIn open={camera} onClose={() => setCamera(false)} onDone={() => { setCamera(false); reload(); onChange?.(); }} />
    </Card>
  );
}
