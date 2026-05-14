import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import { Upload, Image as ImageIcon, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/scheduler")({
  head: () => ({
    meta: [
      { title: "Scheduler — TORCC OmniSocial" },
      { name: "description", content: "Compose a new post: target platforms, media, transcript, AI generation, and schedule." },
    ],
  }),
  component: SchedulerPage,
});

const PLATFORMS = ["X / Twitter", "Facebook", "Instagram", "TikTok", "YouTube", "FB Story", "IG Story"];
const FORMATS = [
  { name: "Landscape", spec: "16:9 — YouTube, Facebook, X" },
  { name: "Portrait", spec: "9:16 — TikTok, Reels, Shorts" },
  { name: "Story", spec: "9:16 — FB & IG Stories" },
];
const AI_TOOLS = ["Caption", "Short", "YT_Desc", "YT_Title", "Hashtags"];

export function SchedulerPage() {
  const [activePlatforms, setActivePlatforms] = useState<string[]>(["Facebook", "Instagram"]);
  const [format, setFormat] = useState("Landscape");
  const [aiTool, setAiTool] = useState("Caption");
  const [selectedDay, setSelectedDay] = useState(13);

  const toggle = (p: string) =>
    setActivePlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  // Build May 2024 calendar grid (Sun-start). May 1 2024 = Wednesday.
  const cells: { d: number; muted: boolean }[] = [];
  for (let i = 28; i <= 30; i++) cells.push({ d: i, muted: true });
  for (let d = 1; d <= 31; d++) cells.push({ d, muted: false });
  while (cells.length % 7 !== 0) cells.push({ d: cells.length - 33, muted: true });

  return (
    <div className="pb-20">
      <PageHeader
        title="New Post"
        actions={
          <>
            <span className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              status: <span className="text-foreground">draft</span>
            </span>
            <button className="rounded-sm border border-border bg-surface px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground hover:bg-secondary">Save_Draft</button>
            <button className="rounded-sm bg-secondary px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">Schedule_Post</button>
          </>
        }
      />

      <div className="mx-auto max-w-2xl space-y-6 px-10 pt-8">
        {/* Target platforms */}
        <Section label="target_platforms">
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => toggle(p)}
                className={`rounded-sm border px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] transition-colors ${
                  activePlatforms.includes(p)
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-foreground hover:bg-secondary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="label-mono mt-6 mb-2">media_preview</div>
          <div className="panel p-4">
            <span className="rounded-sm border border-border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">Draft</span>
            <div className="mt-4 flex aspect-video flex-col items-center justify-center border border-dashed border-border text-muted-foreground">
              <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
              <span className="label-mono mt-2">no_media_asset</span>
            </div>
          </div>
        </Section>

        {/* Media assets */}
        <Section label="media_assets">
          <button className="flex w-full flex-col items-center justify-center gap-2 border border-dashed border-border bg-background/40 py-10 text-muted-foreground hover:text-foreground">
            <Upload className="h-5 w-5" strokeWidth={1.5} />
            <span className="label-mono">Upload</span>
          </button>

          <div className="label-mono mt-6 mb-2">format_spec</div>
          <div className="space-y-2">
            {FORMATS.map((f) => (
              <button
                key={f.name}
                onClick={() => setFormat(f.name)}
                className={`flex w-full flex-col items-start rounded-sm border px-4 py-3 text-left transition-colors ${
                  format === f.name ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-secondary"
                }`}
              >
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em]">{f.name}</span>
                <span className={`mt-1 text-xs ${format === f.name ? "text-background/70" : "text-muted-foreground"}`}>{f.spec}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Title */}
        <Section label="post_title">
          <input
            placeholder="e.g., Sunday Service Highlights"
            className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />
        </Section>

        {/* Transcript + AI */}
        <Section label="transcript + ai_generator">
          <textarea
            rows={5}
            placeholder="Paste your sermon or content transcript here…"
            className="w-full rounded-sm border border-dashed border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />

          <div className="label-mono mt-5 mb-2">ai_content_generator</div>
          <div className="flex flex-wrap gap-2">
            {AI_TOOLS.map((t) => (
              <button
                key={t}
                onClick={() => setAiTool(t)}
                className={`rounded-sm border px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] ${
                  aiTool === t ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-foreground hover:bg-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button className="mt-3 inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground">
            <Sparkles className="h-3 w-3" /> Generate
          </button>
        </Section>

        {/* Content payload */}
        <Section label="content_payload">
          <Field label="caption">
            <textarea rows={3} placeholder="Your social media caption…" className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </Field>
          <Field label="hashtags">
            <textarea rows={2} placeholder="#church #faith #sermon…" className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </Field>
          <Field label="internal_notes">
            <textarea rows={2} placeholder="Notes for your team…" className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
          </Field>
        </Section>

        {/* Schedule */}
        <Section label="schedule_date_time">
          <div className="flex items-center justify-between">
            <span className="display-mono text-sm">May 2024</span>
            <div className="flex items-center gap-1">
              <button className="rounded-sm border border-border p-1.5 hover:bg-secondary"><ChevronLeft className="h-3 w-3" /></button>
              <button className="rounded-sm border border-border p-1.5 hover:bg-secondary"><ChevronRight className="h-3 w-3" /></button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-px border border-border bg-border">
            {["sun","mon","tue","wed","thu","fri","sat"].map((d) => (
              <div key={d} className="bg-surface py-2 text-center label-mono">{d}</div>
            ))}
            {cells.map((c, i) => (
              <button
                key={i}
                onClick={() => !c.muted && setSelectedDay(c.d)}
                className={`aspect-square bg-surface p-2 text-left text-xs ${
                  c.muted ? "text-muted-foreground/40" : "text-foreground hover:bg-secondary"
                } ${selectedDay === c.d && !c.muted ? "outline outline-1 outline-foreground" : ""}`}
              >
                {c.d}
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="label-mono mb-3">{label}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="label-mono mb-1.5">{label}</div>
      {children}
    </div>
  );
}
