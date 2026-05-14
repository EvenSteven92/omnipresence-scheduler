import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Sparkles, Wand2, FileText, Hash, Languages, Quote } from "lucide-react";

export const Route = createFileRoute("/ai-studio")({
  head: () => ({
    meta: [
      { title: "AI Studio — TORCC OmniSocial" },
      { name: "description", content: "Generate captions, hooks, hashtags and short-form variants from any transcript." },
    ],
  }),
  component: AIStudioPage,
});

const TOOLS = [
  { icon: Wand2, label: "Caption Engine", desc: "Hook + body tuned per platform constraint." },
  { icon: FileText, label: "Long-Form Repurpose", desc: "Convert sermons & podcasts into shorts." },
  { icon: Hash, label: "Hashtag Forge", desc: "Audience-mapped tag clusters." },
  { icon: Quote, label: "Quote Cards", desc: "Pull-quote graphics ready for IG / FB." },
  { icon: Languages, label: "Translation Pass", desc: "Cross-locale variants in one click." },
  { icon: Sparkles, label: "Brand Voice Tune", desc: "Re-tone any draft to your brand kit." },
];

function AIStudioPage() {
  return (
    <div className="pb-20">
      <PageHeader eyebrow="ai_studio_v1.4" title="AI Studio" />
      <div className="px-10 pt-8">
        <div className="panel p-6">
          <div className="label-mono mb-3">prompt_console</div>
          <textarea rows={6} placeholder="Drop a transcript, link, or prompt…" className="w-full rounded-sm border border-dashed border-border bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none" />
          <div className="mt-3 flex justify-end">
            <button className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground">
              <Sparkles className="h-3 w-3" /> Generate
            </button>
          </div>
        </div>

        <div className="label-mono mt-10 mb-3">tool_grid</div>
        <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="group cursor-pointer bg-surface p-6 transition-colors hover:bg-secondary">
                <Icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
                <div className="mt-4 text-sm font-semibold uppercase tracking-[0.1em] text-foreground">{t.label}</div>
                <div className="mt-2 text-xs text-muted-foreground">{t.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
