import { useEffect, useState } from "react";
import { ExternalLink, Link2, Loader2 } from "lucide-react";
import { isDropboxUrl, resolveDropboxUrl, type DropboxResolveResult } from "@/lib/dropbox";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-md border border-foreground bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/55 focus:outline-none focus:ring-2 focus:ring-ring";

export function DropboxLinkField({
  value,
  directUrl,
  onResolved,
  onClear,
  className,
}: {
  /** Share URL as stored on the draft. */
  value?: string;
  directUrl?: string;
  onResolved: (result: DropboxResolveResult) => void;
  onClear: () => void;
  className?: string;
}) {
  const [input, setInput] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInput(value ?? "");
  }, [value]);

  async function apply(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError(null);
      onClear();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Prefer API when available (same logic today; room for richer resolve later)
      const res = await fetch("/api/dropbox/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (res.ok) {
        const data = (await res.json()) as DropboxResolveResult;
        if (data.ok) {
          onResolved(data);
          setInput(data.shareUrl);
          return;
        }
      }
      // Client fallback
      const local = resolveDropboxUrl(trimmed);
      if (!local.ok) {
        setError(local.detail);
        return;
      }
      onResolved(local);
      setInput(local.shareUrl);
    } catch {
      const local = resolveDropboxUrl(trimmed);
      if (!local.ok) {
        setError(local.detail);
        return;
      }
      onResolved(local);
      setInput(local.shareUrl);
    } finally {
      setBusy(false);
    }
  }

  const linked = Boolean(value && isDropboxUrl(value));

  return (
    <div className={cn("space-y-2", className)} data-testid="dropbox-link-field">
      <label className="block space-y-1.5">
        <span className="flex items-center gap-1.5 text-caption font-medium uppercase tracking-[0.06em] text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
          Dropbox link
        </span>
        <div className="relative">
          <input
            type="url"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            onBlur={() => {
              if (input.trim() !== (value ?? "")) void apply(input);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void apply(input);
              }
            }}
            placeholder="https://www.dropbox.com/s/… or /scl/fi/…"
            data-testid="dropbox-url-input"
            className={fieldClass}
            autoComplete="off"
            spellCheck={false}
          />
          {busy ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      </label>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Public share link to the reel or image. Anyone with the link can view — required for later
        auto-publish.
      </p>
      {error ? (
        <p className="text-xs font-medium text-destructive" data-testid="dropbox-link-error">
          {error}
        </p>
      ) : null}
      {linked ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md border border-success/40 bg-success/10 px-2 py-1 font-medium text-success">
            Linked
          </span>
          {directUrl ? (
            <a
              href={directUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-line underline-offset-2 hover:text-muted-foreground"
            >
              Open direct link
              <ExternalLink className="h-3 w-3" strokeWidth={2} />
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setInput("");
              setError(null);
              onClear();
            }}
            className="font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
