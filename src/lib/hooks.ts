"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";

// Fetch a GET endpoint; pass null to skip. Re-fetches when `path` changes or reload() is called.
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) { setData(null); setLoading(false); return; }
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const d = await api<T>(path);
      if (mine === seq.current) setData(d);
    } catch (e) {
      if (mine === seq.current) setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}

export function qs(params: Record<string, string | number | null | undefined>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
}
