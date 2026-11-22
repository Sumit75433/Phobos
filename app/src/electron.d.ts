import type { ClientBrowserRequest, ClientBrowserState } from "./clientBrowser";
import type {
  ClientExtensionActionOutcome,
  ClientExtensionActionRequest,
  ClientExtensionCredentialCheck,
  ClientExtensionCredentialUpdate,
  ClientExtensionLifecycleOutcome,
  ClientExtensionLifecycleRequest,
  ClientExtensionMutation,
  ClientExtensionStoreSnapshot,
} from "./extensions/types";
import type { PhobosClientProjectionReadRequest } from "./generated/projectionReadContract";
import type {
  ClientWindowBootstrap,
  ClientWindowOpenOutcome,
  ClientWindowOpenRequest,
  ClientWindowReadyRequest,
  ClientPaneDragPayload,
  ClientPaneDragBeginRequest,
  ClientPaneDragState,
  ClientPaneDragOutcome,
  ClientPaneDropAnchorRequest,
  ClientPaneRect,
  ClientPaneTransferAcknowledgementRequest,
  ClientPaneTransferAccepted,
  ClientPaneTransferBeginRequest,
  ClientPaneTransferCompleted,
  ClientPaneTransferRequest,
} from "./shell/clientWindowModel";

export type PhobosClientContextMenuItem = { type: "separator" } | {
  id: string;
  label: string;
  type?: "normal" | "checkbox" | "radio";
  enabled?: boolean;
  checked?: boolean;
  accelerator?: string;
  submenu?: PhobosClientContextMenuItem[];
};
export type PhobosClientContextMenuRequest = {
  requestId: string;
  items: PhobosClientContextMenuItem[];
  position?: { x: number; y: number };
};
export type PhobosClientContextMenuResult = { requestId: string; id: string | null };

export {};

export type PhobosClientWindowCloseGuard = { windowId: string; generation: number };
export type PhobosClientWindowCloseRequest = PhobosClientWindowCloseGuard & { requestId: string; reason: "close" | "quit" | "logout" };
export type PhobosClientWindowCloseCancelled = PhobosClientWindowCloseGuard & { requestId: string; reason: "cancelled" | "invalidated" };
export type PhobosClientWindowCloseResolution = PhobosClientWindowCloseGuard & { requestId: string; allowClose: boolean };

