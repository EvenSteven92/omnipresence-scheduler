import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Inbox, MessageCircle, RefreshCw, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useWorkspace } from "@/lib/workspace-context";
import { EmptyState } from "@/components/ui/EmptyState";
import { useEngageActions, useEngageThreads, type EngageThread } from "@/hooks/useEngage";
import { useWorkerHealth } from "@/hooks/useWorkerHealth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/engage")({
  head: () => ({
    meta: [
      { title: "Engage — OmniPresence" },
      {
        name: "description",
        content: "Comments and replies across YouTube, Facebook, and Instagram.",
      },
    ],
  }),
  component: EngagePage,
});

type PlatformFilter = "all" | "YT" | "FB" | "IG";

function EngagePage() {
  const { workspace, workspaceId } = useWorkspace();
  const { data: worker } = useWorkerHealth();
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [banner, setBanner] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useEngageThreads(workspaceId, {
    platform: platform === "all" ? undefined : platform,
    unreadOnly,
  });
  const actions = useEngageActions(workspaceId);

  const threads = data?.threads ?? [];
  const unread = data?.unread ?? 0;
  const selected = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? threads[0] ?? null,
    [threads, selectedId],
  );

  async function onSync() {
    setBanner(null);
    try {
      const result = (await actions.sync.mutateAsync()) as { synced?: number };
      setBanner(`Synced ${result.synced ?? 0} comment${result.synced === 1 ? "" : "s"}`);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Sync failed");
    }
  }

  async function onReply() {
    if (!selected || !replyText.trim()) return;
    setBanner(null);
    try {
      await actions.reply.mutateAsync({ threadId: selected.id, message: replyText.trim() });
      setReplyText("");
      setBanner("Reply sent");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Reply failed");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Engage"
        title="Inbox"
        description={`Comments for ${workspace.name}. Sync pulls YouTube, Facebook, and Instagram.`}
        actions={
          <>
            <button
              type="button"
              onClick={() => void onSync()}
              disabled={actions.sync.isPending || !worker?.online}
              className="btn-action btn-action-secondary inline-flex items-center gap-1.5"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", (actions.sync.isPending || isFetching) && "animate-spin")}
              />
              Sync
            </button>
            <Link to="/clients" className="btn-action-primary btn-action">
              Clients
            </Link>
          </>
        }
      />

      <div className="page-content mx-auto max-w-[1320px] space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <EngageStat label="In view" value={String(threads.length)} hint="Loaded threads" />
          <EngageStat
            label="Unread"
            value={String(unread)}
            hint="Needs attention"
            accent={unread > 0}
          />
          <EngageStat
            label="Worker"
            value={worker?.online ? "Online" : "Offline"}
            hint={worker?.online ? "Auto-sync ~2 min" : "Start worker to sync"}
          />
        </div>

        {banner ? (
          <div className="rounded-lg border border-line bg-paper-2 px-4 py-2 text-sm text-foreground">
            {banner}
          </div>
        ) : null}

        {!worker?.online ? (
          <EmptyState
            icon={Inbox}
            title="Worker offline"
            description="Comment sync needs the local worker. Open OmniPresence.app or run worker/start.sh."
            action={
              <Link to="/clients" className="btn-action-primary btn-action">
                Open Clients
              </Link>
            }
            className="border border-line bg-card py-10"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "YT", "FB", "IG"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-mono text-[0.625rem] font-bold uppercase",
                    platform === p
                      ? "border-foreground bg-foreground text-background"
                      : "border-line bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p === "all" ? "All" : p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUnreadOnly((v) => !v)}
                className={cn(
                  "rounded-md border px-2.5 py-1 font-mono text-[0.625rem] font-bold uppercase",
                  unreadOnly
                    ? "border-warning bg-warning/15 text-foreground"
                    : "border-line bg-card text-muted-foreground",
                )}
              >
                Unread only
              </button>
              <button
                type="button"
                onClick={() => void actions.markAllRead.mutateAsync()}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </div>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading comments…</p>
            ) : threads.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="No comments yet"
                description="Click Sync after connecting YouTube/Meta. You may need to reconnect accounts for comment scopes."
                action={
                  <button
                    type="button"
                    onClick={() => void onSync()}
                    className="btn-action-primary btn-action"
                  >
                    Sync now
                  </button>
                }
                className="border border-line bg-card py-10"
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
                  {threads.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(t.id);
                          if (t.unread) void actions.markRead.mutateAsync(t.id);
                        }}
                        className={cn(
                          "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-paper-2/80",
                          selected?.id === t.id && "bg-paper-2",
                          t.unread && "border-l-2 border-l-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[0.55rem] font-bold uppercase text-muted-foreground">
                            {t.platform}
                          </span>
                          <span className="truncate text-sm font-semibold text-foreground">
                            {t.authorName || "Unknown"}
                          </span>
                          {t.unread ? (
                            <span className="ml-auto rounded-full bg-foreground px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase text-background">
                              New
                            </span>
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {t.body || "(no text)"}
                        </p>
                        {t.postTitle ? (
                          <p className="truncate font-mono text-[0.55rem] text-muted-foreground/80">
                            on {t.postTitle}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>

                <EngageDetail
                  thread={selected}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  onReply={() => void onReply()}
                  busy={actions.reply.isPending}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EngageStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-3">
      <div className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-2xl font-bold",
          accent ? "text-warning" : "text-foreground",
        )}
      >
        {value}
      </div>
      <p className="text-[0.7rem] text-muted-foreground">{hint}</p>
    </div>
  );
}

function EngageDetail({
  thread,
  replyText,
  setReplyText,
  onReply,
  busy,
}: {
  thread: EngageThread | null;
  replyText: string;
  setReplyText: (v: string) => void;
  onReply: () => void;
  busy: boolean;
}) {
  if (!thread) {
    return (
      <div className="rounded-lg border border-dashed border-line px-4 py-8 text-sm text-muted-foreground">
        Select a comment to reply.
      </div>
    );
  }

  return (
    <aside className="flex flex-col gap-3 rounded-lg border border-line bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[0.55rem] font-bold uppercase">
          {thread.platform}
        </span>
        <span className="text-sm font-semibold text-foreground">
          {thread.authorName || "Unknown"}
        </span>
      </div>
      {thread.postTitle ? (
        <p className="font-mono text-[0.625rem] text-muted-foreground">On: {thread.postTitle}</p>
      ) : null}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {thread.body || "(no text)"}
      </p>
      {thread.createdAt ? (
        <p className="font-mono text-[0.55rem] text-muted-foreground">
          {new Date(thread.createdAt).toLocaleString()}
        </p>
      ) : null}

      <label className="mt-2 block space-y-1.5">
        <span className="font-mono text-[0.55rem] font-bold uppercase tracking-wide text-muted-foreground">
          Your reply
        </span>
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={4}
          placeholder="Write a reply…"
          className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/55 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <button
        type="button"
        disabled={busy || !replyText.trim()}
        onClick={onReply}
        className="btn-action-primary btn-action w-full justify-center disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send reply"}
      </button>
    </aside>
  );
}
