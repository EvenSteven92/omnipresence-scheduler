import { useEffect, useState } from "react";
import { Radio, ExternalLink } from "lucide-react";

interface Headline {
  title: string;
  link: string;
  source: string;
  published: string;
  ts: number;
}

const REFRESH_MS = 5 * 60 * 1000;

/**
 * Global news ticker — sits above the app shell on every page.
 * Pulls /api/news/headlines (RSS aggregator on the backend) and marquees
 * the latest headlines continuously. Click a headline to open in a new tab.
 */
export function NewsTicker() {
  const [items, setItems] = useState<Headline[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchNews() {
      try {
        const res = await fetch("/api/news/headlines");
        if (!res.ok) throw new Error(`${res.status}`);
        const data = (await res.json()) as { items: Headline[] };
        if (!cancelled) setItems(data.items ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    fetchNews();
    const id = window.setInterval(fetchNews, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const loop = items.length > 0 ? [...items, ...items] : [];
  const durationSec = Math.max(60, items.length * 6);

  return (
    <div
      data-testid="news-ticker"
      className="relative flex h-10 w-full shrink-0 items-stretch overflow-hidden border-b border-line bg-card text-foreground"
    >
      <div className="z-10 flex shrink-0 items-center gap-2 border-r border-line bg-paper-2 px-3.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/80" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <Radio className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
        <span className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.08em] text-foreground">
          Live wire
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {error && items.length === 0 ? (
          <div className="flex h-full items-center px-4 text-body-sm text-muted-foreground">
            News feed unavailable
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full items-center px-4 text-body-sm text-muted-foreground">
            Loading headlines…
          </div>
        ) : (
          <div
            className="flex h-full items-center gap-8 whitespace-nowrap will-change-transform pause-on-hover"
            style={{
              animation: `newsTickerScroll ${durationSec}s linear infinite`,
            }}
          >
            {loop.map((h, i) => (
              <a
                key={i}
                href={h.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-body-sm"
              >
                <span className="rounded-lg border border-line bg-paper-2 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {h.source}
                </span>
                <span className="text-foreground group-hover:text-accent">{h.title}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-accent" />
              </a>
            ))}
          </div>
        )}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent" />
      </div>
    </div>
  );
}