declare global {
  interface Window {
    phobosTransport?: {
      showClientContextMenu(request: PhobosClientContextMenuRequest): Promise<PhobosClientContextMenuResult>;
      cancelClientContextMenu(request: { requestId: string }): Promise<{ cancelled: boolean }>;
      windowZoomFactor(): number;
      appInfo(): Promise<PhobosAppInfo>;
      openProblemReport(): Promise<void>;
      runClientDoctor(): Promise<PhobosClientDoctorReport>;
      copyText(value: string): Promise<{ copied: true }>;
      logClientEvent(request: PhobosClientLogRequest): Promise<{ written: true }>;
      openClientLogs(): Promise<{ path: string }>;
      selectClientDirectory(request?: PhobosClientPathSelectionRequest): Promise<PhobosClientDirectorySelection>;
      selectClientAttachments(request: PhobosClientAttachmentSelectionRequest): Promise<PhobosClientAttachmentSelection>;
      stageDroppedAttachments(files: readonly File[]): Promise<PhobosClientAttachmentSelection & { fileIndices: number[] }>;
      discardClientAttachmentStages(handles: readonly PhobosClientAttachmentStageHandle[]): Promise<void>;
      readClientAttachmentPreview(request: { id: string; contentHash: string }): Promise<{ base64: string; mimeType: string; contentHash: string; size: number }>;
      beginClientAttachmentStage(request: PhobosClientAttachmentStageBeginRequest): Promise<PhobosClientAttachmentStageHandle>;
      appendClientAttachmentStage(request: PhobosClientAttachmentStageAppendRequest): Promise<PhobosClientAttachmentStageProgress>;
      finalizeClientAttachmentStage(request: PhobosClientAttachmentStageFinalizeRequest): Promise<PhobosClientAttachmentStageHandle>;
      abortClientAttachmentStage(request: PhobosClientAttachmentStageAbortRequest): Promise<PhobosClientAttachmentStageAbortOutcome>;
      saveClientFile(request: PhobosClientFileRequest): Promise<PhobosClientFileSaveOutcome>;
      downloadClientFileCopy(request: PhobosClientFileRequest): Promise<PhobosClientFileSaveOutcome>;
      openClientFile(request: PhobosClientFileOpenRequest): Promise<PhobosClientFileOpenOutcome>;
      listClientFileOpenTargets(request: PhobosClientFileRequest): Promise<PhobosClientFileOpenTargets>;
      openClientFileWithApplication(request: PhobosClientFileOpenWithRequest): Promise<PhobosClientFileOpenOutcome>;
      startClientFileDrag(request: PhobosClientFileRequest): void;
      accessStatus(): Promise<PhobosClientAccessStatus>;
      configureAccess(password: string): Promise<PhobosClientAccessStatus>;
      unlockAccess(password: string): Promise<PhobosClientAccessStatus>;
      touchIdStatus(): Promise<PhobosTouchIdStatus>;
      setTouchIdEnabled(enabled: boolean): Promise<PhobosTouchIdStatus>;
      unlockWithTouchId(): Promise<PhobosClientAccessStatus>;
      lockAccess(): Promise<PhobosClientAccessStatus>;
      labAccess(): Promise<PhobosClientLabAccess>;
      updateLabAccess(password: string): Promise<PhobosClientLabAccess>;
      accessDetails(): Promise<PhobosClientAccessDetails>;
      updateAdministratorAccess(request: PhobosAdministratorAccessUpdate): Promise<PhobosClientAccessDetails>;
      requestMicrophoneAccess(): Promise<PhobosMicrophoneAccess>;
      requestCameraAccess(): Promise<PhobosCameraAccess>;
      cameraAccessStatus(): Promise<PhobosCameraAccess>;
      saveGestureTrace(text: string): Promise<PhobosGestureTraceSaved>;
      revealGestureTrace(path: string): Promise<{ revealed: boolean; path: string }>;
      clientWindowBootstrap(): ClientWindowBootstrap | null;
      openClientWindow(request?: ClientWindowOpenRequest): Promise<ClientWindowOpenOutcome>;
      clientWindowReady(request: ClientWindowReadyRequest): Promise<ClientWindowOpenOutcome>;
      registerClientWindowCloseGuard(): Promise<PhobosClientWindowCloseGuard>;
      unregisterClientWindowCloseGuard(request: PhobosClientWindowCloseGuard): Promise<void>;
      onClientWindowCloseRequested(listener: (request: PhobosClientWindowCloseRequest) => void): () => void;
      resolveClientWindowClose(request: PhobosClientWindowCloseResolution): Promise<{ accepted: boolean }>;
      onClientWindowCloseCancelled(listener: (request: PhobosClientWindowCloseCancelled) => void): () => void;
      beginClientPaneTransfer(request: ClientPaneTransferBeginRequest): ClientPaneDragPayload;
      beginClientPaneDrag(request: ClientPaneDragBeginRequest): Promise<{ phase: "prepared" | "cancelled" }>;
      moveClientPaneDrag(request: ClientPaneTransferRequest): Promise<{ phase: ClientPaneDragState["phase"]; destinationWindowId: string | null }>;
      finishClientPaneDrag(request: ClientPaneTransferRequest): Promise<ClientPaneDragOutcome>;
      cancelClientPaneDrag(request: ClientPaneTransferRequest): Promise<{ cancelled: true; transferId: string }>;
      reattachClientPane(request: ClientPaneTransferRequest): Promise<ClientPaneDragOutcome>;
      detachClientPane(request: ClientPaneTransferRequest): Promise<ClientPaneDragOutcome>;
      pendingClientPaneSourceFinalizations(): Promise<ClientPaneTransferCompleted[]>;
      acknowledgeClientPaneSourceFinalization(request: ClientPaneTransferRequest): Promise<{ acknowledged: true; transferId: string }>;
      registerClientPaneDropZone(request: ClientPaneRect | null): Promise<void>;
      anchorClientPaneDrop(request: ClientPaneDropAnchorRequest): Promise<{ anchored: boolean }>;
      onClientPaneDragState(listener: (state: ClientPaneDragState) => void): () => void;
      onClientPaneTransferAccepted(listener: (value: ClientPaneTransferAccepted) => void): () => void;
      onClientPaneTransferFinalized(listener: (value: ClientPaneTransferCompleted) => void): () => void;
      onClientPaneTransferCancelled(listener: (value: ClientPaneTransferCompleted) => void): () => void;
      acceptClientPaneTransfer(request: ClientPaneTransferRequest): Promise<ClientPaneTransferAccepted>;
      commitClientPaneTransfer(request: ClientPaneTransferRequest): Promise<ClientPaneTransferCompleted>;
      acknowledgeClientPaneTransfer(request: ClientPaneTransferAcknowledgementRequest): { released: boolean; transferId: string };
      rejectClientPaneTransfer(request: ClientPaneTransferRequest): Promise<{ rejected: true; transferId: string }>;
      cancelClientPaneTransfer(request: ClientPaneTransferRequest): Promise<{ cancelled: true; transferId: string }>;
      pendingClientPaneTransfers(): Promise<ClientPaneTransferCompleted[]>;
      pendingClientPaneDestinationTransfers(): Promise<(ClientPaneTransferCompleted & { committed: boolean })[]>;
      resumeClientPaneTransfer(request: ClientPaneTransferRequest): Promise<ClientPaneTransferCompleted>;
      finalizeClientPaneTransfer(request: ClientPaneTransferRequest): Promise<{ finalized: true; transferId: string }>;
      windowState(): Promise<PhobosWindowState>;
      setHistoryNavigationState(state: PhobosHistoryNavigationState): void;
      setWindowAppearance(appearance: PhobosWindowAppearance): void;
      setPowerSaveBlocker(enabled: boolean): Promise<{ enabled: boolean }>;
      setGlobalDictationShortcut(request: PhobosGlobalDictationShortcutRequest): Promise<PhobosGlobalDictationShortcutState>;
      setNativeCommandShortcuts(shortcuts: Record<string, readonly string[]>): Promise<{ configured: number }>;
      openQuickTaskWindow(): Promise<{ opened: true }>;
      closeQuickTaskWindow(): Promise<{ closed: true }>;
      openRunInMain(runId: string): Promise<{ opened: true; runId: string }>;
      openWorkerEnvironmentWindow(request: PhobosWorkerEnvironmentWindowTarget): Promise<PhobosWorkerEnvironmentWindowOutcome>;
      openWorkerEnvironmentInMain(request: PhobosWorkerEnvironmentWindowTarget): Promise<PhobosWorkerEnvironmentWindowOutcome>;
      setWorkerEnvironmentWindowPinned(enabled: boolean): Promise<{ pinned: boolean }>;
      openTaskMonitorWindow(runId: string): Promise<{ opened: true; runId: string }>;
      setTaskMonitorWindowPinned(enabled: boolean): Promise<{ pinned: boolean }>;
      loginItemSettings(request?: { enabled: boolean }): Promise<PhobosLoginItemSettings>;
      windowControl(action: "close" | "minimize" | "zoom"): void;
      relaunchClient(): Promise<{ relaunching: true }>;
      defaults(): Promise<PhobosTransportDefaults>;
      providerInterfaces(): Promise<PhobosProviderInterfacesResponse>;
      bootStatus(): Promise<PhobosRuntimeHostState>;
      chatgptAccount(): Promise<PhobosChatgptAccount>;
      chatgptRateLimits(): Promise<PhobosChatgptUsage>;
      chatgptAccountSessions(): Promise<PhobosChatgptAccountSessions>;
      chatgptSwitchWorkspace(request: { sessionId: string; accountId: string }): Promise<PhobosChatgptWorkspaceSwitch>;
      chatgptLogout(): Promise<PhobosChatgptAccount>;
      onChatgptAccountChanged(listener: () => void): () => void;
      chatgptSignInStart(): Promise<{ loginId: string; authUrl: string }>;
      chatgptSignInStatus(loginId: string): Promise<{ state: "pending" | "completed" | "failed"; error: string }>;
      chatgptSignInCancel(loginId: string): Promise<{ cancelled: boolean }>;
      openLaunchTerminal(request: PhobosTerminalResizeRequest): Promise<PhobosTerminalSnapshot>;
      writeLaunchTerminal(sessionId: string, data: string): Promise<PhobosTerminalSnapshot>;
      resizeLaunchTerminal(sessionId: string, request: PhobosTerminalResizeRequest): Promise<PhobosTerminalSnapshot>;
      openTerminal(request: PhobosTerminalOpenRequest): Promise<PhobosTerminalSnapshot>;
      writeTerminal(terminalId: string, sessionId: string, data: string): Promise<PhobosTerminalSnapshot>;
      resizeTerminal(terminalId: string, sessionId: string, request: PhobosTerminalResizeRequest): Promise<PhobosTerminalSnapshot>;
      closeTerminal(terminalId: string): Promise<{ closed: boolean }>;
      runtimeStatus(request?: PhobosRuntimeStatusRequest): Promise<PhobosRuntimeStatus>;
      validateRuntimeEndpoint(request: PhobosRuntimeEndpointValidationRequest): Promise<PhobosRuntimeEndpointValidation>;
      projectionRead(request: PhobosProjectionReadRequest): Promise<unknown>;
      workspaceSetupState(): Promise<PhobosWorkspaceSetupState>;
      saveSetupFile(request: { text: string; suggestedName: string }): Promise<{ saved: false } | { saved: true; name: string }>;
      openSetupFile(): Promise<{ opened: false } | { opened: true; name: string; text: string }>;
      clientSetupRead(request: { operationId: string }): Promise<PhobosClientSetupState | null>;
      clientSetupReadCurrent(): Promise<PhobosClientSetupState | null>;
      clientSetupBegin(request: PhobosClientSetupBeginRequest): Promise<PhobosClientSetupState>;
      clientSetupResume(request: { operationId: string; stopBefore?: "provider" }): Promise<PhobosClientSetupState>;
      mutateScheduledInterface(request: PhobosScheduledMutationRequest): Promise<PhobosScheduledMutationOutcome>;
      mutateApplicationPrivateConfiguration(request: PhobosApplicationPrivateConfigurationMutation): Promise<PhobosApplicationPrivateConfigurationOutcome>;
      applicationConnectionProbe(request: { applicationId: string }): Promise<PhobosApplicationConnectionProbe>;
      applicationConnectionConnect(request: PhobosApplicationConnectionRequest): Promise<PhobosApplicationConnectionState>;
      applicationConnectionCancel(request: { operationId: string }): Promise<{ cancelled: boolean }>;
      applicationConnectionDisconnect(request: { applicationId: string; interfaceId: string }): Promise<PhobosApplicationConnectionState>;
      mutatePhobosOsWorkspace(request: PhobosOsWorkspaceMutationRequest): Promise<PhobosOsWorkspaceMutationOutcome>;
      clientBrowser(request: ClientBrowserRequest): Promise<ClientBrowserState | null>;
      onClientBrowserState(listener: (state: ClientBrowserState) => void): () => void;
      onClientBrowserOpened(listener: (state: ClientBrowserState) => void): () => void;
      openCdpViewer(request: PhobosCdpViewerOpenRequest): Promise<PhobosCdpViewerState>;
      prepareNativeBrowserViewer(request: PhobosNativeBrowserViewerPrepareRequest): Promise<PhobosNativeBrowserViewerPrepared>;
      acknowledgeNativeBrowserViewer(request: PhobosNativeBrowserViewerSyncRequest): Promise<PhobosNativeBrowserViewerState>;
      syncNativeBrowserViewer(request: PhobosNativeBrowserViewerSyncRequest): Promise<PhobosNativeBrowserViewerState>;
      nativeBrowserCursorArrived(request: PhobosNativeBrowserViewerIdentity & { moveSequence: number; metricsRevision: number }): Promise<{ accepted: boolean }>;
      nativeBrowserViewerAction(request: PhobosNativeBrowserViewerActionRequest): Promise<PhobosNativeBrowserViewerState>;
      nativeBrowserDownloads(request: PhobosBrowserDownloadRequest): Promise<PhobosBrowserDownloadSnapshot>;
      closeNativeBrowserViewer(request: PhobosNativeBrowserViewerIdentity): Promise<void>;
      closeNativeBrowserPage(request: { home: string; workerEnvironmentId: string; surfaceId: string }): Promise<void>;
      browserSavedPermissions(request: { operation: "list" } | { operation: "remove"; home: string; hostGeneration: string; id: string }): Promise<PhobosSavedBrowserPermissions>;
      desktopSavedApplicationPermissions(request: PhobosSavedApplicationPermissionRequest): Promise<PhobosSavedApplicationPermissions>;
      desktopComputerUseSettings(request: { operation: "status" } | { operation: "set_enabled"; enabled: boolean }): Promise<{ enabled: boolean; ready: boolean; permissions: Array<{ kind: "screen_capture" | "accessibility"; status: string }> }>;
      desktopComputerUseSettings(request: { operation: "setup" }): Promise<{ opened: true }>;
      openDesktopPermissions(request: import("./components/worker-environment/desktopSurfaceModel").DesktopPermissionRequest): Promise<{ opened: true }>;
      desktopSurfaceRequest(request: import("./components/worker-environment/desktopSurfaceModel").DesktopSurfaceRequest): Promise<import("./components/worker-environment/desktopSurfaceModel").DesktopSurfaceResponse>;
      desktopApplicationView(request: import("./components/worker-environment/desktopSurfaceModel").DesktopApplicationViewRequest): Promise<{ attached: boolean }>;
      cdpViewerAction(request: PhobosCdpViewerActionRequest): Promise<PhobosCdpViewerState | PhobosCdpViewerActionAccepted>;
      closeCdpViewer(request: PhobosCdpViewerCloseRequest): Promise<PhobosCdpViewerCloseOutcome>;
      openProcessViewer(request: PhobosProcessViewerOpenRequest): Promise<PhobosProcessViewerSnapshot>;
      processViewerAction(request: PhobosProcessViewerActionRequest): Promise<PhobosProcessViewerActionOutcome>;
      closeProcessViewer(request: PhobosProcessViewerCloseRequest): Promise<{ sessionId: string; closed: true }>;
      listWorkerEnvironmentFiles(request: PhobosWorkerEnvironmentFilesRequest): Promise<PhobosWorkerEnvironmentDirectory>;
      readWorkerEnvironmentFile(request: PhobosWorkerEnvironmentFilesRequest): Promise<PhobosWorkerEnvironmentFile>;
      readWorkerEnvironmentFilePreview(request: PhobosWorkerEnvironmentFilesRequest): Promise<PhobosWorkerEnvironmentFilePreview>;
      readWorkerEnvironmentFileAttachment(request: PhobosWorkerEnvironmentFilesRequest): Promise<PhobosWorkerEnvironmentFileAttachment>;
      writeWorkerEnvironmentFile(request: PhobosWorkerEnvironmentFileWriteRequest): Promise<PhobosWorkerEnvironmentFileWriteOutcome>;
      performWorkerEnvironmentFileSystemAction(request: PhobosWorkerEnvironmentFileSystemActionRequest): Promise<PhobosWorkerEnvironmentFileSystemActionOutcome>;
      osFileRoots(): Promise<PhobosOsFileRoots>;
      listOsFiles(request: PhobosOsFilesRequest): Promise<PhobosOsDirectory>;
      readOsFile(request: PhobosOsFilesRequest): Promise<PhobosOsFile>;
      writeOsFile(request: PhobosOsFileWriteRequest): Promise<PhobosOsFileWriteOutcome>;
      performOsFileSystemAction(request: PhobosOsFileSystemActionRequest): Promise<PhobosOsFileSystemActionOutcome>;
      inspectWorkerEnvironmentGit(request: PhobosWorkerEnvironmentGitRequest): Promise<PhobosWorkerEnvironmentGitSnapshot>;
      performWorkerEnvironmentOperatorAction(request: PhobosWorkerEnvironmentOperatorActionRequest): Promise<PhobosWorkerEnvironmentOperatorActionOutcome>;
      clientSurfaceDocuments(): Promise<PhobosClientSurfaceDocumentSnapshot>;
      clientExtensions(): Promise<ClientExtensionStoreSnapshot>;
      mutateClientExtension(request: ClientExtensionMutation): Promise<ClientExtensionStoreSnapshot>;
      setClientExtensionCredential(request: ClientExtensionCredentialUpdate): Promise<ClientExtensionStoreSnapshot>;
      checkClientExtensionCredential(request: { id: string; sourceId: string }): Promise<ClientExtensionCredentialCheck>;
      applyClientExtensionLifecycle(request: ClientExtensionLifecycleRequest): Promise<ClientExtensionLifecycleOutcome>;
      revealClientExtensions(): Promise<{ opened: true; path: string }>;
      readClientExtensionFilesystemSource(request: PhobosClientExtensionFilesystemReadRequest): Promise<PhobosClientExtensionFilesystemSource>;
      runClientExtensionAction(request: ClientExtensionActionRequest): Promise<ClientExtensionActionOutcome>;
      readCodexUsage(request: PhobosCodexUsageReadRequest): Promise<PhobosCodexUsageSnapshot>;
      refreshProviderModels(request: PhobosProviderModelsRefreshRequest): Promise<PhobosProviderModelsRefreshResponse>;
      requestComposerPrediction(request: { runId: string }): Promise<{ id: string; text: string | null; runId: string } | null>;
      requestTaskTitle(request: { runId: string }): Promise<{ title: string; runId: string } | null>;
      submitChatTurn(request: PhobosChatTurnRequest): Promise<PhobosChatTurnResponse>;
      readOperatorChatArtifacts(request: PhobosOperatorChatArtifactsRequest): Promise<PhobosOperatorChatArtifactsResponse>;
      submitOperatorTurnControl(request: PhobosOperatorTurnControlRequest): Promise<PhobosOperatorTurnControlResponse>;
      submitChatSteer(request: PhobosChatSteerRequest): Promise<PhobosChatSteerResponse>;
      updateChatPins(request: PhobosChatPinsRequest): Promise<PhobosChatPinsResponse>;
      transcribeDictation(request: PhobosDictationRequest): Promise<PhobosDictationResponse>;
      startDictationStream(request: { attemptId: string; sampleRateHz: number }): Promise<PhobosDictationLocalResult<null>>;
      appendDictationAudio(attemptId: string, bytes: ArrayBuffer): void;
      finishDictationStream(attemptId: string): Promise<PhobosDictationResponse>;
      onDictationStreamEvent(listener: (event: PhobosDictationStreamEvent) => void): () => void;
      cancelDictation(attemptId: string): Promise<void>;
      readDictationRecordings(): Promise<PhobosDictationLocalResult<PhobosDictationRecordingState>>;
      configureDictationRecordings(enabled: boolean): Promise<PhobosDictationLocalResult<PhobosDictationRecordingState>>;
      saveDictationRecording(request: PhobosDictationRequest): Promise<PhobosDictationLocalResult<PhobosDictationRecording | null>>;
      readDictationRecording(id: string): Promise<PhobosDictationLocalResult<{ entry: PhobosDictationRecording; bytes: Uint8Array }>>;
      updateDictationRecording(request: { id: string; text: string; status: "transcribed" | "failed" }): Promise<PhobosDictationLocalResult<PhobosDictationRecording>>;
      deleteDictationRecording(id: string | null): Promise<PhobosDictationLocalResult<null>>;
      submitInterfaceArtifact(request: PhobosInterfaceArtifactRequest): Promise<PhobosInterfaceArtifactResponse>;
      beginInterfaceArtifactStream(request: PhobosArtifactStreamBeginRequest): Promise<PhobosArtifactStreamHandle>;
      appendInterfaceArtifactStream(request: PhobosArtifactStreamAppendRequest): Promise<PhobosArtifactStreamProgress>;
      finalizeInterfaceArtifactStream(request: PhobosArtifactStreamFinalizeRequest): Promise<PhobosArtifactStreamOutcome>;
      abortInterfaceArtifactStream(request: PhobosArtifactStreamAbortRequest): Promise<PhobosArtifactStreamAbortOutcome>;
      onProjectionChanged(listener: (change: PhobosProjectionChange) => void): () => void;
      onRuntimeHostState(listener: (state: PhobosRuntimeHostState) => void): () => void;
      onTerminalData(listener: (event: PhobosTerminalData) => void): () => void;
      onTerminalExit(listener: (event: PhobosTerminalExit) => void): () => void;
      onCdpViewerEvent(listener: (event: PhobosCdpViewerEvent) => void): () => void;
      onNativeBrowserViewerEvent(listener: (event: PhobosNativeBrowserViewerEvent) => void): () => void;
      onProcessViewerEvent(listener: (event: PhobosProcessViewerEvent) => void): () => void;
      onWindowStateChanged(listener: (state: PhobosWindowState) => void): () => void;
      onNavigateBack(listener: () => void): () => void;
      onNavigateForward(listener: () => void): () => void;
      onGlobalDictationRequested(listener: () => void): () => void;
      onNativeClientCommand(listener: (command: string) => void): () => void;
      onClientAccessLocked(listener: (status: PhobosClientAccessStatus) => void): () => void;
      onClientPaneTransferCompleted(listener: (completion: ClientPaneTransferCompleted) => void): () => void;
      onOpenRunRequested(listener: (runId: string) => void): () => void;
      onOpenWorkerEnvironmentRequested(listener: (target: PhobosWorkerEnvironmentWindowTarget) => void): () => void;
      onWorkerEnvironmentWindowTarget(listener: (target: PhobosWorkerEnvironmentWindowTarget) => void): () => void;
      onClientSurfaceDocumentsChanged(listener: (change: PhobosClientSurfaceDocumentChange) => void): () => void;
      onClientExtensionsChanged(listener: (change: PhobosClientExtensionChange) => void): () => void;
      onApplicationLifecycleProgress(listener: (progress: PhobosApplicationLifecycleProgress) => void): () => void;
      onApplicationConnectionProgress(listener: (progress: PhobosApplicationConnectionProgress) => void): () => void;
      onWorkspaceSetupProgress(listener: (progress: PhobosWorkspaceSetupProgress) => void): () => void;
      onClientSetupProgress(listener: (progress: PhobosClientSetupProgress) => void): () => void;
    };
  }
}

