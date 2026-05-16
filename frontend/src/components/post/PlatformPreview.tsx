import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Send, Bookmark, MoreHorizontal, Play, ChevronDown, ChevronRight, Image as ImageIcon } from "lucide-react";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import type { Platform } from "@/lib/mock-data";

/**
 * Inline platform previews for the composer card.
 * Renders a tab-switcher (one per selected platform) and a mock card body
 * showing how the post will look — terminal aesthetic, not pixel-perfect mocks.
 */
export function PlatformPreview({
  platforms,
  caption,
  hashtags,
  filename,
  format,
}: {
  platforms: Platform[];
  caption: string;
  hashtags: string;
  filename: string;
  format: "landscape" | "portrait" | "story";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Platform | null>(platforms[0] ?? null);

  // Default to first selected platform if active not in list
  const effective: Platform | null =
    active && platforms.includes(active) ? active : platforms[0] ?? null;

  return (
    <section className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="preview-toggle"
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="label-mono">platform_previews</span>
        <div className="flex items-center gap-2">
          <span className="label-mono text-muted-foreground/70">
            {platforms.length === 0
              ? "no_platform_selected"
              : `${platforms.length}_${platforms.length === 1 ? "preview" : "previews"}`}
          </span>
          {open ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {platforms.length === 0 ? (
            <div className="rounded-sm border border-dashed border-border bg-background/30 px-3 py-6 text-center label-mono">
              select_target_platforms_above
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-1">
                {platforms.map((p) => {
                  const Icon = PLATFORMS_BY_SHORT[p]?.Icon;
                  const isActive = effective === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActive(p)}
                      data-testid={`preview-tab-${p.replace(/\s+/g, "-")}`}
                      className={`flex items-center gap-1 rounded-sm border px-2 py-1 text-[0.55rem] uppercase tracking-[0.14em] transition-colors ${
                        isActive
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background/60 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {Icon && <Icon className="h-2.5 w-2.5" strokeWidth={2} />}
                      {p}
                    </button>
                  );
                })}
              </div>

              {effective && (
                <PlatformMock
                  platform={effective}
                  caption={caption}
                  hashtags={hashtags}
                  filename={filename}
                  format={format}
                />
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ─── individual mocks ───────────────────────────────────────────────────────

function Avatar({ initial = "T" }: { initial?: string }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[0.6rem] font-semibold text-background">
      {initial}
    </div>
  );
}

function MediaPlaceholder({
  ratio,
  rounded = false,
}: {
  ratio: "16/9" | "1/1" | "4/5" | "9/16";
  rounded?: boolean;
}) {
  const aspect =
    ratio === "16/9" ? "aspect-video" : ratio === "1/1" ? "aspect-square" : ratio === "4/5" ? "aspect-[4/5]" : "aspect-[9/16]";
  return (
    <div
      className={`relative flex w-full items-center justify-center bg-background/80 ${aspect} ${rounded ? "rounded-sm" : ""}`}
    >
      <Play className="h-8 w-8 text-muted-foreground" strokeWidth={1.25} />
    </div>
  );
}

function PlatformMock({
  platform,
  caption,
  hashtags,
  filename,
  format,
}: {
  platform: Platform;
  caption: string;
  hashtags: string;
  filename: string;
  format: "landscape" | "portrait" | "story";
}) {
  const display = caption.trim() || "Your caption preview will appear here once you start typing…";
  const tags = hashtags.trim();

  if (platform === "X") return <XMock caption={display} tags={tags} />;
  if (platform === "FB" || platform === "FB STORY") return <FBMock caption={display} tags={tags} filename={filename} format={format} story={platform === "FB STORY"} />;
  if (platform === "IG" || platform === "IG STORY") return <IGMock caption={display} tags={tags} filename={filename} format={format} story={platform === "IG STORY"} />;
  if (platform === "TIKTOK") return <TikTokMock caption={display} tags={tags} />;
  if (platform === "YT") return <YTMock caption={display} tags={tags} filename={filename} />;
  return null;
}

function XMock({ caption, tags }: { caption: string; tags: string }) {
  return (
    <div data-testid="mock-X" className="rounded-sm border border-border bg-background/60 p-3">
      <div className="flex items-start gap-2">
        <Avatar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-xs">
            <span className="font-semibold text-foreground">TORCC OmniSocial</span>
            <span className="text-muted-foreground">@torcc · now</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
            {caption.length > 280 ? caption.slice(0, 277) + "…" : caption}
            {tags && <span className="block text-accent">{tags}</span>}
          </p>
          <MediaPlaceholder ratio="16/9" rounded />
          <div className="mt-2 flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1 text-[0.65rem]"><MessageCircle className="h-3 w-3" /> 24</span>
            <span className="flex items-center gap-1 text-[0.65rem]"><Repeat2 className="h-3 w-3" /> 11</span>
            <span className="flex items-center gap-1 text-[0.65rem]"><Heart className="h-3 w-3" /> 142</span>
            <span className="flex items-center gap-1 text-[0.65rem]"><Send className="h-3 w-3" /> 8</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FBMock({ caption, tags, story }: { caption: string; tags: string; filename: string; format: string; story: boolean }) {
  if (story) {
    return <StoryMock platform="FB" caption={caption} />;
  }
  return (
    <div data-testid="mock-FB" className="overflow-hidden rounded-sm border border-border bg-background/60">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Avatar />
          <div className="text-xs">
            <div className="font-semibold text-foreground">TORCC OmniSocial</div>
            <div className="label-mono text-muted-foreground">just now · 🌍</div>
          </div>
        </div>
        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
      </div>
      <p className="px-3 pb-2 whitespace-pre-wrap break-words text-sm text-foreground">
        {caption}
        {tags && <span className="block text-accent">{tags}</span>}
      </p>
      <MediaPlaceholder ratio="16/9" />
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-muted-foreground">
        <span className="flex items-center gap-1 text-[0.65rem]"><Heart className="h-3 w-3" /> Like</span>
        <span className="flex items-center gap-1 text-[0.65rem]"><MessageCircle className="h-3 w-3" /> Comment</span>
        <span className="flex items-center gap-1 text-[0.65rem]"><Send className="h-3 w-3" /> Share</span>
      </div>
    </div>
  );
}

function IGMock({ caption, tags, story, format }: { caption: string; tags: string; filename: string; format: string; story: boolean }) {
  if (story) return <StoryMock platform="IG" caption={caption} />;
  const ratio = format === "landscape" ? "16/9" : "4/5";
  return (
    <div data-testid="mock-IG" className="overflow-hidden rounded-sm border border-border bg-background/60">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <Avatar />
          <span className="text-xs font-semibold text-foreground">torcc_omni</span>
        </div>
        <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
      </div>
      <MediaPlaceholder ratio={ratio} />
      <div className="flex items-center justify-between px-3 pt-2 text-foreground">
        <div className="flex items-center gap-3">
          <Heart className="h-4 w-4" />
          <MessageCircle className="h-4 w-4" />
          <Send className="h-4 w-4" />
        </div>
        <Bookmark className="h-4 w-4" />
      </div>
      <div className="px-3 pt-1 pb-3 text-sm">
        <div className="font-semibold text-foreground">1,248 likes</div>
        <p className="mt-1 whitespace-pre-wrap break-words text-foreground line-clamp-3">
          <span className="font-semibold">torcc_omni</span> {caption}
        </p>
        {tags && <p className="mt-1 break-words text-accent line-clamp-2">{tags}</p>}
      </div>
    </div>
  );
}

function StoryMock({ platform, caption }: { platform: "IG" | "FB"; caption: string }) {
  return (
    <div data-testid={`mock-${platform}-STORY`} className="relative mx-auto aspect-[9/16] w-40 overflow-hidden rounded-sm border border-border bg-gradient-to-br from-accent/30 via-background to-background">
      <div className="absolute inset-x-2 top-2 h-0.5 rounded-full bg-foreground/80" />
      <div className="absolute inset-x-2 top-4 flex items-center gap-1.5">
        <Avatar />
        <span className="text-[0.6rem] font-semibold text-foreground">torcc · {platform.toLowerCase()}</span>
      </div>
      <div className="absolute inset-x-3 bottom-3 text-[0.6rem] leading-tight text-foreground line-clamp-4">
        {caption}
      </div>
    </div>
  );
}

function TikTokMock({ caption, tags }: { caption: string; tags: string }) {
  return (
    <div data-testid="mock-TIKTOK" className="relative mx-auto aspect-[9/16] w-44 overflow-hidden rounded-sm border border-border bg-background">
      <MediaPlaceholder ratio="9/16" />
      <div className="absolute right-2 top-1/3 flex flex-col items-center gap-3 text-foreground">
        <div className="flex flex-col items-center text-[0.55rem]"><Heart className="h-4 w-4" /> 24.1k</div>
        <div className="flex flex-col items-center text-[0.55rem]"><MessageCircle className="h-4 w-4" /> 612</div>
        <div className="flex flex-col items-center text-[0.55rem]"><Send className="h-4 w-4" /> 411</div>
      </div>
      <div className="absolute inset-x-2 bottom-2 text-foreground">
        <div className="text-[0.65rem] font-semibold">@torcc_omni</div>
        <div className="mt-0.5 text-[0.6rem] leading-tight line-clamp-2">{caption}</div>
        {tags && <div className="mt-0.5 text-[0.55rem] text-accent line-clamp-1">{tags}</div>}
      </div>
    </div>
  );
}

function YTMock({ caption, tags, filename }: { caption: string; tags: string; filename: string }) {
  const title = filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
  return (
    <div data-testid="mock-YT" className="overflow-hidden rounded-sm border border-border bg-background/60">
      <div className="relative">
        <MediaPlaceholder ratio="16/9" />
        <span className="absolute bottom-1.5 right-1.5 rounded-sm bg-background/80 px-1.5 py-0.5 font-mono text-[0.55rem] text-foreground">
          12:34
        </span>
      </div>
      <div className="flex gap-2 p-3">
        <Avatar />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-semibold text-foreground">{title}</div>
          <div className="label-mono mt-1">torcc · 248k views · 2 hr ago</div>
          <p className="mt-2 whitespace-pre-wrap break-words text-[0.65rem] text-muted-foreground line-clamp-3">
            {caption}
            {tags && <span className="block text-accent">{tags}</span>}
          </p>
        </div>
        <ImageIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}
