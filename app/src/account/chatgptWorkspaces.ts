import type { PhobosChatgptAccountSession, PhobosChatgptAccountSessions, PhobosChatgptWorkspace } from "../electron";

export function chatgptWorkspaceLabel(workspace: PhobosChatgptWorkspace) {
  return workspace.kind === "personal" ? "Personal account" : workspace.name?.trim() || "Workspace";
}

export function activeChatgptSession(sessions: PhobosChatgptAccountSessions | null): PhobosChatgptAccountSession | null {
  return sessions?.sessions.find((session) => session.sessionId === sessions.activeSessionId) ?? null;
}

export function selectedChatgptWorkspace(session: PhobosChatgptAccountSession | null): PhobosChatgptWorkspace | null {
  return session?.workspaces.find((workspace) => workspace.accountId === session.selectedWorkspaceId) ?? null;
}