export type PhobosProjectionChange = {
  generation: number;
  kind: "ledger" | "runs" | "files" | "structure";
};

export type PhobosClientAttachmentSelectionRequest = {
  mode: "directory" | "files" | "files_and_folders";
};

export type PhobosClientDirectorySelection = {
  canceled: boolean;
  path: string;
  paths: string[];
};

export type PhobosClientPathSelectionRequest = {
  mode: "file" | "directory";
  allowMultiple?: boolean;
  title?: string;
  buttonLabel?: string;
};

export type PhobosClientExtensionChange = {
  generation: number;
};

export type PhobosClientExtensionFilesystemReadRequest = {
  path: string;
  read: "text" | "json" | "directory";
};

export type PhobosClientExtensionDirectoryEntry = {
  kind: "file" | "directory";
  name: string;
  path: string;
  size?: number;
  modifiedAt: string;
};

export type PhobosClientExtensionFilesystemSource =
  | {
      kind: "directory";
      path: string;
      name: string;
      modifiedAt: string;
      entries: PhobosClientExtensionDirectoryEntry[];
      truncated: boolean;
      files: number;
      directories: number;
    }
  | {
      kind: "text";
      path: string;
      name: string;
      size: number;
      modifiedAt: string;
      digest: string;
      text: string;
    }
  | {
      kind: "json";
      path: string;
      name: string;
      size: number;
      modifiedAt: string;
      digest: string;
      value: unknown;
    };

export type PhobosCodexUsageWindowDays = 7 | 30 | 90;

export type PhobosCodexUsageReadRequest = {
  windowDays: PhobosCodexUsageWindowDays;
  timeZone: string;
};

export type PhobosCodexUsageBucket = {
  day: string;
  model: string;
  uncachedInputTokens: number;
  cachedInputTokens: number;
  cacheCreationTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number;
  cacheSavingsUsd: number;
  priced: boolean;
  records: number;
  sessions: number;
};

