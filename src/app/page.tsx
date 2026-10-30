"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Loading } from "@/components/ui";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (user) { router.replace(user.must_change_password ? "/change-password" : "/dashboard"); return; }
    api<{ setup_done: boolean }>("/setup/status")
      .then((s) => router.replace(s.setup_done ? "/login" : "/setup"))
      .catch(() => router.replace("/login"));
  }, [user, loading, router]);
  return <Loading />;
}
