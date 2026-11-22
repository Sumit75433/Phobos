const { contextBridge, ipcRenderer, webFrame, webUtils } = require("electron");

const OPERATOR_CHAT_SUBMIT_RESULT = "phobos.operator-chat.submit.v1";
const OPERATOR_CHAT_SUBMIT_ERROR_MESSAGE = "Couldn't send your message. Try again.";
const CLIENT_EXTENSION_ACTION_RESULT = "phobos.client-extension.action.v1";
const CLIENT_EXTENSION_ACTION_ERROR_MESSAGE = "Phobos couldn't complete the repair. Try again.";

function unwrapOperatorChatSubmitResult(result) {
  if (result?.contract === OPERATOR_CHAT_SUBMIT_RESULT && result.ok === true) {
    return result.value;
  }
  const message = result?.contract === OPERATOR_CHAT_SUBMIT_RESULT
    && result.ok === false
    && typeof result.error?.message === "string"
    && result.error.message.trim()
    ? result.error.message
    : OPERATOR_CHAT_SUBMIT_ERROR_MESSAGE;
  const error = new Error(message);
  error.name = "PhobosChatSubmitError";
  error.code = result?.contract === OPERATOR_CHAT_SUBMIT_RESULT
    && result.ok === false
    && typeof result.error?.code === "string"
    ? result.error.code
    : "message_send_failed";
  error.retryable = result?.contract === OPERATOR_CHAT_SUBMIT_RESULT
    && result.ok === false
    && result.error?.retryable === true;
  error.deliveryState = result?.contract === OPERATOR_CHAT_SUBMIT_RESULT
    && result.ok === false
    && result.error?.deliveryState === "not_sent" ? "not_sent" : "unknown";
  throw error;
}

function unwrapClientExtensionActionResult(result) {
  if (result?.contract === CLIENT_EXTENSION_ACTION_RESULT && result.ok === true) {
    return result.value;
  }
  const message = result?.contract === CLIENT_EXTENSION_ACTION_RESULT
    && result.ok === false
    && typeof result.error?.message === "string"
    && result.error.message.trim()
    ? result.error.message
    : CLIENT_EXTENSION_ACTION_ERROR_MESSAGE;
  const error = new Error(message);
  error.name = "PhobosClientExtensionActionError";
  error.code = result?.contract === CLIENT_EXTENSION_ACTION_RESULT
    && result.ok === false
    && typeof result.error?.code === "string"
    ? result.error.code
    : "repair_failed";
  error.retryable = result?.contract === CLIENT_EXTENSION_ACTION_RESULT
    && result.ok === false
    && result.error?.retryable === true;
  throw error;
}

function unwrapApplicationConnectionResult(result) {
  if (result?.contract === "phobos.application-connection.v1" && result.ok === true) return result.value;
  const error = new Error(result?.contract === "phobos.application-connection.v1"
    && typeof result.error?.message === "string"
    && result.error.message.trim()
    ? result.error.message
    : "Phobos couldn't finish the connection.");
  error.name = "PhobosApplicationConnectionError";
  error.code = result?.error?.code === "cancelled" ? "cancelled" : "failed";
  throw error;
}

const inheritedAccessClaim = process.argv.find((argument) => argument.startsWith("--phobos-access-claim="))?.slice("--phobos-access-claim=".length) ?? "";
let accessToken = inheritedAccessClaim ? ipcRenderer.sendSync("phobos:access-inherit", inheritedAccessClaim) : "";
let runtimeEventListenerCount = 0;

async function refreshRuntimeEventSubscription() {
  if (runtimeEventListenerCount <= 0) return;
  await ipcRenderer.invoke("phobos:runtime-events-unsubscribe", accessToken);
  await ipcRenderer.invoke("phobos:runtime-events-subscribe", accessToken);
}

function subscribeRuntimeEvent(channel, listener) {
  const wrapped = (_event, payload) => listener(payload);
  runtimeEventListenerCount += 1;
  ipcRenderer.on(channel, wrapped);
  void refreshRuntimeEventSubscription().catch(() => undefined);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
    runtimeEventListenerCount = Math.max(0, runtimeEventListenerCount - 1);
    if (runtimeEventListenerCount === 0) {
      void ipcRenderer.invoke("phobos:runtime-events-unsubscribe", accessToken).catch(() => undefined);
    }
  };
}