export type PhobosCodexUsageSnapshot = {
  schema: "phobos.client_usage";
  schemaVersion: 1;
  provider: "codex";
  readAt: string;
  timeZone: string;
  sinceDay: string;
  untilDay: string;
  buckets: PhobosCodexUsageBucket[];
  source: {
    kind: "codex_session_transcripts";
    resolvedHomePath: string;
    path: string;
    status: "ok" | "missing" | "partial" | "failed";
    scannedFiles: number;
    cachedFiles: number;
    skippedFiles: number;
    failedFiles: number;
    inaccessibleDirectories: number;
    distinctSessions: number;
    malformedRecords: number;
    unmodeledRecords: number;
    message: string | null;
  };
  pricing: {
    status: "fresh" | "cached" | "unavailable";
    source: string;
    fetchedAt: string | null;
    knownModels: number;
  };
  scanDurationMs: number;
};

export type PhobosClientAttachmentSelection = {
  canceled: boolean;
  attachments: PhobosClientAttachmentStageHandle[];
};

export type PhobosClientAttachmentStageBeginRequest = {
  name: string;
  label: string;
  type: string;
  size: number;
  lastModified: number;
};

export type PhobosClientAttachmentStageHandle = PhobosClientAttachmentStageBeginRequest & {
  id: string;
  contentHash?: string;
};

export type PhobosClientAttachmentStageAppendRequest = {
  id: string;
  bytes: ArrayBuffer;
};

export type PhobosClientAttachmentStageProgress = {
  id: string;
  bytes: number;
};

export type PhobosClientAttachmentStageFinalizeRequest = {
  id: string;
};

export type PhobosClientAttachmentStageAbortRequest = {
  id: string;
};

export type PhobosClientAttachmentStageAbortOutcome = {
  id: string;
  aborted: true;
};

export type PhobosClientFileRequest = {
  bytes: ArrayBuffer | Uint8Array;
  filename: string;
};

export type PhobosClientFileOpenRequest = PhobosClientFileRequest & {
  action: "open" | "reveal";
};

export type PhobosClientFileOpenWithRequest = PhobosClientFileRequest & {
  applicationId: string;
};

export type PhobosClientFileOpenTarget = {
  icon: string | null;
  id: string;
  label: string;
};

export type PhobosClientFileOpenTargets = {
  applications: PhobosClientFileOpenTarget[];
  downloadsFolderIcon: string | null;
  fileManagerIcon: string | null;
  preferredApplicationId: string | null;
};

export type PhobosClientFileSaveOutcome = {
  saved: boolean;
  path?: string;
  filename?: string;
};

export type PhobosClientFileOpenOutcome = {
  opened: true;
  path: string;
};

export type PhobosWorkerEnvironmentPanelKind =
  | "browser"
  | "connection"
  | "container"
  | "runtime"
  | "worktree"
  | "files"
  | "terminal"
  | "changes"
  | "desktop"
  | "custom"
  | "overview";

export type PhobosWorkerEnvironmentWindowTarget = {
  runId: string;
  workerEnvironmentId: string;
  panelKind: PhobosWorkerEnvironmentPanelKind;
  surfaceId?: string;
  filePath?: string;
  clientSurface?: {
    documentId: string;
    revision: number;
    sourceDigest: string;
  };
};

export type PhobosWorkerEnvironmentWindowOutcome = PhobosWorkerEnvironmentWindowTarget & {
  opened: true;
};

export type PhobosClientLogRequest = {
  level: "info" | "warning" | "error";
  event: string;
  message: string;
};

export type PhobosGlobalDictationShortcutRequest = {
  enabled: boolean;
  shortcut: string;
};

export type PhobosGlobalDictationShortcutState = {
  enabled: boolean;
  shortcut: string;
  registered: boolean;
};

export type PhobosLoginItemSettings = {
  supported: boolean;
  enabled: boolean;
};

export type PhobosCdpViewerOpenRequest = {
  attachmentId: string;
  visible: boolean;
  workerEnvironmentId: string;
  surfaceId: string;
};

export type PhobosNativeBrowserViewerIdentity = {
  attachmentId: string;
  hostGeneration: string;
  mountGeneration: number;
};

export type PhobosNativeBrowserViewerPrepareRequest = {
  attachmentId: string;
  workerEnvironmentId: string;
  surfaceId: string;
  frameToken: string;
};

export type PhobosNativeBrowserViewerPrepared = {
  adoptionToken: string | null;
  hostGeneration: string;
  mountGeneration: number;
  state: PhobosNativeBrowserViewerState;
};

export type PhobosNativeBrowserViewerSyncRequest = PhobosNativeBrowserViewerIdentity & {
  viewportSequence: number;
  metricsRevision: number;
  stageBounds: { x: number; y: number; width: number; height: number };
  pageBounds: { x: number; y: number; width: number; height: number };
  visualBounds: { x: number; y: number; width: number; height: number };
  scale: number;
  visible: boolean;
};

export type PhobosNativeBrowserViewerActionRequest = PhobosNativeBrowserViewerIdentity & (
  | { action: "reload" | "back" | "forward" | "stop" | "focus" }
  | { action: "navigate"; params: { url: string } }
  | { action: "zoom"; params: { zoomFactor: number } }
  | { action: "find"; params: { query: string; backwards: boolean; matchCase: boolean } }
);

export type PhobosSavedBrowserPermissions = {
  home: string;
  hostGeneration: string;
  removed?: boolean;
  entries: Array<{ id: string; decision: "accept" | "decline"; subject:
    { type: "upload"; origin: string } | { type: "history"; source: { id: string; content: number[] }; source_payload_digest: string } }>;
};
export type PhobosSavedApplicationPermissionRequest = { operation: "list" } | { operation: "remove"; sourceId: string; bundleId: string };
export type PhobosSavedApplicationPermissions = {
  sourceId: string; removed: boolean;
  applications: Array<{ bundle_id: string; display_name: string }>;
};

export type PhobosBrowserDownloadRequest = {
  workerEnvironmentId: string;
  surfaceId: string;
  hostGeneration: string;
  action: "snapshot" | "search" | "clear-history" | "acknowledge" | "open-folder" | "open" | "show-in-folder" | "copy-address" | "copy-path" | "pause" | "resume" | "cancel" | "remove" | "choose-directory" | "reset-directory" | "set-prompt";
  promptForLocation?: boolean;
  id?: string;
  query?: { text: string; offset: number };
};
export type PhobosBrowserDownload = {
  id: string;
  targetId: string;
  filename: string;
  url: string;
  status: "started" | "in_progress" | "paused" | "complete" | "failed" | "canceled" | "unavailable";
  receivedBytes: number;
  totalBytes: number;
  startedAtMs: number;
  updatedAtMs: number;
  fileExists: boolean;
  canCancel: boolean;
  canPause: boolean;
  canResume: boolean;
  userInitiated: boolean;
  artifactPending?: boolean;
  artifactError?: string | null;
  sequence: number;
};
export type PhobosBrowserDownloadHistory = { text: string; offset: number; hasMore: boolean; downloads: PhobosBrowserDownload[] };
export type PhobosBrowserDownloadSnapshot = {
  history?: PhobosBrowserDownloadHistory;
  preferences: { directory: string | null; promptForLocation: boolean };
  sequence: number;
  downloads: PhobosBrowserDownload[];
  unacknowledgedIds: string[];
  error: string | null;
};

export type PhobosNativeBrowserViewerState = PhobosNativeBrowserViewerIdentity & {
  surfaceId: string;
  protocol: "browser.native.v1";
  presentationProtocol: "electron.ownedGuest.v1" | "electron.webContentsView.v1";
  engine: {
    mode: "standard" | "owned";
    presentationProtocol: PhobosNativeBrowserViewerState["presentationProtocol"];
    capabilities: {
      nativeView: boolean;
      ownedGuestEmbedding: boolean;
      scaledPresentation: boolean;
      modelViewport: boolean;
      hiddenPageCapture: boolean;
      navigationHistory: boolean;
      nativeNavigationHistory: boolean;
      persistentDownloadHistory: boolean;
      cursorOverlay: boolean;
    };
    limits: string[];
  };
  presentationPhase: "prepared" | "attached" | "ready";
  viewportSequence: number;
  modelViewport: { revision: number; emulatedSize: null | { width: number; height: number } };
  modelActive: boolean;
  modelTurnKey: string;
  cursor: null | { moveSequence: number; x: number; y: number; metricsRevision: number; sourceMovementSeq: number };
  engineHandle: string;
  targetId: string;
  browserContextId: string;
  workerEnvironmentId: string;
  run: string;
  ee: string;
  connected: boolean;
  visible: boolean;
  readOnly: boolean;
  loading: boolean;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  zoomFactor: number;
  findFound?: boolean;
  findMatches?: number;
  findActiveOrdinal?: number;
};

export type PhobosNativeBrowserViewerEvent = PhobosNativeBrowserViewerIdentity & (
  | { type: "state"; state: PhobosNativeBrowserViewerState }
  | { type: "command"; command: "focus-address" | "find" }
  | { type: "closed" | "error"; error: { code: string; message: string } }
);

export type PhobosCdpViewerState = {
  runId: string;
  targetId: string;
  visible: boolean;
  readOnly: boolean;
  manualControl: boolean;
  manualControllerPresent: boolean;
  navigationError: string;
  sessionId: string;
  workerEnvironmentId: string;
  surfaceId: string;
  connected: boolean;
  loading: boolean;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  zoom: number;
};

export type PhobosCdpViewerMouseAction = {
  sessionId: string;
  action: "mouse";
  eventType: "mousePressed" | "mouseReleased" | "mouseMoved" | "mouseWheel";
  x: number;
  y: number;
  button?: "none" | "left" | "middle" | "right" | "back" | "forward";
  buttons?: number;
  clickCount?: number;
  deltaX?: number;
  deltaY?: number;
  modifiers?: number;
};

