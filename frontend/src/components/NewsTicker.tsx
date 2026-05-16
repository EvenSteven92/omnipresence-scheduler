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

  // Duplicate the list so the keyframe scroll loops seamlessly
  const loop = items.length > 0 ? [...items, ...items] : [];
  // Slow the scroll for longer lists so reading speed stays comfortable
  const durationSec = Math.max(60, items.length * 6);

  return (
    <div
      data-testid="news-ticker"
      className="relative flex h-8 w-full shrink-0 items-stretch overflow-hidden border-b border-border bg-surface text-foreground"
    >
      {/* Source label */}
      <div className="z-10 flex shrink-0 items-center gap-2 border-r border-border bg-background/80 px-3 backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/80" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <Radio className="h-3 w-3 text-accent" strokeWidth={1.75} />
        <span className="label-mono">live_wire · world+us</span>
      </div>

      {/* Marquee track */}
      <div className="relative flex-1 overflow-hidden">
        {error && items.length === 0 ? (
          <div className="flex h-full items-center px-4 label-mono text-muted-foreground">
            news_feed_unavailable
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full items-center px-4 label-mono text-muted-foreground">
            warming_up…
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
                className="group flex items-center gap-2 text-xs"
              >
                <span className="rounded-sm border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {h.source}
                </span>
                <span className="text-foreground group-hover:text-accent">{h.title}</span>
                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/60 group-hover:text-accent" />
              </a>
            ))}
          </div>
        )}
        {/* Edge fade-out so headlines don't slam into the source pill */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-surface to-transparent" />
      </div>
    </div>
  );
}
