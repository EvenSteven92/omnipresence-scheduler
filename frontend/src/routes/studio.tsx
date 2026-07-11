import { createFileRoute } from "@tanstack/react-router";
import { Plus, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { StudioCanvas, type CanvasMode } from "@/components/studio/StudioCanvas";
import { StudioCard } from "@/components/studio/StudioCard";
import type { StudioTool } from "@/components/studio/StudioCardToolbar";
import {
  applyMeasuredDimensions,
  defaultDraftFromFile,
  type DraftPost,
} from "@/lib/composer-draft";
import {
  readComposerShelf,
  removeFromReady,
  revokeDraftMediaUrls,
  writeComposerShelf,
} from "@/lib/draft-storage";
import { measureMediaFile } from "@/lib/media-aspect";
import { generateCaptionWithHashtags, generateTranscript } from "@/lib/studio-ai";
import {
  cascadePosition,
  ensureCanvasPositions,
  hasScriptSource,
} from "@/lib/studio-layout";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useWorkspace } from "@/lib/workspace-context";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — TORCC OmniPresence" },
      {
        name: "description",
        content:
          "Whiteboard for preparing reels — transcript, CTA, then caption with hashtags.",
      },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<StudioTool | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mode, setMode] = useState<CanvasMode>("select");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCardRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    const shelf = readComposerShelf(workspaceId);
    const merged = ensureCanvasPositions([...shelf.drafting, ...shelf.ready]);
    setDrafts(merged);
    setSelectedId(merged[0]?.id ?? null);
  }, [workspaceId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ready = drafts.filter(
      (d) =>
        d.caption.trim() &&
        (d.previewUrl || d.dropboxUrl || d.filename),
    );
    const drafting = drafts.filter((d) => !ready.some((r) => r.id === d.id));
    const shelf = readComposerShelf(workspaceId);
    writeComposerShelf(workspaceId, drafting, ready, shelf.savedDrafts);
  }, [workspaceId, drafts]);

  const updateDraft = useCallback((id: string, updater: (d: DraftPost) => DraftPost) => {
    setDrafts((cur) => cur.map((d) => (d.id === id ? updater(d) : d)));
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      setDrafts((cur) => {
        let next = [...cur];
        const created: DraftPost[] = arr.map((f) => {
          const base = defaultDraftFromFile(f, workspace.platforms);
          const pos = cascadePosition(next);
          const card: DraftPost = {
            ...base,
            canvasX: pos.x,
            canvasY: pos.y,
            studioOpen: {},
          };
          next = [...next, card];
          return card;
        });
        setSelectedId(created[created.length - 1]?.id ?? null);
        void Promise.all(
          arr.map(async (file, i) => {
            const dims = await measureMediaFile(file);
            if (!dims) return;
            const id = created[i]?.id;
            if (!id) return;
            setDrafts((c) =>
              c.map((d) =>
                d.id === id ? applyMeasuredDimensions(d, dims.width, dims.height) : d,
              ),
            );
          }),
        );
        return next;
      });
      showToast(`Added ${arr.length} reel${arr.length === 1 ? "" : "s"}`);
    },
    [workspace.platforms, showToast],
  );

  function removeDraft(id: string) {
    const victim = drafts.find((d) => d.id === id);
    if (victim) revokeDraftMediaUrls([victim]);
    setDrafts((cur) => cur.filter((d) => d.id !== id));
    removeFromReady(workspaceId, [id]);
    setSelectedId((sid) => (sid === id ? null : sid));
    showToast("Card removed");
  }

  async function runTranscript(id: string) {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    setBusy("transcript");
    try {
      const text = await generateTranscript(draft);
      updateDraft(id, (d) => ({
        ...d,
        transcript: text,
        studioOpen: { ...d.studioOpen, transcript: true },
      }));
      showToast("Transcript draft ready — edit freely");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Transcript failed");
    } finally {
      setBusy(null);
    }
  }

  async function runCaption(id: string) {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    if (!hasScriptSource(draft)) {
      showToast("Add a transcript or call to action first");
      updateDraft(id, (d) => ({
        ...d,
        studioOpen: { ...d.studioOpen, transcript: true, cta: true },
      }));
      return;
    }
    setBusy("caption");
    try {
      const { draft: next } = await generateCaptionWithHashtags(draft, {
        scheduledPosts: workspace.scheduledPosts,
        queue: drafts,
        voice: workspace.voice,
        events,
        postingTimes: workspace.postingTimes,
      });
      updateDraft(id, (d) => ({
        ...d,
        caption: next.caption,
        hashtags: next.hashtags,
        studioOpen: { ...d.studioOpen, caption: true },
      }));
      showToast("Caption generated from transcript & CTA");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Caption failed");
    } finally {
      setBusy(null);
    }
  }

  function handleTool(id: string, tool: StudioTool) {
    if (tool === "remove") {
      removeDraft(id);
      return;
    }
    if (tool === "transcript") {
      updateDraft(id, (d) => ({
        ...d,
        studioOpen: { ...d.studioOpen, transcript: true },
      }));
      if (!drafts.find((d) => d.id === id)?.transcript?.trim()) {
        void runTranscript(id);
      }
      return;
    }
    if (tool === "cta") {
      updateDraft(id, (d) => ({
        ...d,
        studioOpen: { ...d.studioOpen, cta: true },
      }));
      return;
    }
    if (tool === "caption") {
      updateDraft(id, (d) => ({
        ...d,
        studioOpen: { ...d.studioOpen, caption: true },
      }));
      void runCaption(id);
    }
  }

  function onCardPointerDown(id: string, e: React.PointerEvent) {
    if (mode !== "select") return;
    e.stopPropagation();
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    setSelectedId(id);
    dragCardRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      originX: draft.canvasX ?? 48,
      originY: draft.canvasY ?? 48,
    };

    function move(ev: PointerEvent) {
      const d = dragCardRef.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      updateDraft(d.id, (card) => ({
        ...card,
        canvasX: d.originX + dx,
        canvasY: d.originY + dy,
      }));
    }
    function up() {
      dragCardRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="studio-page">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Studio
          </p>
          <h1 className="font-display text-lg font-bold tracking-tight text-foreground">
            Reel board
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Transcript + CTA → caption. Scheduling comes later.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-action btn-action-primary !text-white"
            data-testid="studio-add-reels"
          >
            <Plus className="h-4 w-4" />
            Add reels
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </header>

      <StudioCanvas
        drafts={drafts}
        mode={mode}
        onModeChange={setMode}
        onBackgroundClick={() => setSelectedId(null)}
        onDropFiles={addFiles}
      >
        {drafts.length === 0 ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 w-[min(90vw,22rem)] -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="font-serif-accent text-2xl text-foreground md:text-3xl">
              Drop reels onto the board
            </p>
            <p className="mt-3 text-body-sm text-muted-foreground">
              Build transcript and CTA, then generate caption with hashtags.
            </p>
            <button
              type="button"
              className="btn-action btn-action-primary pointer-events-auto mt-5 !text-white"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Add reels
            </button>
          </div>
        ) : null}

        {drafts.map((draft) => (
          <StudioCard
            key={draft.id}
            draft={draft}
            selected={selectedId === draft.id}
            busy={selectedId === draft.id ? busy : null}
            canDrag={mode === "select"}
            onSelect={() => setSelectedId(draft.id)}
            onChange={(updater) => updateDraft(draft.id, updater)}
            onTool={(tool) => handleTool(draft.id, tool)}
            onGenerateTranscript={() => void runTranscript(draft.id)}
            onGenerateCaption={() => void runCaption(draft.id)}
            onDragStart={(e) => onCardPointerDown(draft.id, e)}
          />
        ))}
      </StudioCanvas>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-foreground px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-card)] md:bottom-20"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