export type PhobosCdpViewerKeyAction = {
  sessionId: string;
  action: "key";
  eventType: "keyDown" | "keyUp" | "rawKeyDown" | "char";
  key?: string;
  code?: string;
  text?: string;
  unmodifiedText?: string;
  windowsVirtualKeyCode?: number;
  nativeVirtualKeyCode?: number;
  modifiers?: number;
  autoRepeat?: boolean;
};

export type PhobosCdpViewerActionRequest =
  | { sessionId: string; action: "setVisible"; visible: boolean }
  | { sessionId: string; action: "claimControl" | "releaseControl" | "stop" }
  | { sessionId: string; action: "navigate"; url: string }
  | { sessionId: string; action: "reload" }
  | { sessionId: string; action: "find"; query: string; backwards?: boolean; matchCase?: boolean }
  | { sessionId: string; action: "zoom"; factor: number }
  | { sessionId: string; action: "back" | "forward" | "refreshState" }
  | PhobosCdpViewerMouseAction
  | PhobosCdpViewerKeyAction;

export type PhobosCdpViewerActionAccepted = {
  sessionId: string;
  accepted: true;
  found?: boolean;
};

export type PhobosCdpViewerCloseRequest = {
  sessionId: string;
};

export type PhobosCdpViewerCloseOutcome = {
  sessionId: string;
  closed: true;
};

export type PhobosCdpViewerFrameMetadata = {
  deviceWidth: number;
  deviceHeight: number;
  pageScaleFactor: number;
  offsetTop: number;
  scrollOffsetX: number;
  scrollOffsetY: number;
  timestamp: number;
};

export type PhobosCdpViewerEvent =
  | { sessionId: string; type: "state"; state: PhobosCdpViewerState }
  | { sessionId: string; type: "error"; error: string }
  | { sessionId: string; type: "frame"; data: string; mimeType: "image/jpeg"; metadata: PhobosCdpViewerFrameMetadata };

export type PhobosProcessViewerOpenRequest = {
  workerEnvironmentId: string;
  surfaceId: string;
};

export type PhobosProcessViewerState = {
  workerEnvironmentId: string;
  generation: number;
  processId: string;
  status: string;
  tty: boolean;
  exitCode: number | null;
  closed: boolean;
  failure: string;
  restartAvailable: boolean;
  startNewShellAvailable: boolean;
  launchLabel: string;
};

export type PhobosProcessViewerSnapshot = {
  sessionId: string;
  state: PhobosProcessViewerState;
};

export type PhobosProcessViewerActionRequest =
  | { sessionId: string; action: "write"; data: string }
  | { sessionId: string; action: "resize"; cols: number; rows: number }
  | { sessionId: string; action: "interrupt" | "terminate" | "restart" | "start_new_shell" };

export type PhobosProcessViewerActionOutcome = {
  state: PhobosProcessViewerState;
};

export type PhobosProcessViewerCloseRequest = {
  sessionId: string;
};

export type PhobosProcessViewerEvent = {
  sessionId: string;
  event:
    | { type: "output"; data: string; seq: number }
    | { type: "history_truncated"; retainedFromSeq: number | null }
    | { type: "reset" }
    | { type: "state"; state: PhobosProcessViewerState }
    | { type: "failure"; message: string };
};

export type PhobosWorkerEnvironmentFilesRequest = {
  workerEnvironmentId: string;
  surfaceId: string;
  path: string;
};

export type PhobosWorkerEnvironmentFileEntry = {
  name: string;
  path: string;
  kind: "directory" | "file" | "symlink" | "other";
  size: number | null;
  modifiedAt: string;
};

export type PhobosWorkerEnvironmentDirectory = {
  workerEnvironmentId: string;
  surfaceId: string;
  path: string;
  entries: PhobosWorkerEnvironmentFileEntry[];
};

export type PhobosWorkerEnvironmentFile = {
  workerEnvironmentId: string;
  surfaceId: string;
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
  kind: "text" | "binary";
  text: string;
  truncated: boolean;
  digest: string;
};

export type PhobosWorkerEnvironmentFileWriteRequest = PhobosWorkerEnvironmentFilesRequest & {
  text: string;
  expectedDigest: string;
  expectedModifiedAt: string;
  expectedSize: number;
};

export type PhobosWorkerEnvironmentFileWriteOutcome = PhobosWorkerEnvironmentFile & {
  outsidePhobosEvidence: true;
};

export type PhobosWorkerEnvironmentFilePreview = {
  workerEnvironmentId: string;
  surfaceId: string;
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
  mimeType: "application/pdf" | "image/avif" | "image/bmp" | "image/gif" | "image/jpeg" | "image/png" | "image/webp";
  bytes: ArrayBuffer;
};

export type PhobosWorkerEnvironmentFileAttachment = {
  workerEnvironmentId: string;
  surfaceId: string;
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
  mimeType: string;
  bytes: ArrayBuffer;
};

export type PhobosWorkerEnvironmentFileSystemAction = "resolve" | "reveal" | "open";

export type PhobosWorkerEnvironmentFileSystemActionRequest = PhobosWorkerEnvironmentFilesRequest & {
  action: PhobosWorkerEnvironmentFileSystemAction;
};

export type PhobosWorkerEnvironmentFileSystemActionOutcome = {
  workerEnvironmentId: string;
  surfaceId: string;
  path: string;
  absolutePath: string;
  kind: "directory" | "file";
  action: PhobosWorkerEnvironmentFileSystemAction;
};

export type PhobosOsFileRoot = {
  id: string;
  label: string;
  path: string;
};

export type PhobosOsFileRoots = {
  roots: PhobosOsFileRoot[];
};

export type PhobosOsFilesRequest = {
  rootId: string;
  path?: string;
};

export type PhobosOsFileEntry = {
  name: string;
  path: string;
  kind: "directory" | "file" | "symlink" | "other";
  size: number | null;
  modifiedAt: string;
};

export type PhobosOsDirectory = {
  rootId: string;
  path: string;
  entries: PhobosOsFileEntry[];
};

export type PhobosOsFile = {
  rootId: string;
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
  kind: "text" | "binary";
  text: string;
  truncated: boolean;
  digest: string;
};

export type PhobosOsFileWriteRequest = PhobosOsFilesRequest & {
  text: string;
  expectedDigest: string;
  expectedModifiedAt: string;
  expectedSize: number;
};

export type PhobosOsFileWriteOutcome = PhobosOsFile & {
  outsidePhobosEvidence: true;
};

export type PhobosOsFileSystemAction = "resolve" | "reveal" | "open";

export type PhobosOsFileSystemActionRequest = PhobosOsFilesRequest & {
  action: PhobosOsFileSystemAction;
};

export type PhobosOsFileSystemActionOutcome = {
  rootId: string;
  path: string;
  absolutePath: string;
  kind: "directory" | "file";
  action: PhobosOsFileSystemAction;
};

export type PhobosWorkerEnvironmentOperatorAction = "apply" | "revert" | "stage" | "unstage";

export type PhobosWorkerEnvironmentGitRequest = {
  workerEnvironmentId: string;
  surfaceId: string;
  runId: string;
};

export type PhobosWorkerEnvironmentGitSnapshot = {
  workerEnvironmentId: string;
  surfaceId: string;
  runId: string;
  projectionRevision: string;
  revision: string;
  branch: string;
  base: string;
  branchDiffs: Array<PhobosWorkerEnvironmentGitDiff>;
  branchError: string;
  omittedPaths: Array<{ path: string; reason: "nested-worktree" }>;
  stagedFiles: string[];
  unstagedFiles: string[];
  diffs: Array<PhobosWorkerEnvironmentGitDiff>;
};

export type PhobosWorkerEnvironmentGitDiff = {
  path: string;
  previous_path: string;
  before: string;
  after: string;
  binary: boolean;
  preview_omitted: boolean;
  stage: "branch" | "staged" | "unstaged";
  staged: boolean;
  unstaged: boolean;
  status: "added" | "deleted" | "modified" | "renamed";
};

export type PhobosWorkerEnvironmentOperatorActionRequest = {
  workerEnvironmentId: string;
  surfaceId: string;
  runId: string;
  projectionRevision: string;
  action: PhobosWorkerEnvironmentOperatorAction;
  paths: string[];
};

export type PhobosWorkerEnvironmentOperatorActionOutcome = {
  workerEnvironmentId: string;
  runId: string;
  surfaceId: string;
  projectionRevision: string;
  action: PhobosWorkerEnvironmentOperatorAction;
  paths: string[];
  outsidePhobosEvidence: true;
};

export type PhobosClientSurfaceDocumentSource = {
  path: string;
  digest: string;
  bytes: number;
  modifiedAt: string;
  text: string;
};

export type PhobosClientSurfaceDocumentSnapshot = {
  generation: number;
  root: string;
  documents: PhobosClientSurfaceDocumentSource[];
  errors: string[];
};

export type PhobosClientSurfaceDocumentChange = {
  generation: number;
};

export type PhobosInterfaceArtifactRequest = {
  interfaceId: string;
  runId?: string;
  label: string;
  payload: Record<string, unknown>;
  timeoutMs?: number;
};

export type PhobosDictationRequest = {
  attemptId: string;
  bytes: ArrayBuffer;
  durationMs: number;
  mediaType: "audio/wav";
  provider: "codex";
  sampleRateHz: 24000;
  timeoutMs?: number;
};

export type PhobosDictationResponse = PhobosDictationLocalResult<{
  provider: "codex";
  text: string;
  model: string;
}>;

export type PhobosDictationStreamEvent = { attemptId: string } & (
  { type: "transcript"; text: string } | { type: "stop-requested" } | { type: "error"; error: { code: string; message: string } }
);

export type PhobosDictationLocalResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };

