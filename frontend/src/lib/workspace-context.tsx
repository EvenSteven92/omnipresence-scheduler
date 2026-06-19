import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_WORKSPACE_ID,
  getWorkspace,
  listWorkspaces,
  readStoredWorkspaceId,
  writeStoredWorkspaceId,
  type WorkspaceId,
  type WorkspaceProfile,
} from "@/lib/workspaces";
import type { ScheduledPost } from "@/lib/mock-data";
import { mergeScheduledPosts, useComposerScheduledPosts } from "@/hooks/useComposerScheduledPosts";

interface WorkspaceContextValue {
  workspaceId: WorkspaceId;
  workspace: WorkspaceProfile;
  workspaces: WorkspaceProfile[];
  setWorkspaceId: (id: WorkspaceId) => void;
  addScheduledPosts: (posts: ScheduledPost[]) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function initialWorkspaceId(): WorkspaceId {
  return readStoredWorkspaceId() ?? DEFAULT_WORKSPACE_ID;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState<WorkspaceId>(initialWorkspaceId);
  const { composerScheduled, addScheduledPosts } = useComposerScheduledPosts(workspaceId);

  const setWorkspaceId = useCallback((id: WorkspaceId) => {
    setWorkspaceIdState(id);
    writeStoredWorkspaceId(id);
  }, []);

  const value = useMemo<WorkspaceContextValue>(() => {
    const base = getWorkspace(workspaceId);
    const workspace: WorkspaceProfile = {
      ...base,
      scheduledPosts: mergeScheduledPosts(base.scheduledPosts, composerScheduled),
    };
    return {
      workspaceId,
      workspace,
      workspaces: listWorkspaces(),
      setWorkspaceId,
      addScheduledPosts,
    };
  }, [workspaceId, setWorkspaceId, composerScheduled, addScheduledPosts]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
