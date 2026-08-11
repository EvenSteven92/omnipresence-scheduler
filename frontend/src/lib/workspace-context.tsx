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
import { mergeScheduledPosts } from "@/lib/scheduled-posts-storage";
import { usePersistedPosts } from "@/hooks/usePersistedPosts";

interface WorkspaceContextValue {
  workspaceId: WorkspaceId;
  workspace: WorkspaceProfile;
  workspaces: WorkspaceProfile[];
  setWorkspaceId: (id: WorkspaceId) => void;
  /** Always false in local-only builds. Kept for call-site compatibility. */
  postsDbMode: boolean;
  postsLoading: boolean;
  addScheduledPosts: (posts: ScheduledPost[]) => void | Promise<void>;
  upsertScheduledPost: (post: ScheduledPost) => void | Promise<void>;
  removeScheduledPost: (postId: string) => void | Promise<void>;
  associatePost: (postId: string, eventId: string | undefined) => Promise<boolean>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function initialWorkspaceId(): WorkspaceId {
  return readStoredWorkspaceId() ?? DEFAULT_WORKSPACE_ID;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState<WorkspaceId>(initialWorkspaceId);
  const {
    posts: persistedPosts,
    deletedIds,
    isLoading: postsLoading,
    addScheduledPosts,
    upsertScheduledPost,
    removeScheduledPost,
    associatePost: associatePostId,
  } = usePersistedPosts(workspaceId);

  const setWorkspaceId = useCallback((id: WorkspaceId) => {
    setWorkspaceIdState(id);
    writeStoredWorkspaceId(id);
  }, []);

  const associatePost = useCallback(
    async (postId: string, eventId: string | undefined) => {
      // Clone seed card into localStorage with eventId so merge wins over base.
      const base = getWorkspace(workspaceId);
      const scheduled = mergeScheduledPosts(base.scheduledPosts, persistedPosts, deletedIds);
      const post = scheduled.find((p) => p.id === postId);
      if (post) {
        await upsertScheduledPost({ ...post, eventId: eventId || undefined });
        return true;
      }
      return associatePostId(postId, eventId);
    },
    [workspaceId, persistedPosts, deletedIds, upsertScheduledPost, associatePostId],
  );

  const value = useMemo<WorkspaceContextValue>(() => {
    const base = getWorkspace(workspaceId);
    const scheduledPosts = mergeScheduledPosts(base.scheduledPosts, persistedPosts, deletedIds);

    const workspace: WorkspaceProfile = {
      ...base,
      scheduledPosts,
    };
    return {
      workspaceId,
      workspace,
      workspaces: listWorkspaces(),
      setWorkspaceId,
      postsDbMode: false,
      postsLoading,
      addScheduledPosts,
      upsertScheduledPost,
      removeScheduledPost,
      associatePost,
    };
  }, [
    workspaceId,
    setWorkspaceId,
    persistedPosts,
    deletedIds,
    postsLoading,
    addScheduledPosts,
    upsertScheduledPost,
    removeScheduledPost,
    associatePost,
  ]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