export type PhobosDictationRecording = {
  version: 1;
  id: string;
  createdAtMs: number;
  durationMs: number;
  byteLength: number;
  status: "recorded" | "transcribed" | "failed";
  text: string;
};

export type PhobosDictationRecordingState = {
  version: 1;
  enabled: boolean;
  recordings: PhobosDictationRecording[];
  maxRecordings: number;
};

export type PhobosInterfaceArtifactResponse = {
  interfaceId: string;
  runId?: string;
  label: string;
  contentHash: string;
  verdict: unknown;
};

export type PhobosArtifactStreamBeginRequest = {
  interfaceId: string;
  runId?: string;
  label: string;
  mediaType: string;
  extension: string;
  payload?: Record<string, unknown>;
};

export type PhobosArtifactStreamHandle = {
  streamId: string;
  interfaceId: string;
  runId?: string;
  label: string;
  mediaType: string;
};

export type PhobosArtifactStreamAppendRequest = {
  streamId: string;
  bytes: Uint8Array;
};

export type PhobosArtifactStreamProgress = {
  streamId: string;
  bytes: number;
};

export type PhobosArtifactStreamFinalizeRequest = {
  streamId: string;
  timeoutMs?: number;
};

export type PhobosArtifactStreamOutcome = PhobosInterfaceArtifactResponse & {
  mediaType: string;
  mediaContentHash: string;
  mediaBytes: number;
};

export type PhobosArtifactStreamAbortRequest = {
  streamId: string;
};

export type PhobosArtifactStreamAbortOutcome = {
  streamId: string;
  aborted: true;
};

export type PhobosWindowState = {
  customWindowControls: boolean;
  nativeControlInset: number;
  fullScreen: boolean;
  maximized: boolean;
  opaqueSurface: boolean;
  resizing: boolean;
};

export type PhobosHistoryNavigationState = {
  canNavigateBack: boolean;
  canNavigateForward: boolean;
};

export type PhobosWindowAppearance = {
  theme: "light" | "dark";
  preference: "system" | "light" | "dark";
  translucent: boolean;
};

export type PhobosAppInfo = {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  isPackaged: boolean;
};

export type PhobosClientDoctorFinding = {
  code: string;
  subject: string;
  reason: string;
  next_step: string;
  evidence: Record<string, unknown>;
};

export type PhobosClientDoctorReport = {
  schema_version: 2;
  checks: number;
  passed: number;
  findings: PhobosClientDoctorFinding[];
  errors: string[];
};

export type PhobosClientAccessProfile = "live" | "lab";

export type PhobosClientAccessStatus = {
  configured: boolean;
  labAvailable: boolean;
  authenticated: boolean;
  profile: PhobosClientAccessProfile | null;
  expiresAt: string | null;
};

export type PhobosTouchIdStatus = {
  available: boolean;
  enrolled: boolean;
  prompted: boolean;
};

export type PhobosClientLabAccess = {
  source: "default" | "environment" | "administrator";
  minimumLength: number;
};

export type PhobosClientAccessDetails = {
  profile: PhobosClientAccessProfile;
  minimumLength: number;
  administrator: {
    configured: boolean;
    source: "environment" | "credential";
    createdAt: string | null;
    updatedAt: string | null;
  };
  test: {
    available: boolean;
    source: "default" | "environment" | "administrator" | null;
  };
};

export type PhobosAdministratorAccessUpdate = {
  currentPassword: string;
  password: string;
};

export type PhobosMicrophoneAccess = {
  granted: boolean;
  status: string;
};

export type PhobosCameraAccess = {
  granted: boolean;
  status: string;
};

export type PhobosGestureTraceSaved = {
  path: string;
  filename: string;
  bytes: number;
};

export type PhobosTransportDefaults = {
  endpoint: string;
  repoRoot?: string | null;
  phobosHome?: string | null;
  registryRoot?: string | null;
  stateRoot?: string | null;
  ledgerPath?: string | null;
};

export type PhobosRuntimeStatusRequest = {
  endpoint?: string;
};

export type PhobosRuntimeStatus = {
  up: boolean;
  endpoint: string;
  error?: string;
  phase?: string;
  ownership?: "none" | "external" | "managed";
  pid?: number | null;
  home?: string;
  sourceRegistry?: string;
  runtimeBinary?: string;
  hostError?: string | null;
};

export type PhobosHomeStorageHealth = {
  status: "writable" | "blocked" | "unavailable";
  availableBytes: number | null;
  minimumBytes: number;
  code: string | null;
  message: string | null;
};

export type PhobosInterfaceFailure = { interfaceId: string; message: string };

export type PhobosRuntimeHostState = {
  phase: string;
  ready: boolean;
  ownership: "none" | "external";
  pid: number | null;
  home: string;
  sourceRegistry: string;
  runtimeBinary: string;
  repoRoot: string;
  launchCwd: string;
  launchCommand: string;
  launchEnv: Record<string, string>;
  endpoint: string;
  error: string | null;
  storageHealth: PhobosHomeStorageHealth | null;
  interfaceFailures: PhobosInterfaceFailure[];
  updatedAtMs: number;
};

export type PhobosTerminalResizeRequest = {
  cols?: number;
  rows?: number;
};

export type PhobosTerminalOpenRequest = PhobosTerminalResizeRequest & {
  terminalId: string;
  cwd?: string;
  env?: Record<string, string>;
  preparedCommand?: string;
};

export type PhobosTerminalSnapshot = {
  terminalId: string;
  sessionId: string;
  command: string;
  cwd: string;
  transcript: string;
  running: boolean;
  pid: number | null;
  exitCode: number | null;
  signal: number | null;
  error: string | null;
};

export type PhobosTerminalData = {
  terminalId: string;
  sessionId: string;
  data: string;
};

export type PhobosTerminalExit = {
  terminalId: string;
  sessionId: string;
  exitCode: number | null;
  signal: number | null;
  error: string | null;
};

export type PhobosRuntimeEndpointValidationRequest = {
  endpoint: string;
};

export type PhobosRuntimeEndpointValidation = {
  valid: boolean;
  endpoint: string;
  error?: string;
};

export type PhobosChatgptAccount = {
  signedIn: boolean;
  authType: "chatgpt" | "apiKey" | "amazonBedrock" | "gcp" | null;
  email: string | null;
  planType: string | null;
  workspaceName: string | null;
  credentialHome: string;
  phobosHome: string | null;
};

export type PhobosChatgptWorkspace = {
  accountId: string;
  name: string | null;
  kind: "personal" | "workspace" | null;
};

export type PhobosChatgptAccountSession = {
  sessionId: string;
  email: string | null;
  displayName: string | null;
  active: boolean;
  selectedWorkspaceId: string | null;
  workspaces: PhobosChatgptWorkspace[];
};

export type PhobosChatgptAccountSessions = {
  activeSessionId: string | null;
  sessions: PhobosChatgptAccountSession[];
  credentialHome: string;
  phobosHome: string | null;
};

export type PhobosChatgptWorkspaceSwitch =
  | { state: "switched"; account: PhobosChatgptAccount; sessions: PhobosChatgptAccountSessions }
  | { state: "browser"; loginId: string; authUrl: string };

export type PhobosChatgptLimit = {
  limitId: string | null;
  limitName: string | null;
  primary: PhobosProviderRateLimitWindow | null;
  secondary: PhobosProviderRateLimitWindow | null;
  credits: { hasCredits: boolean; unlimited: boolean; balance: string | null } | null;
  individualLimit: { limit: string; used: string; remainingPercent: number; resetsAt: number } | null;
  planType: string | null;
  rateLimitReachedType: string | null;
  spendControlReached: boolean | null;
};

export type PhobosChatgptUsage = {
  rateLimits: PhobosChatgptLimit;
  rateLimitsByLimitId: Record<string, PhobosChatgptLimit> | null;
  observedAtMs: number;
};

export type PhobosProviderInterface = {
  id: string;
  label: string;
  descriptorPath: string;
  runtimeHandlerRef?: string;
  sourceNames: string[];
  model?: string;
  reasoningEffort?: string;
  serviceTier?: string;
  supportedReasoningEfforts: string[];
  models: PhobosProviderModel[];
  modelCatalogError?: string;
  preferred?: boolean;
  rateLimits?: PhobosProviderRateLimits;
};

export type PhobosProviderModel = {
  model: string;
  displayName: string;
  description: string;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: string[];
  showInPicker: boolean;
  isDefault: boolean;
  serviceTiers?: PhobosModelServiceTier[];
  defaultServiceTier?: string | null;
};

export type PhobosModelServiceTier = {
  id: string;
  name: string;
  description: string;
};

export type PhobosProviderModelsRefreshRequest = {
  providerInterfaceId: string;
};

export type PhobosProviderModelsRefreshResponse = {
  providerInterfaceId: string;
  models: PhobosProviderModel[];
  observedAtUnixMs: number;
};

export type PhobosProviderRateLimitWindow = {
  usedPercent: number;
  windowDurationMins: number | null;
  resetsAt: number | null;
};

export type PhobosProviderRateLimits = {
  observedAtMs: number;
  movementSeq: number;
  runId: string;
  limitId: string;
  limitName: string;
  primary: PhobosProviderRateLimitWindow | null;
  secondary: PhobosProviderRateLimitWindow | null;
  credits: {
    hasCredits: boolean;
    unlimited: boolean;
    balance: string | null;
  } | null;
  individualLimit: {
    limit: string;
    used: string;
    remainingPercent: number;
    resetsAt: number;
  } | null;
  planType: string;
  reachedType: string;
};

export type PhobosProviderInterfacesResponse = {
  repoRoot?: string | null;
  registryRoot?: string | null;
  providers: PhobosProviderInterface[];
  error?: string;
};

