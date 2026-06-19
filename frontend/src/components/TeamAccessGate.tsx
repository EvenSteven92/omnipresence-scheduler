import { useState } from "react";
import { Lock } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
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
    <Card elevated>
      <CardHeader
        title="Team access"
        description="Your workspace admin shares a one-time access code so you can connect social accounts and sync metrics. Ask your TORCC admin if you don't have one."
      />
      <CardBody className="pt-0">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label
              htmlFor="team-code"
              className="mb-1.5 block text-body-sm font-medium text-foreground"
            >
              Access code
            </label>
            <input
              id="team-code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <Button type="submit" variant="primary" disabled={busy || !code.trim()}>
            <Lock className="h-3.5 w-3.5" />
            {busy ? "Checking…" : "Unlock"}
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </CardBody>
    </Card>
  );
}
