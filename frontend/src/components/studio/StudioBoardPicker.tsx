import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Search } from "lucide-react";
import {
  StudioBoardCard,
  StudioNewBoardTile,
} from "@/components/studio/StudioBoardCard";
import { StudioLibraryCardTile } from "@/components/studio/StudioLibraryCardTile";
import type { StudioBoardMeta } from "@/lib/studio-boards";
import { defaultBoardName } from "@/lib/studio-boards";
import {
  enumerateLibraryCards,
  filterLibraryBoards,
  filterLibraryCards,
  sortLibraryBoards,
  sortLibraryCards,
  type LibraryCardItem,
  type LibrarySortDir,
  type LibrarySortKey,
  type LibraryStatusFilter,
  type LibraryTypeTab,
} from "@/lib/studio-library";
import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

const TYPE_TABS: { id: LibraryTypeTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "boards", label: "Boards" },
  { id: "cards", label: "Cards" },
];

const SORT_OPTIONS: { id: LibrarySortKey; label: string }[] = [
  { id: "edited", label: "Last edited" },
  { id: "created", label: "Date created" },
  { id: "name", label: "Name" },
  { id: "scheduled", label: "Scheduled date" },
  { id: "published", label: "Published date" },
];

const STATUS_CHIPS: { id: LibraryStatusFilter; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "draft", label: "Draft" },
  { id: "scheduled", label: "Scheduled" },
  { id: "live", label: "Live" },
  { id: "failed", label: "Failed" },
];

/**
 * Unified project library — 16:9 boards + square cards, search, sort, status.
 */