export type PhobosProjectionReadRequest = PhobosClientProjectionReadRequest;

export type PhobosRuntimeTopologyProjection = {
  generation: number;
  snapshotRaw: unknown;
  eeRaw: unknown;
  runsRaw: unknown;
  runCheckpointsRaw: unknown;
  interfacesRaw: unknown;
  bindingsRaw: unknown;
  artifactsRaw: unknown;
  marksRaw: unknown;
  workerEnvironmentsRaw: unknown;
  movementsRaw: unknown;
  runDetailsRaw: Record<string, { detail: unknown; trace: unknown }>;
};

export type PhobosScheduledDraft = {
  type: "interval" | "cron" | "once" | "inactivity";
  inactivity?: {
    seconds: number;
    interface_match: Record<string, string>;
    exclude_interface_match?: Record<string, string>;
    within_ee?: string;
    exact_ee?: string;
    run_ids?: string[];
    artifact_names?: string[];
    direction?: "arrival" | "outbound";
  };
  dueAt?: string;
  intervalSeconds?: number;
  cron?: string;
  timezone: string;
  fireOnStart: boolean;
  instructions: string;
};

export type PhobosScheduledMutationRequest =
  | {
      action: "create";
      sourceInterfaceId: string;
      sourceActivationDigest: string;
      interfaceId: string;
      draft: PhobosScheduledDraft;
    }
  | {
      action: "update";
      interfaceId: string;
      expectedDigest: string;
      draft: PhobosScheduledDraft;
    }
  | {
      action: "set_enabled";
      interfaceId: string;
      expectedDigest: string;
      enabled: boolean;
    }
  | {
      action: "delete";
      interfaceId: string;
      expectedDigest: string;
    }
  | {
      action: "undo_changes";
      runId: string;
      firing: string;
      expectedJournalDigest: string;
    };

export type PhobosScheduledMutationOutcome = {
  action: PhobosScheduledMutationRequest["action"];
  interfaceId?: string;
  runId?: string;
  activationDigest?: string;
  deleted?: boolean;
  restored?: string[];
};

export type PhobosApplicationPrivateConfigurationMutation = {
  applicationId: string;
  interfaceId: string;
  expectedDigest: string | null;
  updates: Record<string, string>;
  clears: string[];
};

export type PhobosApplicationConnectionState = {
  state: "connected" | "not_connected" | "expired" | "error";
  account?: { label: string; detail?: string };
  manage?: { label: string; url: string };
  message?: string;
};

export type PhobosApplicationConnectionProbe = {
  applicationId: string;
  interfaces: Array<{ interfaceId: string; state: PhobosApplicationConnectionState }>;
};

export type PhobosApplicationConnectionRequest = {
  operationId: string;
  applicationId: string;
  interfaceId: string;
  input: Record<string, string>;
};

export type PhobosApplicationConnectionProgress = {
  operationId: string;
  applicationId: string;
  interfaceId: string;
  message: string;
  url?: string;
  code?: string;
};

export type PhobosApplicationPrivateConfigurationOutcome = {
  interfaceId: string;
  documentStatus: "absent" | "valid";
  documentDigest: string | null;
  configuredFields: number;
};

export type PhobosOsWorkspaceMutationRequest =
  | {
      action: "initialize_workspace";
      agentPresets?: import("./onboarding/workspaceSetup").WorkspaceAgentPresetChoice[];
      operationId: string;
      root: {
        key: "root";
        templateName: "existence";
        name: string;
        goal: string;
      } | {
        key: "root";
        existingEeId: string;
        expectedEeDigest: string;
        name: string;
      };
      home: {
        name: "Home";
        providerInterfaceId: string;
        providerModel: string;
        workerInterfaceId: string;
        reasoningEffort?: string;
  serviceTier?: string;
        doorHostSlots: Record<string, Record<string, string>>;
        contextArtifactBindings: Array<{ id: string }>;
        selectedWorkerEnvironmentKinds: string[];
      };
      task: import("./onboarding/workspaceSetup").WorkspaceInitializeRequest["task"];
      projects: Array<{
        key: string;
        parentKey: "root" | string;
        templateName: "project";
        name: string;
        goal: string;
        presentation: { icon: string; color: string };
      }>;
    }
  | {
      action: "create_project";
      operationId: string;
      workspace: {
        rootEeId: string;
        homeRunId: string;
        homeInterfaceId: string;
        expectedHomeSidecarDigest: string;
      };
      parentEeId: string;
      expectedParentDigest: string;
      templateName: string;
      sourceFolders?: string[];
      name: string;
      goal: string;
      presentation: { icon: string; color: string };
    }
  | {
      action: "add_agent_preset";
      operationId: string;
      home: string;
      workspace: { rootEeId: string; homeRunId: string; homeInterfaceId: string; expectedHomeSidecarDigest: string; expectedAgentCatalogDigest: string };
      projectEeId: string;
      packId: string;
      expectedPackManifestDigest: string;
      presetId: string;
      providerInterfaceId: string;
      providerModel: string;
      reasoningEffort: string;
      serviceTier?: string;
    }
  | {
      action: "create_agent_template";
      operationId: string;
      workspace: {
        rootEeId: string;
        homeRunId: string;
        homeInterfaceId: string;
        expectedHomeSidecarDigest: string;
        expectedAgentCatalogDigest: string;
      };
      projectEeId: string;
      sourceWorkerInterfaceId: string;
      name: string;
      icon: string;
      providerInterfaceId: string;
      providerModel: string;
      reasoningEffort: string;
      serviceTier?: string;
      applicationIds: string[];
      driverNames: string[];
    }
  | {
      action: "configure_agent_template";
      agentId: string;
      projectEeId: string;
      workerInterfaceId: string;
      name: string;
      icon: string;
      providerInterfaceId: string;
      providerModel: string;
      reasoningEffort: string;
      serviceTier?: string;
      applicationIds: string[];
      driverNames: string[];
      expectedClientTemplateDigest: string;
      expectedAgentCatalogDigest: string;
    }
  | {
      action: "delete_agent_template";
      agentId: string;
      projectEeId: string;
      workerInterfaceId: string;
      expectedClientTemplateDigest: string;
      expectedAgentCatalogDigest: string;
    }
  | {
      action: "delete_project";
      operationId: string;
      workspace: {
        rootEeId: string;
        homeRunId: string;
        homeInterfaceId: string;
        expectedHomeSidecarDigest: string;
      };
      eeId: string;
      expectedProjectDigest: string;
    }
  | {
      action: "update_project_presentation";
      operationId: string;
      workspace: {
        rootEeId: string;
        homeRunId: string;
        homeInterfaceId: string;
        expectedHomeSidecarDigest: string;
      };
      projects: Array<{
        eeId: string;
        sourceFolders?: string[];
        expectedProjectDigest?: string;
        name?: string;
        icon: string;
        color: string;
      }>;
    }
  | {
      action: "delete_task";
      runId: string;
      expectedDigest: string;
    }
  | {
      action: "set_task_archived";
      home: string;
      workspace: { rootEeId: string; homeRunId: string; homeInterfaceId: string };
      runId: string;
      archived: boolean;
      expectedDigest: string;
    }
  | {
      action: "install_application";
      applicationId: string;
      expectedSourceDigest: string;
      operationId: string;
    }
  | {
      action: "remove_application";
      applicationId: string;
      expectedInstalledDigest: string;
      operationId: string;
    }
  | {
      action: "install_package";
      packageIds: string[];
      expectedSourceDigests: Record<string, string>;
      operationId: string;
    }
  | {
      action: "remove_package";
      packageIds: string[];
      expectedInstalledDigests: Record<string, string>;
      operationId: string;
    }
  | {
      action: "repair_package";
      packageIds: string[];
      expectedRepairs: Record<string, {
        sourceDigest: string;
        installedDigest: string;
        receiptState: "missing" | "stale";
        receiptDigest: string | null;
      }>;
      operationId: string;
    }
  | {
      action: "apply_application_pack";
      packId: string;
      selectedRecommended: string[];
      expectedSourceDigests: Record<string, string>;
      operationId: string;
    }
  | {
      action: "install_driver";
      driverName: string;
      expectedSourceDigest: string;
      operationId: string;
    }
  | {
      action: "remove_driver";
      driverName: string;
      expectedInstalledDigest: string;
      operationId: string;
    }
  | {
      action: "configure_application";
      applicationId: string;
      projects: Array<{
        eeId: string;
        available: boolean;
        selectedByDefault: boolean;
        expectedDigest: string;
      }>;
    }
  | {
      action: "configure_driver";
      driverName: string;
      projects: Array<{
        eeId: string;
        available: boolean;
        selectedByDefault: boolean;
        hostSlots: Record<string, string>;
        expectedDigest: string;
      }>;
    }
  | {
      action: "configure_task_application";
      runId: string;
      applicationId: string;
      connected: boolean;
      expectedDigest: string;
    };

export type PhobosOsWorkspaceMutationOutcome = {
  action: PhobosOsWorkspaceMutationRequest["action"];
  eeId?: string;
  parentEeId?: string;
  templateName?: string;
  goal?: string;
  runId?: string;
  targetEeId?: string;
  capabilityId?: string;
  available?: boolean;
  selectedByDefault?: boolean;
  connected?: boolean;
  archived?: boolean;
  installed?: boolean;
  changed?: boolean;
  sourceKind?: string;
  archivedPath?: string;
  packageIds?: string[];
  packId?: string;
  removedInterfaces?: string[];
  removedTools?: string[];
  cleanupWarnings?: string[];
  operationId?: string;
  rootEeId?: string;
  homeRunId?: string;
  homeInterfaceId?: string;
  workerInterfaceId?: string;
  agentId?: string;
  clientTemplateDigest?: string;
  agentCatalogDigest?: string;
  receiptDigest?: string;
  projects?: Array<{ key: string; eeId: string }>;
  projectEeIds?: string[];
  projectChanges?: Array<{
    eeId: string;
    available: boolean;
    selectedByDefault: boolean;
  }>;
};

