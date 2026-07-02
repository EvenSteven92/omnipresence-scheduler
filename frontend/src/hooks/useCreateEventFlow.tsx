import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ScheduleEventModal } from "@/components/calendar/ScheduleEventModal";
import { useCustomEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { today } from "@/lib/demo-clock";
import { useWorkspace } from "@/lib/workspace-context";
import type { ContentEvent } from "@/lib/workspaces/types";

export function useCreateEventFlow() {
  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const { addEvent } = useCustomEvents(workspaceId);
  const { isAssociated, associate } = useEventAssociations(workspaceId);
  const [open, setOpen] = useState(false);
  const [seedDate, setSeedDate] = useState(() => today());

  function openCreateEvent(date?: Date) {
    setSeedDate(date ?? today());
    setOpen(true);
  }

  function handleCreate(event: ContentEvent, associatePostIds: string[]) {
    addEvent(event);
    associatePostIds.forEach((postId) => associate(postId, event.id));
    setOpen(false);
    navigate({ to: "/events", search: { album: event.id } });
  }

  const modal = open ? (
    <ScheduleEventModal
      key={seedDate.toISOString()}
      date={seedDate}
      scheduledPosts={workspace.scheduledPosts}
      publishedPosts={workspace.publishedPosts}
      isAssociated={isAssociated}
      onCreate={handleCreate}
      onClose={() => setOpen(false)}
    />
  ) : null;

  return { openCreateEvent, modal };
}
