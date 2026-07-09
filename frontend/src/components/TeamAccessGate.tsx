import { useState } from "react";
import { KeyRound, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function TeamAccessGate({ onAuthed }: { onAuthed: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/team/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail ?? "Login failed");
      }
      onAuthed();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="team-access"
      data-testid="team-access-gate"
      className="scroll-mt-8 rounded-md border-[1.5px] border-foreground bg-card shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-[1.5px] border-foreground px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-[1.5px] border-foreground bg-accent">
            <KeyRound className="h-5 w-5 text-foreground" strokeWidth={2} />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Team access</h2>
            <p className="mt-1 max-w-xl text-body-sm leading-relaxed text-muted-foreground">
              A short access code unlocks OAuth connects and metric sync for your team. Ask your
              TORCC admin if you don&apos;t have one yet — this is separate from your personal login.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 px-5 py-5">
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="team-code"
            className="mb-1.5 block font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            Access code
          </label>
          <input
            id="team-code"
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste code from admin"
            autoComplete="one-time-code"
            className="w-full rounded-md border-[1.5px] border-foreground bg-paper-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" variant="primary" disabled={busy || !code.trim()}>
          <Lock className="h-3.5 w-3.5" />
          {busy ? "Checking…" : "Unlock"}
        </Button>
      </form>
      {error ? (
        <p className="border-t-[1.5px] border-foreground px-5 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