export function StudioBoardPicker({
  boards,
  activeId,
  workspaceId,
  scheduledPosts = [],
  publishedPosts = [],
  title = "Boards",
  subtitle = "Boards and cards in one library. Open a board to edit; open a card to jump to its board.",
  showNew = true,
  initialLibrary = "all",
  initialQuery = "",
  initialSort = "edited",
  initialDir = "desc",
  initialStatus = "all",
  onOpen,
  onOpenCard,
  onNew,
  onSave,
  onRename,
  onDelete,
  onLibraryStateChange,
}: {
  boards: StudioBoardMeta[];
  activeId: string | null;
  workspaceId: WorkspaceId;
  scheduledPosts?: ScheduledPost[];
  publishedPosts?: PublishedPost[];
  title?: string;
  subtitle?: string;
  showNew?: boolean;
  initialLibrary?: LibraryTypeTab;
  initialQuery?: string;
  initialSort?: LibrarySortKey;
  initialDir?: LibrarySortDir;
  initialStatus?: LibraryStatusFilter;
  onOpen: (id: string) => void;
  onOpenCard?: (card: LibraryCardItem) => void;
  onNew?: (name: string) => void;
  onSave?: (id: string) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
  /** Keep URL in sync for shareable library filters. */
  onLibraryStateChange?: (state: {
    library: LibraryTypeTab;
    q: string;
    sort: LibrarySortKey;
    dir: LibrarySortDir;
    status: LibraryStatusFilter;
  }) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | "new" | null>(
    activeId,
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [typeTab, setTypeTab] = useState<LibraryTypeTab>(initialLibrary);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<LibrarySortKey>(initialSort);
  const [dir, setDir] = useState<LibrarySortDir>(initialDir);
  const [status, setStatus] = useState<LibraryStatusFilter>(initialStatus);

  // Sync from URL when parent search changes (deep link / back)
  useEffect(() => {
    setTypeTab(initialLibrary);
  }, [initialLibrary]);
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);
  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);
  useEffect(() => {
    setDir(initialDir);
  }, [initialDir]);
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  // Push library chrome state to URL (debounced for search typing)
  useEffect(() => {
    if (!onLibraryStateChange) return;
    const t = window.setTimeout(() => {
      onLibraryStateChange({
        library: typeTab,
        q: query,
        sort,
        dir,
        status,
      });
    }, query ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [typeTab, query, sort, dir, status, onLibraryStateChange]);

  const allCards = useMemo(
    () =>
      enumerateLibraryCards(workspaceId, scheduledPosts, publishedPosts),
    [workspaceId, scheduledPosts, publishedPosts],
  );

  const filteredBoards = useMemo(() => {
    const f = filterLibraryBoards(boards, query);
    return sortLibraryBoards(f, sort, dir);
  }, [boards, query, sort, dir]);

  const filteredCards = useMemo(() => {
    const f = filterLibraryCards(allCards, { q: query, status });
    return sortLibraryCards(f, sort, dir);
  }, [allCards, query, status, sort, dir]);

  const showBoards = typeTab === "all" || typeTab === "boards";
  const showCards = typeTab === "all" || typeTab === "cards";
  const statusEnabled = typeTab !== "boards";

  const searchPlaceholder =
    typeTab === "boards"
      ? "Search boards…"
      : typeTab === "cards"
        ? "Search cards…"
        : "Search boards & cards…";

  const selectedBoard =
    selectedId && selectedId !== "new"
      ? boards.find((b) => b.id === selectedId)
      : null;
  const selectedCard = selectedCardId
    ? allCards.find((c) => c.id === selectedCardId)
    : null;

  function confirmDelete(b: StudioBoardMeta) {
    if (window.confirm(`Delete “${b.name}”? This cannot be undone.`)) {
      onDelete?.(b.id);
    }
  }

  function openSelected() {
    if (selectedBoard) onOpen(selectedBoard.id);
    else if (selectedCard && onOpenCard) onOpenCard(selectedCard);
  }

  return (
    <div
      data-testid="studio-board-picker"
      className="flex w-full min-h-0 flex-1 flex-col animate-fade-in bg-background"
    >
      <header className="flex shrink-0 flex-col gap-3 border-b border-line bg-card px-5 py-3 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Projects
            </p>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <label className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-line bg-paper-2 py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
              data-testid="library-search"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-md border border-line bg-paper-2 p-0.5"
            role="tablist"
            aria-label="Library type"
          >
            {TYPE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={typeTab === t.id}
                onClick={() => setTypeTab(t.id)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
                  typeTab === t.id
                    ? "bg-foreground text-white"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`library-tab-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-mono text-[0.6rem] font-bold uppercase">
              Sort
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as LibrarySortKey)}
              className="rounded-md border border-line bg-card px-2 py-1.5 text-xs font-semibold text-foreground focus:border-foreground focus:outline-none"
              data-testid="library-sort"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="btn-action btn-action-secondary inline-flex min-h-8 items-center gap-1.5 text-caption"
            title={dir === "desc" ? "Newest first" : "Oldest first"}
            data-testid="library-sort-dir"
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            {dir === "desc" ? "Desc" : "Asc"}
          </button>

          {showNew && onNew ? (
            <button
              type="button"
              onClick={() => onNew(defaultBoardName())}
              className="btn-action btn-action-primary ml-auto min-h-8 !text-white text-caption"
            >
              + New board
            </button>
          ) : null}
        </div>

        <div
          className={cn(
            "flex flex-wrap gap-1.5",
            !statusEnabled && "pointer-events-none opacity-40",
          )}
        >
          {STATUS_CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={!statusEnabled}
              onClick={() => setStatus(c.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-wide transition-colors",
                status === c.id
                  ? "border-foreground bg-foreground text-white"
                  : "border-line bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
              data-testid={`library-status-${c.id}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8 md:py-8">
        {showBoards ? (
          <section className="mb-10">
            {typeTab === "all" ? (
              <h2 className="mb-3 font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Boards
              </h2>
            ) : null}
            <StudioBoardGrid>
              {showNew && onNew ? (
                <StudioNewBoardTile
                  selected={selectedId === "new"}
                  onClick={() => {
                    setSelectedId("new");
                    setSelectedCardId(null);
                    onNew(defaultBoardName());
                  }}
                />
              ) : null}
              {filteredBoards.map((b) => (
                <StudioBoardCard
                  key={b.id}
                  board={b}
                  isActive={b.id === activeId}
                  selected={selectedId === b.id}
                  onSelect={() => {
                    setSelectedId(b.id);
                    setSelectedCardId(null);
                  }}
                  onOpen={() => onOpen(b.id)}
                  onSave={onSave ? () => onSave(b.id) : undefined}
                  onRename={
                    onRename ? (name) => onRename(b.id, name) : undefined
                  }
                  onDelete={onDelete ? () => confirmDelete(b) : undefined}
                />
              ))}
            </StudioBoardGrid>
            {filteredBoards.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                No boards match.
              </p>
            ) : null}
          </section>
        ) : null}

        {showCards ? (
          <section>
            {typeTab === "all" ? (
              <h2 className="mb-3 font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Cards
              </h2>
            ) : null}
            <StudioCardGrid>
              {filteredCards.map((c) => (
                <StudioLibraryCardTile
                  key={c.id}
                  card={c}
                  selected={selectedCardId === c.id}
                  onSelect={() => {
                    setSelectedCardId(c.id);
                    setSelectedId(null);
                  }}
                  onOpen={() => onOpenCard?.(c)}
                />
              ))}
            </StudioCardGrid>
            {filteredCards.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                No cards match.
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-5 py-3 md:px-8">
        <p className="text-xs text-muted-foreground">
          {selectedBoard
            ? `Selected board: ${selectedBoard.name}`
            : selectedCard
              ? `Selected card: ${selectedCard.title}`
              : selectedId === "new"
                ? "New board"
                : "Select a board or card"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!selectedBoard && !selectedCard}
            onClick={openSelected}
            className="btn-action btn-action-primary min-h-9 !text-white disabled:opacity-40"
            data-testid="board-open"
          >
            {selectedCard ? "Open on board" : "Open"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export function StudioBoardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

function StudioCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {children}
    </div>
  );
}