async function establishAccess(channel, password) {
  const result = await ipcRenderer.invoke(channel, password);
  accessToken = result.token;
  await refreshRuntimeEventSubscription();
  return ipcRenderer.invoke("phobos:access-status", accessToken);
}

function invokeAccess(channel, ...args) {
  return ipcRenderer.invoke(channel, accessToken, ...args);
}

function beginClientPaneTransferSync(request) {
  const result = ipcRenderer.sendSync("phobos:client-pane-transfer-begin", accessToken, request);
  if (result?.ok === true) return result.value;
  throw new Error(typeof result?.error?.message === "string" && result.error.message
    ? result.error.message
    : "Client pane transfer could not begin.");
}

function acknowledgeClientPaneTransferSync(request) {
  const result = ipcRenderer.sendSync("phobos:client-pane-transfer-acknowledge", accessToken, request);
  if (result?.ok === true) return result.value;
  throw new Error(typeof result?.error?.message === "string" && result.error.message
    ? result.error.message
    : "Client pane transfer source acknowledgement failed.");
}

contextBridge.exposeInMainWorld("phobosTransport", {
  showClientContextMenu(request) {
    return ipcRenderer.invoke("phobos:client-context-menu", request);
  },
  cancelClientContextMenu(request) {
    return ipcRenderer.invoke("phobos:client-context-menu-cancel", request);
  },
  windowZoomFactor() {
    return webFrame.getZoomFactor();
  },
  appInfo() {
    return ipcRenderer.invoke("phobos:app-info");
  },
  openProblemReport() {
    return invokeAccess("phobos:support-open");
  },
  runClientDoctor() {
    return invokeAccess("phobos:client-doctor");
  },
  copyText(value) {
    return invokeAccess("phobos:clipboard-write", value);
  },
  logClientEvent(request) {
    return invokeAccess("phobos:client-log", request);
  },
  openClientLogs() {
    return invokeAccess("phobos:open-client-logs");
  },
  selectClientDirectory(request) {
    return invokeAccess("phobos:client-directory-select", request);
  },
  selectClientAttachments(request) {
    return invokeAccess("phobos:client-attachments-select", request);
  },
  async stageDroppedAttachments(files) {
    if (!Array.isArray(files) || files.length > 12) throw new Error("A task can include up to 12 dropped files or folders.");
    const paths = [];
    const fileIndices = [];
    for (const [index, file] of files.entries()) {
      const nativePath = webUtils.getPathForFile(file);
      if (nativePath) {
        paths.push(nativePath);
        fileIndices.push(index);
      }
    }
    const selection = paths.length
      ? await invokeAccess("phobos:stage-dropped-attachments", paths)
      : { canceled: false, attachments: [] };
    return { ...selection, fileIndices };
  },
  readClientAttachmentPreview(request) {
    return invokeAccess("phobos:client-attachment-preview", request);
  },
  discardClientAttachmentStages(handles) {
    return invokeAccess("phobos:attachment-stages-discard", handles);
  },
  beginClientAttachmentStage(request) {
    return invokeAccess("phobos:attachment-stage-begin", request);
  },
  appendClientAttachmentStage(request) {
    return invokeAccess("phobos:attachment-stage-append", request);
  },
  finalizeClientAttachmentStage(request) {
    return invokeAccess("phobos:attachment-stage-finalize", request);
  },
  abortClientAttachmentStage(request) {
    return invokeAccess("phobos:attachment-stage-abort", request);
  },
  saveClientFile(request) {
    return invokeAccess("phobos:client-file-save", request);
  },
  downloadClientFileCopy(request) {
    return invokeAccess("phobos:client-file-download-copy", request);
  },
  openClientFile(request) {
    return invokeAccess("phobos:client-file-open", request);
  },
  listClientFileOpenTargets(request) {
    return invokeAccess("phobos:client-file-open-targets", request);
  },
  openClientFileWithApplication(request) {
    return invokeAccess("phobos:client-file-open-with", request);
  },
  startClientFileDrag(request) {
    ipcRenderer.send("phobos:client-file-start-drag", accessToken, request);
  },
  accessStatus() {
    return ipcRenderer.invoke("phobos:access-status", accessToken);
  },
  configureAccess(password) {
    return establishAccess("phobos:access-configure", password);
  },
  unlockAccess(password) {
    return establishAccess("phobos:access-unlock", password);
  },
  touchIdStatus() {
    return ipcRenderer.invoke("phobos:touch-id-status");
  },
  async setTouchIdEnabled(enabled) {
    return invokeAccess("phobos:touch-id-set-enabled", enabled);
  },
  async unlockWithTouchId() {
    const result = await ipcRenderer.invoke("phobos:touch-id-unlock");
    accessToken = result.token;
    await refreshRuntimeEventSubscription();
    return ipcRenderer.invoke("phobos:access-status", accessToken);
  },
  async lockAccess() {
    const token = accessToken;
    const result = await ipcRenderer.invoke("phobos:access-lock", token);
    if (!result.authenticated && accessToken === token) {
      accessToken = "";
      await ipcRenderer.invoke("phobos:runtime-events-unsubscribe", token);
    }
    return result;
  },
  labAccess() {
    return invokeAccess("phobos:lab-access-read");
  },
  updateLabAccess(password) {
    return invokeAccess("phobos:lab-access-update", password);
  },
  accessDetails() {
    return invokeAccess("phobos:access-details");
  },
  updateAdministratorAccess(request) {
    return invokeAccess("phobos:administrator-access-update", request);
  },
  requestMicrophoneAccess() {
    return invokeAccess("phobos:request-microphone-access");
  },
  requestCameraAccess() {
    return invokeAccess("phobos:request-camera-access");
  },
  cameraAccessStatus() {
    return invokeAccess("phobos:camera-access-status");
  },
  saveGestureTrace(text) {
    return invokeAccess("phobos:gesture-trace-save", text);
  },
  revealGestureTrace(target) {
    return invokeAccess("phobos:gesture-trace-reveal", target);
  },
  clientWindowBootstrap() {
    return ipcRenderer.sendSync("phobos:client-window-bootstrap");
  },
  openClientWindow(request) {
    return invokeAccess("phobos:client-window-open", request);
  },
  clientWindowReady(request) {
    return invokeAccess("phobos:client-window-ready", request);
  },
  registerClientWindowCloseGuard() { return invokeAccess("phobos:client-window-close-register"); },
  unregisterClientWindowCloseGuard(request) { return invokeAccess("phobos:client-window-close-unregister", request); },
  resolveClientWindowClose(request) { return invokeAccess("phobos:client-window-close-resolve", request); },
  onClientWindowCloseRequested(listener) {
    const wrapped = (_event, request) => listener(request);
    ipcRenderer.on("phobos:client-window-close-requested", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-window-close-requested", wrapped);
  },
  onClientWindowCloseCancelled(listener) {
    const wrapped = (_event, request) => listener(request);
    ipcRenderer.on("phobos:client-window-close-cancelled", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-window-close-cancelled", wrapped);
  },
  beginClientPaneTransfer(request) {
    return beginClientPaneTransferSync(request);
  },
  beginClientPaneDrag(request) { return invokeAccess("phobos:client-pane-drag-begin", request); },
  moveClientPaneDrag(request) { return invokeAccess("phobos:client-pane-drag-move", request); },
  finishClientPaneDrag(request) { return invokeAccess("phobos:client-pane-drag-finish", request); },
  cancelClientPaneDrag(request) { return invokeAccess("phobos:client-pane-drag-cancel", request); },
  reattachClientPane(request) { return invokeAccess("phobos:client-pane-drag-reattach", request); },
  detachClientPane(request) { return invokeAccess("phobos:client-pane-drag-detach", request); },
  pendingClientPaneSourceFinalizations() { return invokeAccess("phobos:client-pane-source-finalizations"); },
  acknowledgeClientPaneSourceFinalization(request) { return invokeAccess("phobos:client-pane-source-finalization-ack", request); },
  registerClientPaneDropZone(request) { return invokeAccess("phobos:client-pane-drag-drop-zone", request); },
  anchorClientPaneDrop(request) { return invokeAccess("phobos:client-pane-drag-anchor", request); },
  onClientPaneDragState(listener) {
    const wrapped = (_event, value) => listener(value);
    ipcRenderer.on("phobos:client-pane-drag-state", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-pane-drag-state", wrapped);
  },
  onClientPaneTransferAccepted(listener) {
    const wrapped = (_event, value) => listener(value);
    ipcRenderer.on("phobos:client-pane-transfer-accepted", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-pane-transfer-accepted", wrapped);
  },
  onClientPaneTransferFinalized(listener) {
    const wrapped = (_event, value) => listener(value);
    ipcRenderer.on("phobos:client-pane-transfer-finalized", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-pane-transfer-finalized", wrapped);
  },
  onClientPaneTransferCancelled(listener) {
    const wrapped = (_event, value) => listener(value);
    ipcRenderer.on("phobos:client-pane-transfer-cancelled", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-pane-transfer-cancelled", wrapped);
  },
  acceptClientPaneTransfer(request) {
    return invokeAccess("phobos:client-pane-transfer-accept", request);
  },
  commitClientPaneTransfer(request) {
    return invokeAccess("phobos:client-pane-transfer-commit", request);
  },
  acknowledgeClientPaneTransfer(request) {
    return acknowledgeClientPaneTransferSync(request);
  },
  rejectClientPaneTransfer(request) {
    return invokeAccess("phobos:client-pane-transfer-reject", request);
  },
  cancelClientPaneTransfer(request) {
    return invokeAccess("phobos:client-pane-transfer-cancel", request);
  },
  pendingClientPaneTransfers() {
    return invokeAccess("phobos:client-pane-transfer-pending");
  },
  pendingClientPaneDestinationTransfers() {
    return invokeAccess("phobos:client-pane-transfer-destination-pending");
  },
  resumeClientPaneTransfer(request) {
    return invokeAccess("phobos:client-pane-transfer-resume", request);
  },
  finalizeClientPaneTransfer(request) {
    return invokeAccess("phobos:client-pane-transfer-finalize", request);
  },
  windowState() {
    return ipcRenderer.invoke("phobos:window-state");
  },
  setHistoryNavigationState(state) {
    ipcRenderer.send("phobos:history-navigation-state", state);
  },
  setWindowAppearance(appearance) {
    ipcRenderer.send("phobos:window-appearance", appearance);
  },
  setPowerSaveBlocker(enabled) {
    return invokeAccess("phobos:power-save-blocker", enabled);
  },
  setGlobalDictationShortcut(request) {
    return invokeAccess("phobos:global-dictation-shortcut", request);
  },
  setNativeCommandShortcuts(shortcuts) {
    return invokeAccess("phobos:native-command-shortcuts", shortcuts);
  },
  openQuickTaskWindow() {
    return invokeAccess("phobos:quick-task-open");
  },
  closeQuickTaskWindow() {
    return invokeAccess("phobos:quick-task-close");
  },
  openRunInMain(runId) {
    return invokeAccess("phobos:quick-task-open-main", runId);
  },
  openWorkerEnvironmentWindow(request) {
    return invokeAccess("phobos:worker-environment-window-open", request);
  },
  openWorkerEnvironmentInMain(request) {
    return invokeAccess("phobos:worker-environment-window-open-main", request);
  },
  setWorkerEnvironmentWindowPinned(enabled) {
    return invokeAccess("phobos:worker-environment-window-pinned", enabled);
  },
  openTaskMonitorWindow(runId) {
    return invokeAccess("phobos:task-monitor-window-open", runId);
  },
  setTaskMonitorWindowPinned(enabled) {
    return invokeAccess("phobos:task-monitor-window-pinned", enabled);
  },
  loginItemSettings(request) {
    return invokeAccess("phobos:login-item-settings", request);
  },
  windowControl(action) {
    ipcRenderer.send("phobos:window-control", action);
  },
  relaunchClient() {
    return invokeAccess("phobos:client-relaunch");
  },
  defaults() {
    return invokeAccess("phobos:transport-defaults");
  },
  providerInterfaces() {
    return invokeAccess("phobos:provider-interfaces");
  },
  bootStatus() {
    return invokeAccess("phobos:boot-status");
  },
  chatgptAccount() {
    return invokeAccess("phobos:chatgpt-account");
  },
  chatgptRateLimits() {
    return invokeAccess("phobos:chatgpt-rate-limits");
  },
  chatgptAccountSessions() {
    return invokeAccess("phobos:chatgpt-account-sessions");
  },
  chatgptSwitchWorkspace(request) {
    return invokeAccess("phobos:chatgpt-switch-workspace", request);
  },
  chatgptLogout() {
    return invokeAccess("phobos:chatgpt-logout");
  },
  onChatgptAccountChanged(listener) {
    const wrapped = () => listener();
    ipcRenderer.on("phobos:chatgpt-account-changed", wrapped);
    return () => ipcRenderer.removeListener("phobos:chatgpt-account-changed", wrapped);
  },
  chatgptSignInStart() {
    return invokeAccess("phobos:chatgpt-sign-in-start");
  },
  chatgptSignInStatus(loginId) {
    return invokeAccess("phobos:chatgpt-sign-in-status", loginId);
  },
  chatgptSignInCancel(loginId) {
    return invokeAccess("phobos:chatgpt-sign-in-cancel", loginId);
  },
  openLaunchTerminal(request) {
    return invokeAccess("phobos:launch-terminal-open", request);
  },
  writeLaunchTerminal(sessionId, data) {
    return invokeAccess("phobos:launch-terminal-write", sessionId, data);
  },
  resizeLaunchTerminal(sessionId, request) {
    return invokeAccess("phobos:launch-terminal-resize", sessionId, request);
  },
  openTerminal(request) {
    return invokeAccess("phobos:terminal-open", request);
  },
  writeTerminal(terminalId, sessionId, data) {
    return invokeAccess("phobos:terminal-write", terminalId, sessionId, data);
  },
  resizeTerminal(terminalId, sessionId, request) {
    return invokeAccess("phobos:terminal-resize", terminalId, sessionId, request);
  },
  closeTerminal(terminalId) {
    return invokeAccess("phobos:terminal-close", terminalId);
  },
  runtimeStatus(request) {
    return invokeAccess("phobos:runtime-status", request);
  },
  validateRuntimeEndpoint(request) {
    return invokeAccess("phobos:validate-runtime-endpoint", request);
  },
  projectionRead(request) {
    return invokeAccess("phobos:projection-read", request);
  },
  workspaceSetupState() {
    return invokeAccess("phobos:workspace-setup-state");
  },
  saveSetupFile(request) {
    return invokeAccess("phobos:setup-file-save", request);
  },
  openSetupFile() {
    return invokeAccess("phobos:setup-file-open");
  },
  clientSetupRead(request) {
    return invokeAccess("phobos:client-setup-read", request);
  },
  clientSetupReadCurrent() {
    return invokeAccess("phobos:client-setup-read-current");
  },
  clientSetupBegin(request) {
    return invokeAccess("phobos:client-setup-begin", request);
  },
  clientSetupResume(request) {
    return invokeAccess("phobos:client-setup-resume", request);
  },
  mutateScheduledInterface(request) {
    return invokeAccess("phobos:scheduled-interface-mutate", request);
  },
  mutateApplicationPrivateConfiguration(request) {
    return invokeAccess("phobos:application-private-configuration-mutate", request);
  },
  async applicationConnectionProbe(request) {
    return unwrapApplicationConnectionResult(await invokeAccess("phobos:application-connection-probe", request));
  },
  async applicationConnectionConnect(request) {
    return unwrapApplicationConnectionResult(await invokeAccess("phobos:application-connection-connect", request));
  },
  async applicationConnectionCancel(request) {
    return unwrapApplicationConnectionResult(await invokeAccess("phobos:application-connection-cancel", request));
  },
  async applicationConnectionDisconnect(request) {
    return unwrapApplicationConnectionResult(await invokeAccess("phobos:application-connection-disconnect", request));
  },
  mutatePhobosOsWorkspace(request) {
    return invokeAccess("phobos:os-workspace-mutate", request);
  },
  openCdpViewer(request) {
    return invokeAccess("phobos:cdp-viewer-open", request);
  },
  prepareNativeBrowserViewer(request) {
    return invokeAccess("phobos:native-browser-viewer-prepare", request);
  },
  acknowledgeNativeBrowserViewer(request) {
    return invokeAccess("phobos:native-browser-viewer-ack", request);
  },
  nativeBrowserCursorArrived(request) {
    return invokeAccess("phobos:native-browser-viewer-cursor-arrived", request);
  },
  syncNativeBrowserViewer(request) {
    return invokeAccess("phobos:native-browser-viewer-sync", request);
  },
  nativeBrowserDownloads(request) {
    return invokeAccess("phobos:native-browser-viewer-downloads", request);
  },
  nativeBrowserViewerAction(request) {
    return invokeAccess("phobos:native-browser-viewer-action", request);
  },
  closeNativeBrowserViewer(request) {
    return invokeAccess("phobos:native-browser-viewer-close", request);
  },
  clientBrowser(request) { return invokeAccess("phobos:client-browser", request); },
  onClientBrowserState(listener) {
    const handler = (_event, state) => listener(state);
    ipcRenderer.on("phobos:client-browser-state", handler);
    return () => ipcRenderer.removeListener("phobos:client-browser-state", handler);
  },
  onClientBrowserOpened(listener) {
    const handler = (_event, state) => listener(state);
    ipcRenderer.on("phobos:client-browser-opened", handler);
    return () => ipcRenderer.removeListener("phobos:client-browser-opened", handler);
  },
  closeNativeBrowserPage(request) {
    return invokeAccess("phobos:native-browser-page-close", request);
  },
  browserSavedPermissions(request) {
    return invokeAccess("phobos:browser-saved-permissions", request);
  },
  desktopSavedApplicationPermissions(request) {
    return invokeAccess("phobos:desktop-saved-application-permissions", request);
  },
  desktopComputerUseSettings(request) {
    return invokeAccess("phobos:desktop-computer-use-settings", request);
  },
  openDesktopPermissions(request) {
    return invokeAccess("phobos:desktop-permissions-open", request);
  },
  desktopSurfaceRequest(request) {
    return invokeAccess("phobos:desktop-surface-request", request);
  },
  desktopApplicationView(request) {
    return invokeAccess("phobos:desktop-application-view", request);
  },
  cdpViewerAction(request) {
    return invokeAccess("phobos:cdp-viewer-action", request);
  },
  closeCdpViewer(request) {
    return invokeAccess("phobos:cdp-viewer-close", request);
  },
  openProcessViewer(request) {
    return invokeAccess("phobos:process-viewer-open", request);
  },
  processViewerAction(request) {
    return invokeAccess("phobos:process-viewer-action", request);
  },
  closeProcessViewer(request) {
    return invokeAccess("phobos:process-viewer-close", request);
  },
  listWorkerEnvironmentFiles(request) {
    return invokeAccess("phobos:worker-environment-files-list", request);
  },
  readWorkerEnvironmentFile(request) {
    return invokeAccess("phobos:worker-environment-file-read", request);
  },
  readWorkerEnvironmentFilePreview(request) {
    return invokeAccess("phobos:worker-environment-file-preview", request);
  },
  readWorkerEnvironmentFileAttachment(request) {
    return invokeAccess("phobos:worker-environment-file-attachment", request);
  },
  writeWorkerEnvironmentFile(request) {
    return invokeAccess("phobos:worker-environment-file-write", request);
  },
  performWorkerEnvironmentFileSystemAction(request) {
    return invokeAccess("phobos:worker-environment-file-system-action", request);
  },
  osFileRoots() {
    return invokeAccess("phobos:os-files-roots");
  },
  listOsFiles(request) {
    return invokeAccess("phobos:os-files-list", request);
  },
  readOsFile(request) {
    return invokeAccess("phobos:os-file-read", request);
  },
  writeOsFile(request) {
    return invokeAccess("phobos:os-file-write", request);
  },
  performOsFileSystemAction(request) {
    return invokeAccess("phobos:os-file-system-action", request);
  },
  inspectWorkerEnvironmentGit(request) {
    return invokeAccess("phobos:worker-environment-git-inspect", request);
  },
  performWorkerEnvironmentOperatorAction(request) {
    return invokeAccess("phobos:worker-environment-operator-action", request);
  },
  clientSurfaceDocuments() {
    return invokeAccess("phobos:client-surface-documents");
  },
  clientExtensions() {
    return invokeAccess("phobos:client-extensions");
  },
  mutateClientExtension(request) {
    return invokeAccess("phobos:client-extension-mutate", request);
  },
  setClientExtensionCredential(request) {
    return invokeAccess("phobos:client-extension-credential", request);
  },
  checkClientExtensionCredential(request) {
    return invokeAccess("phobos:client-extension-credential-check", request);
  },
  applyClientExtensionLifecycle(request) {
    return invokeAccess("phobos:client-extension-lifecycle", request);
  },
  revealClientExtensions() {
    return invokeAccess("phobos:client-extensions-reveal");
  },
  readClientExtensionFilesystemSource(request) {
    return invokeAccess("phobos:client-extension-filesystem-read", request);
  },
  async runClientExtensionAction(request) {
    return unwrapClientExtensionActionResult(await invokeAccess("phobos:client-extension-action", request));
  },
  readCodexUsage(request) {
    return invokeAccess("phobos:client-codex-usage-read", request);
  },
  refreshProviderModels(request) {
    return invokeAccess("phobos:provider-models-refresh", request);
  },
  requestComposerPrediction(request) {
    return invokeAccess("phobos:composer-prediction", request);
  },
  requestTaskTitle(request) {
    return invokeAccess("phobos:task-title", request);
  },
  async submitChatTurn(request) {
    return unwrapOperatorChatSubmitResult(await invokeAccess("phobos:submit-chat-turn", request));
  },
  readOperatorChatArtifacts(request) {
    return invokeAccess("phobos:operator-chat-artifacts-read", request);
  },
  submitOperatorTurnControl(request) {
    return invokeAccess("phobos:submit-operator-turn-control", request);
  },
  async submitChatSteer(request) {
    return unwrapOperatorChatSubmitResult(await invokeAccess("phobos:submit-chat-steer", request));
  },
  updateChatPins(request) {
    return invokeAccess("phobos:update-chat-pins", request);
  },
  transcribeDictation(request) {
    return invokeAccess("phobos:transcribe-dictation", request);
  },
  startDictationStream(request) {
    return invokeAccess("phobos:dictation-stream-start", request);
  },
  appendDictationAudio(attemptId, bytes) {
    ipcRenderer.send("phobos:dictation-stream-audio", accessToken, attemptId, bytes);
  },
  finishDictationStream(attemptId) {
    return invokeAccess("phobos:dictation-stream-finish", attemptId);
  },
  onDictationStreamEvent(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:dictation-stream-event", wrapped);
    return () => ipcRenderer.removeListener("phobos:dictation-stream-event", wrapped);
  },
  cancelDictation(attemptId) {
    return invokeAccess("phobos:cancel-dictation", attemptId);
  },
  readDictationRecordings() {
    return invokeAccess("phobos:dictation-recordings-read");
  },
  configureDictationRecordings(enabled) {
    return invokeAccess("phobos:dictation-recordings-configure", enabled);
  },
  saveDictationRecording(request) {
    return invokeAccess("phobos:dictation-recording-save", request);
  },
  readDictationRecording(id) {
    return invokeAccess("phobos:dictation-recording-read", id);
  },
  updateDictationRecording(request) {
    return invokeAccess("phobos:dictation-recording-update", request);
  },
  deleteDictationRecording(id) {
    return invokeAccess("phobos:dictation-recording-delete", id);
  },
  submitInterfaceArtifact(request) {
    return invokeAccess("phobos:submit-interface-artifact", request);
  },
  beginInterfaceArtifactStream(request) {
    return invokeAccess("phobos:artifact-stream-begin", request);
  },
  appendInterfaceArtifactStream(request) {
    return invokeAccess("phobos:artifact-stream-append", request);
  },
  finalizeInterfaceArtifactStream(request) {
    return invokeAccess("phobos:artifact-stream-finalize", request);
  },
  abortInterfaceArtifactStream(request) {
    return invokeAccess("phobos:artifact-stream-abort", request);
  },
  onProjectionChanged(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:projection-changed", wrapped);
    return () => ipcRenderer.removeListener("phobos:projection-changed", wrapped);
  },
  onRuntimeHostState(listener) {
    return subscribeRuntimeEvent("phobos:runtime-host-state", listener);
  },
  onTerminalData(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:terminal-data", wrapped);
    return () => ipcRenderer.removeListener("phobos:terminal-data", wrapped);
  },
  onTerminalExit(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:terminal-exit", wrapped);
    return () => ipcRenderer.removeListener("phobos:terminal-exit", wrapped);
  },
  onCdpViewerEvent(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:cdp-viewer-event", wrapped);
    return () => ipcRenderer.removeListener("phobos:cdp-viewer-event", wrapped);
  },
  onNativeBrowserViewerEvent(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:native-browser-viewer-event", wrapped);
    return () => ipcRenderer.removeListener("phobos:native-browser-viewer-event", wrapped);
  },
  onProcessViewerEvent(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:process-viewer-event", wrapped);
    return () => ipcRenderer.removeListener("phobos:process-viewer-event", wrapped);
  },
  onWindowStateChanged(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:window-state-changed", wrapped);
    return () => ipcRenderer.removeListener("phobos:window-state-changed", wrapped);
  },
  onNavigateBack(listener) {
    const wrapped = () => listener();
    ipcRenderer.on("phobos:navigate-back", wrapped);
    return () => ipcRenderer.removeListener("phobos:navigate-back", wrapped);
  },
  onNavigateForward(listener) {
    const wrapped = () => listener();
    ipcRenderer.on("phobos:navigate-forward", wrapped);
    return () => ipcRenderer.removeListener("phobos:navigate-forward", wrapped);
  },
  onGlobalDictationRequested(listener) {
    const wrapped = () => listener();
    ipcRenderer.on("phobos:global-dictation-requested", wrapped);
    return () => ipcRenderer.removeListener("phobos:global-dictation-requested", wrapped);
  },
  onNativeClientCommand(listener) {
    const wrapped = (_event, command) => listener(command);
    ipcRenderer.on("phobos:native-client-command", wrapped);
    return () => ipcRenderer.removeListener("phobos:native-client-command", wrapped);
  },
  onOpenRunRequested(listener) {
    const wrapped = (_event, runId) => listener(runId);
    ipcRenderer.on("phobos:open-run-requested", wrapped);
    return () => ipcRenderer.removeListener("phobos:open-run-requested", wrapped);
  },
  onClientAccessLocked(listener) {
    const wrapped = (_event, status) => {
      const token = accessToken;
      accessToken = "";
      if (token) void ipcRenderer.invoke("phobos:runtime-events-unsubscribe", token).catch((error) => console.error("Client event unsubscribe failed:", error));
      listener(status);
    };
    ipcRenderer.on("phobos:client-access-locked", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-access-locked", wrapped);
  },
  onClientPaneTransferCompleted(listener) {
    const wrapped = (_event, completion) => listener(completion);
    ipcRenderer.on("phobos:client-pane-transfer-completed", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-pane-transfer-completed", wrapped);
  },
  onOpenWorkerEnvironmentRequested(listener) {
    const wrapped = (_event, target) => listener(target);
    ipcRenderer.on("phobos:open-worker-environment-requested", wrapped);
    return () => ipcRenderer.removeListener("phobos:open-worker-environment-requested", wrapped);
  },
  onWorkerEnvironmentWindowTarget(listener) {
    const wrapped = (_event, target) => listener(target);
    ipcRenderer.on("phobos:worker-environment-window-target", wrapped);
    return () => ipcRenderer.removeListener("phobos:worker-environment-window-target", wrapped);
  },
  onClientSurfaceDocumentsChanged(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:client-surface-documents-changed", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-surface-documents-changed", wrapped);
  },
  onClientExtensionsChanged(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:client-extensions-changed", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-extensions-changed", wrapped);
  },
  onApplicationConnectionProgress(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:application-connection-progress", wrapped);
    return () => ipcRenderer.removeListener("phobos:application-connection-progress", wrapped);
  },
  onApplicationLifecycleProgress(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:application-lifecycle-progress", wrapped);
    return () => ipcRenderer.removeListener("phobos:application-lifecycle-progress", wrapped);
  },
  onWorkspaceSetupProgress(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:workspace-setup-progress", wrapped);
    return () => ipcRenderer.removeListener("phobos:workspace-setup-progress", wrapped);
  },
  onClientSetupProgress(listener) {
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on("phobos:client-setup-progress", wrapped);
    return () => ipcRenderer.removeListener("phobos:client-setup-progress", wrapped);
  },
});