export type PhobosApplicationLifecycleProgress = {
  operationId: string;
  applicationId: string;
  packageId: string;
  operation: "install" | "remove" | "repair";
  phase: "preflight" | "verifying" | "copying" | "backing_up" | "materializing" | "installing" | "removing" | "finalizing" | "receipting" | "complete";
  percent: number;
};

export type PhobosWorkspaceSetupProgress = {
  operationId: string;
  phase: "planning" | "staging" | "applying" | "publishing" | "complete";
  percent: number;
  label: string;
};

export type PhobosWorkspaceSetupState = {
  status: "not_configured" | "configured" | "degraded";
  receipt: {
    operationId: string;
    requestDigest: string;
    completedAt: string;
    rootEeId: string;
    homeRunId: string;
    homeInterfaceId: string;
    projects: Array<{ key: string; eeId: string }>;
  } | null;
  errors: string[];
};

export type PhobosClientSetupPlan = {
  pack: {
    id: string;
    manifest_digest: string;
    selected_recommended: string[];
  };
  packages: Array<{
    id: string;
    source_digest: string;
    desired_state: "installed";
  }>;
  extensions: Array<{
    id: string;
    version: string;
    source_digest: string;
    desired_state: "installed" | "available";
  }>;
  provider: {
    interface_id: string;
    required_state: "account_readable";
  };
  workspace: {
    request_digest: string;
    request: Extract<PhobosOsWorkspaceMutationRequest, { action: "initialize_workspace" }>;
    project_defaults: Array<{
      package_id: string;
      product_kind: "application" | "driver";
      product_id: string;
      default_for_new_tasks: boolean;
      project_keys: string[];
    }>;
  };
};

export type PhobosClientSetupBeginRequest = {
  operationId: string;
  plan: PhobosClientSetupPlan;
};

export type PhobosClientSetupState = {
  status: "in_progress" | "complete";
  operationId: string;
  planDigest: string;
  plan: PhobosClientSetupPlan;
  steps: Array<{
    step: "packages" | "extensions" | "provider" | "workspace";
    state: "pending" | "complete";
    evidenceDigest: string;
  }>;
  updatedAt: string;
  lastError: {
    step: "packages" | "extensions" | "provider" | "workspace";
    message: string;
    observedAt: string;
  } | null;
  completedAt: string;
  receiptDigest: string;
};

export type PhobosClientSetupProgress = {
  operationId: string;
  step: "packages" | "extensions" | "provider" | "workspace";
  phase: "verifying" | "applying" | "complete" | "sealed";
  percent: number;
};

export type PhobosClientContext = readonly Readonly<{ name: string; text: string }>[];

export type PhobosChatTurnRequest = {
  replacesMessage?: { id: string; content: string };
  endpoint?: string;
  timeoutMs?: number;
  messageId?: string;
  recoverPreparedMessage?: boolean;
  runId?: string;
  providerInterfaceId: string;
  providerModel: string;
  reasoningEffort?: string;
  serviceTier?: string;
  eeId?: string;
  workerInterfaceId?: string;
  doorHostSlots?: Record<string, Record<string, string>>;
  externalInputs?: Array<{
    checkpointId: string;
    interfaceId: string;
    artifactNames?: string[];
    requiredVerifiedArtifacts?: Array<{
      mark: string;
      artifactLabel: string;
      verifier: string;
      params: Record<string, unknown>;
    }>;
  }>;
  externalRelays?: Array<{
    checkpointId: string;
    interfaceId: string;
    outboundInterfaceIds: string[];
    requiredVerifiedArtifacts?: Array<{
      mark: string;
      artifactLabel: string;
      verifier: string;
      params: Record<string, unknown>;
    }>;
  }>;
  modelOutputs?: Array<{
    checkpointId: string;
    interfaceId: string;
    requiredVerifiedArtifact: {
      mark: string;
      artifactLabel: string;
      verifier: string;
      params: Record<string, unknown>;
    };
  }>;
  contextArtifactBindings?: Array<{ id: string }>;
  payloadArtifactBindings?: Array<{ id: string; content: number[] }>;
  selectedWorkerEnvironmentKinds?: string[];
  selectedTools?: Array<{
    tool: string;
    interface: string;
    workerEnvironmentKind: string;
  }>;
  clientSurfaceRole: "home" | "task";
  clientContext?: PhobosClientContext;
  continuation?: {
    sourceRunId: string;
    sourceArtifactId: string;
  };
  text: string;
  attachments: Array<{
    id: string;
    name: string;
    label: string;
    type: string;
    size: number;
    lastModified: number;
    stage: PhobosClientAttachmentStageHandle;
  }>;
};

export type PhobosChatSteerRequest = {
  runId: string;
  messageId?: string;
  recoverPreparedMessage?: boolean;
  providerInterfaceId: string;
  providerModel: string;
  eeId?: string;
  workerInterfaceId?: string;
  clientSurfaceRole: "home" | "task";
  clientContext?: PhobosClientContext;
  endpoint?: string;
  text: string;
  timeoutMs?: number;
  attachments: PhobosChatTurnRequest["attachments"];
};

export type PhobosChatPinsRequest = {
  runId: string;
  artifactId: string;
  pinned: boolean;
  excerpt?: {
    sourceMessageId: string;
    text: string;
    start: number;
    end: number;
    role: "user" | "assistant" | "system";
  };
};

export type PhobosChatPinsResponse = {
  runId: string;
  pinnedArtifactIds: string[];
  pinnedContextItems: Array<{
    artifactId: string;
    sourceArtifactId: string;
    sourceMessageId: string;
    text: string;
    start: number;
    end: number;
    role: "user" | "assistant" | "system";
  }>;
  clientWrites: Array<{
    path: string;
    tag: string;
    beforeHash: string | null;
    afterHash: string;
    bytes: number;
    changed: boolean;
  }>;
};

export type PhobosDeliveryVerdict =
  | { admitted: { seq: number } }
  | { refused: { reason: string; detail: unknown } };

export type PhobosChatTurnResponse = {
  runId: string;
  chatInterfaceId: string;
  modelInterfaceId: string;
  workerInterfaceId: string;
  clientSurfaceRole: "home" | "task";
  label: string;
  messageId: string;
  payloadPath: string;
  contentHash: string;
  attachmentCount: number;
  clientWrites: Array<{
    path: string;
    tag: string;
    beforeHash: string | null;
    afterHash: string;
    bytes: number;
    changed: boolean;
  }>;
  messageRecovered: boolean;
  messageVerdict: PhobosDeliveryVerdict;
  outboundCursor: PhobosOperatorChatCursor;
};

export type PhobosOperatorChatCursor = {
  offset: number;
  seq: number | null;
  stream?: PhobosOperatorTurnStreamCursor;
  streams?: Record<string, PhobosOperatorTurnStreamCursor>;
};

export type PhobosOperatorTurnStreamCursor = {
  stream_id: string;
  offset: number;
  seq: number;
  recorded_at_unix_ms: number;
  source_movement_seq: number;
  sealed?: true;
};

export type PhobosOperatorChatArtifactsRequest = {
  interfaceId: string;
  runId: string;
  afterSeq: number;
  cursor?: PhobosOperatorChatCursor;
  waitMs?: number;
  limit?: number;
};

export type PhobosOperatorChatArtifactBase = {
  source: "movement" | "stream";
  recorded_at_unix_ms: number;
  run_id: string;
  interface_id: string;
  from_interface_id: string;
  from_interface_role: string;
  label: string;
  event_kind: string;
  event_data: Record<string, unknown>;
  text: string;
  error: boolean;
  terminal: boolean;
  will_retry: boolean;
};

export type PhobosOperatorChatMovementArtifact = PhobosOperatorChatArtifactBase & {
  source: "movement";
  movement_seq: number;
  checkpoint_id: string;
  artifact_id: string;
  content_hash: string;
};

export type PhobosOperatorChatStreamArtifact = PhobosOperatorChatArtifactBase & {
  source: "stream";
  stream_id: string;
  stream_seq: number;
  byte_start_offset: number;
  byte_end_offset: number;
  source_movement_seq: number;
};

export type PhobosOperatorChatArtifact =
  | PhobosOperatorChatMovementArtifact
  | PhobosOperatorChatStreamArtifact;

export type PhobosOperatorTurnControlRequest = {
  interfaceId: string;
  runId: string;
  controlId: string;
  action: "interrupt" | "resume" | "stop";
  timeoutMs?: number;
};

export type PhobosOperatorTurnControlResponse = {
  interfaceId: string;
  runId: string;
  label: "operator.turn.control";
  controlId: string;
  action: "interrupt" | "resume" | "stop";
  payloadPath: string;
  verdict: PhobosDeliveryVerdict;
} | {
  deliveryError: {
    stage: "not-sent" | "refused" | "admitted" | "outcome-unknown";
    message: string;
  };
};

export type PhobosOperatorChatArtifactsResponse = {
  artifacts: PhobosOperatorChatArtifact[];
  cursor: PhobosOperatorChatCursor;
};

export type PhobosChatSteerResponse = {
  interfaceId: string;
  runId: string;
  label: string;
  messageId: string;
  attachmentCount: number;
  contentHash: string;
  messageRecovered: boolean;
  verdict: PhobosDeliveryVerdict;
};
