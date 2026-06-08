import { useState } from "react";
import { Lock } from "lucide-react";

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
    <form onSubmit={submit} className="panel border border-border bg-surface/60 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-accent" />
        <div className="label-mono">team_access</div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter your team access code to connect YouTube or run a manual sync.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
          className="min-w-[220px] rounded-sm border border-border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" disabled={busy || !code.trim()} className="btn-action">
          {busy ? "Checking…" : "Unlock"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </form>
  );
}