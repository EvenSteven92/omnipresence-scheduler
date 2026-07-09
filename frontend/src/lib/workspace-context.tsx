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
import { mergeScheduledPosts } from "@/hooks/useComposerScheduledPosts";
import { usePersistedPosts } from "@/hooks/usePersistedPosts";

interface WorkspaceContextValue {
  workspaceId: WorkspaceId;
  workspace: WorkspaceProfile;
  workspaces: WorkspaceProfile[];
  setWorkspaceId: (id: WorkspaceId) => void;
  /** True when posts are stored in Postgres via /api/posts. */
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
    dbMode: postsDbMode,
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
      // Local mode: clone seed card into session with eventId so merge wins over base.
      // DB mode: PATCH /api/posts/:id with eventId.
      if (!postsDbMode) {
        const base = getWorkspace(workspaceId);
        const scheduled = mergeScheduledPosts(base.scheduledPosts, persistedPosts);
        const post = scheduled.find((p) => p.id === postId);
        if (post) {
          await upsertScheduledPost({ ...post, eventId: eventId || undefined });
          return true;
        }
      }
      return associatePostId(postId, eventId);
    },
    [workspaceId, postsDbMode, persistedPosts, upsertScheduledPost, associatePostId],
  );

  const value = useMemo<WorkspaceContextValue>(() => {
    const base = getWorkspace(workspaceId);
    // DB mode: use only remote posts (no seed schedule). Local mode: seed + session posts.
    const scheduledPosts = postsDbMode
      ? persistedPosts
      : mergeScheduledPosts(base.scheduledPosts, persistedPosts);

    const workspace: WorkspaceProfile = {
      ...base,
      scheduledPosts,
    };
    return {
      workspaceId,
      workspace,
      workspaces: listWorkspaces(),
      setWorkspaceId,
      postsDbMode,
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
    postsDbMode,
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
