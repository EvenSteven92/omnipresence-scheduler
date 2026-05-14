import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { scheduledPosts } from "@/lib/mock-data";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — TORCC OmniSocial" },
      { name: "description", content: "Month view of every scheduled post across all platforms." },
    ],
  }),
  component: CalendarPage,
});

const DOW = ["mon","tue","wed","thu","fri","sat","sun"];

function CalendarPage() {
  const [showEdit, setShowEdit] = useState(true);
  // May 2026 — May 1 = Friday. Leading from Mon (Apr 27).
  const cells: { d: number; muted: boolean; key: string }[] = [];
  for (let i = 27; i <= 30; i++) cells.push({ d: i, muted: true, key: `p${i}` });
  for (let d = 1; d <= 31; d++) cells.push({ d, muted: false, key: `m${d}` });
  while (cells.length % 7 !== 0) {
    const n = cells.length - 34;
    cells.push({ d: n, muted: true, key: `n${n}` });
  }

  // Map of day -> posts in May 2026
  const byDay = new Map<number, typeof scheduledPosts>();
  scheduledPosts.forEach((p) => {
    const dt = new Date(p.date);
    if (dt.getFullYear() === 2026 && dt.getMonth() === 4) {
      const arr = byDay.get(dt.getDate()) ?? [];
      arr.push(p);
      byDay.set(dt.getDate(), arr);
    }
  });

  return (
    <div className="flex">
      <div className="flex-1 pb-20">
        <PageHeader
          title="Calendar"
          actions={
            <>
              <button className="flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground">
                <Plus className="h-3 w-3" /> New_Post
              </button>
              <button onClick={() => setShowEdit((v) => !v)} className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] hover:bg-secondary">
                {showEdit ? "Hide" : "Show"}
              </button>
            </>
          }
        />

        <div className="px-10 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="rounded-sm border border-border p-1.5 hover:bg-secondary"><ChevronLeft className="h-3 w-3" /></button>
              <span className="display-mono text-sm">May 2026</span>
              <button className="rounded-sm border border-border p-1.5 hover:bg-secondary"><ChevronRight className="h-3 w-3" /></button>
            </div>
            <div className="label-mono">month ⌄</div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-px border border-border bg-border">
            {DOW.map((d) => (
              <div key={d} className="bg-surface py-2 text-center label-mono">{d}</div>
            ))}
            {cells.map((c) => {
              const posts = !c.muted ? byDay.get(c.d) : undefined;
              return (
                <div key={c.key} className={`min-h-[110px] bg-surface p-2 ${c.muted ? "text-muted-foreground/40" : "text-foreground"}`}>
                  <div className="text-xs">{c.d}</div>
                  {posts && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {posts.flatMap((p) =>
                        p.platforms.slice(0, 4).map((pl, i) => (
                          <span key={`${p.id}-${i}`} className="rounded-full bg-background px-1.5 py-0.5 text-[0.55rem] uppercase tracking-wide">
                            {pl === "TIKTOK" ? "TT" : pl === "IG STORY" ? "IGS" : pl === "FB STORY" ? "FBS" : pl}
                          </span>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="label-mono mt-3 text-right">(view) scheduled (solid)</div>

          {/* Posts list */}
          <div className="mt-10">
            <div className="grid grid-cols-[1fr_auto] border-b border-border pb-2 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
              <span>Platforms</span><span>Datetime</span>
            </div>
            {scheduledPosts.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border/60 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {p.platforms.map((pl) => <span key={pl} className="chip">{pl}</span>)}
                </div>
                <span className="label-mono normal-case tracking-wide">{new Date(p.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showEdit && (
        <aside className="hidden w-80 shrink-0 border-l border-border bg-surface p-6 lg:block">
          <div className="label-mono mb-4">edit_post</div>
          <Field label="post_title">
            <input defaultValue="Sunday Service Highlights - Week 18" className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="target_platforms">
            <div className="flex flex-wrap gap-1.5">
              {["X / Twitter", "Facebook", "Instagram", "TikTok"].map((p, i) => (
                <span key={p} className={`rounded-sm border px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] ${i === 1 ? "border-foreground bg-foreground text-background" : "border-border"}`}>{p}</span>
              ))}
            </div>
          </Field>
          <Field label="hashtags">
            <textarea rows={4} defaultValue="#SundayService #ChurchFamily #Faith #Community #WorshipNight #ToreccSocial #LivestreamReady" className="w-full rounded-sm border border-border bg-background px-3 py-2 text-xs leading-relaxed" />
          </Field>
        </aside>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="label-mono mb-1.5">{label}</div>
      {children}
    </div>
  );
}
