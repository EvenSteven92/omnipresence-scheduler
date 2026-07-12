import { TrafficLight } from "@/components/ui/TrafficLight";
import {
  cardStatusLabel,
  type CardLifecycleStatus,
} from "@/lib/card-display";
import {
  formatLibraryMetaDate,
  type LibraryCardItem,
} from "@/lib/studio-library";
import { cn } from "@/lib/utils";

function statusBorder(status: CardLifecycleStatus): string {
  switch (status) {
    case "SCHEDULED":
      return "border-2 border-warning";
    case "LIVE":
      return "border-2 border-success";
    case "FAILED":
      return "border-2 border-destructive";
    default:
      return "border border-line";
  }
}

export function StudioLibraryCardTile({
  card,
  selected,
  onSelect,
  onOpen,
}: {
  card: LibraryCardItem;
  selected?: boolean;
  onSelect?: () => void;
  onOpen: () => void;
}) {
  const statusDate =
    card.status === "LIVE" && card.publishedAt
      ? `Published · ${formatLibraryMetaDate(card.publishedAt)}`
      : card.status === "SCHEDULED" && card.scheduledAt
        ? `Scheduled · ${formatLibraryMetaDate(card.scheduledAt)}`
        : card.status === "FAILED" && card.scheduledAt
          ? `Failed · ${formatLibraryMetaDate(card.scheduledAt)}`
          : card.status === "IDLE"
            ? "Not scheduled"
            : null;

  return (
    <div
      className="group flex flex-col"
      data-testid={`library-card-tile-${card.id}`}
    >
      <button
        type="button"
        onClick={() => {
          onSelect?.();
          onOpen();
        }}
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-md bg-paper-2 text-left transition-[border-color,box-shadow] duration-150",
          statusBorder(card.status),
          selected && "ring-2 ring-brand ring-offset-1 ring-offset-background",
        )}
        aria-label={`Open ${card.title} on board`}
      >
        {card.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.previewUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary px-2 text-center text-xs text-muted-foreground">
            {card.title.slice(0, 40)}
          </div>
        )}
        <div className="absolute right-1.5 top-1.5">
          <TrafficLight
            status={card.status}
            size="sm"
            showLabel={false}
            title={cardStatusLabel(card.status)}
          />
        </div>
      </button>
      <div className="mt-2 min-w-0 px-0.5">
        <h3 className="truncate text-sm font-medium text-foreground">
          {card.title}
        </h3>
        <p className="mt-1 space-y-0.5">
          <span className="block font-mono text-[0.58rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Created{" "}
            <span className="font-sans font-medium normal-case tracking-normal text-foreground/80">
              {formatLibraryMetaDate(card.createdAt)}
            </span>
            <span className="mx-1 text-muted-foreground/50">·</span>
            Edited{" "}
            <span className="font-sans font-medium normal-case tracking-normal text-foreground/80">
              {formatLibraryMetaDate(card.updatedAt)}
            </span>
          </span>
          {statusDate ? (
            <span className="block text-[0.65rem] font-medium text-muted-foreground">
              {statusDate}
            </span>
          ) : null}
          <span className="block truncate text-[0.65rem] text-muted-foreground">
            {card.boardName}
          </span>
        </p>
      </div>
    </div>
  );
}
