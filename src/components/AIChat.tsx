"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Spinner, cx } from "./ui";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

const SUGGESTIONS = {
  admin: ["How many active employees do we have?", "What is this month's attendance rate?", "Summarize payroll cost by department"],
  hr: ["Who is on leave today?", "Who came late most often this month?", "What is this month's attendance rate?"],
  employee: ["How many sick leaves do I have left this year?", "What is the late check-in rule?", "How is my tax calculated?"],
};

export function AIChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy, open]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await api<{ reply: string }>("/ai/chat", { body: { messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) } });
      setMsgs([...next, { role: "assistant", content: r.reply }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", error: true, content: e instanceof ApiError ? e.message : "The assistant is unavailable right now." }]);
    } finally { setBusy(false); }
  }

  if (!user) return null;
  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-fg shadow-lg hover:opacity-90" aria-label="Open AI assistant">
          <Sparkles className="h-4 w-4" /> Ask assistant
        </button>
      )}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-[78vh] flex-col rounded-t-2xl border bg-card shadow-2xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[34rem] sm:w-[24rem] sm:rounded-2xl" role="dialog" aria-label="AI assistant">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2 font-semibold"><Bot className="h-4 w-4 text-primary" /> HCM Assistant</div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded p-1 hover:bg-soft"><X className="h-4 w-4" /></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {msgs.length === 0 && (
              <div className="space-y-2">
                <p className="text-muted">Ask about your data and company policy. Answers come from live records and are limited to what you are allowed to see.</p>
                {SUGGESTIONS[user.role].map((s) => (
                  <button key={s} onClick={() => send(s)} className="block w-full rounded-lg border px-3 py-2 text-left hover:bg-soft">{s}</button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cx("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2", m.role === "user" ? "bg-primary text-primary-fg" : m.error ? "bg-red-500/10 text-red-700 dark:text-red-300" : "bg-soft")}>
                  {m.content}
                  {m.role === "assistant" && !m.error && <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">AI-generated</div>}
                </div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-muted"><Spinner /> Thinking...</div>}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." maxLength={500}
              className="flex-1 rounded-lg border bg-card px-3 py-2 text-sm outline-none focus:border-primary" aria-label="Message" />
            <button type="submit" disabled={busy || !input.trim()} className="rounded-lg bg-primary px-3 text-primary-fg disabled:opacity-50" aria-label="Send"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </>
  );
}
