// The client reads the projection — there is no "bridge" concept in the architecture.
// Two equal readers of the same engine (electron/projection.cjs):
//   - the desktop app serves it over IPC (window.phobosTransport),
//   - the vite dev server serves it over HTTP for the browser preview.
// Same methods, same rows, same truth.

import type {
  PhobosChatTurnRequest,
  PhobosChatTurnResponse,
  PhobosChatSteerRequest,
  PhobosChatSteerResponse,
  PhobosChatPinsRequest,
  PhobosChatPinsResponse,
  PhobosArtifactStreamAbortOutcome,
  PhobosArtifactStreamAbortRequest,
  PhobosArtifactStreamAppendRequest,
  PhobosArtifactStreamBeginRequest,
  PhobosArtifactStreamFinalizeRequest,
  PhobosArtifactStreamHandle,
  PhobosArtifactStreamOutcome,
  PhobosArtifactStreamProgress,
  PhobosInterfaceArtifactRequest,
  PhobosInterfaceArtifactResponse,
  PhobosDictationRequest,
  PhobosDictationResponse,
  PhobosProviderInterfacesResponse,
  PhobosProviderModelsRefreshRequest,
  PhobosProviderModelsRefreshResponse,
  PhobosProviderRateLimits,
  PhobosProviderRateLimitWindow,
  PhobosOperatorChatArtifactsRequest,
  PhobosOperatorChatArtifactsResponse,
  PhobosOperatorTurnControlRequest,
  PhobosOperatorTurnControlResponse,
  PhobosScheduledMutationOutcome,
  PhobosScheduledMutationRequest,
  PhobosOsWorkspaceMutationOutcome,
  PhobosOsWorkspaceMutationRequest,
  PhobosApplicationLifecycleProgress,
  PhobosApplicationPrivateConfigurationMutation,
  PhobosApplicationPrivateConfigurationOutcome,
  PhobosApplicationConnectionProbe,
  PhobosApplicationConnectionProgress,
  PhobosApplicationConnectionRequest,
  PhobosApplicationConnectionState,
  PhobosWorkspaceSetupProgress,
  PhobosWorkspaceSetupState,
  PhobosClientSetupBeginRequest,
  PhobosClientSetupProgress,
  PhobosClientSetupState,
} from "./electron";
import {
  PROJECTION_READ_CONTRACT_VERSION,
  type ProjectionReadMethod,
} from "./generated/projectionReadContract";

const DEV_PROJECTION_URL = "/__phobos/projection";
const DEV_PROVIDERS_URL = "/__phobos/providers";
const DEV_SUBMIT_URL = "/__phobos/submit";
const DEV_OPERATOR_CHAT_ARTIFACTS_URL = "/__phobos/operator-chat-artifacts";
const DEV_OPERATOR_TURN_CONTROL_URL = "/__phobos/operator-turn-control";
const DEV_STEER_URL = "/__phobos/chat-steer";
const DEV_CHAT_PINS_URL = "/__phobos/chat-pins";
const DEV_INTERFACE_ARTIFACT_URL = "/__phobos/interface-artifact";
const DEV_ARTIFACT_STREAM_URL = "/__phobos/artifact-stream";

export function hasProjectionBridge(): boolean {
  return Boolean(window.phobosTransport?.projectionRead) || import.meta.env.DEV;
}

export function projectionTargetLabel(): string {
  return "active client projection";
}

export async function readProjection<T = unknown, M extends ProjectionReadMethod = ProjectionReadMethod>(
  method: M,
  params?: Record<string, unknown>,
): Promise<T> {
  const request = {
    contract_version: PROJECTION_READ_CONTRACT_VERSION,
    method,
    ...(params === undefined ? {} : { params }),
  };
  const bridge = window.phobosTransport;
  if (bridge?.projectionRead) {
    return bridge.projectionRead(request) as Promise<T>;
  }
  if (import.meta.env.DEV) {
    const response = await fetch(DEV_PROJECTION_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(typeof payload?.error === "string" ? payload.error : `projection read failed: ${response.status}`);
    }
    return payload as T;
  }
  throw new Error("no projection reader is available: open the desktop app or the dev server");
}

export function canMutateScheduledInterfaces(): boolean {
  return Boolean(window.phobosTransport?.mutateScheduledInterface);
}

export async function mutateScheduledInterface(request: PhobosScheduledMutationRequest): Promise<PhobosScheduledMutationOutcome> {
  const host = window.phobosTransport;
  if (!host?.mutateScheduledInterface) throw new Error("Scheduled interface editing is available only in the live desktop client.");
  return host.mutateScheduledInterface(request);
}

export async function mutateApplicationPrivateConfiguration(
  request: PhobosApplicationPrivateConfigurationMutation,
): Promise<PhobosApplicationPrivateConfigurationOutcome> {
  const host = window.phobosTransport;
  if (!host?.mutateApplicationPrivateConfiguration) {
    throw new Error("Application configuration is available only in the live desktop client.");
  }
  return host.mutateApplicationPrivateConfiguration(request);
}

export function canConnectApplications(): boolean {
  return Boolean(window.phobosTransport?.applicationConnectionProbe);
}

export async function probeApplicationConnection(applicationId: string): Promise<PhobosApplicationConnectionProbe> {
  const host = window.phobosTransport;
  if (!host?.applicationConnectionProbe) throw new Error("Connecting applications is available only in the desktop client.");
  return host.applicationConnectionProbe({ applicationId });
}

export async function connectApplicationInterface(request: PhobosApplicationConnectionRequest): Promise<PhobosApplicationConnectionState> {
  const host = window.phobosTransport;
  if (!host?.applicationConnectionConnect) throw new Error("Connecting applications is available only in the desktop client.");
  return host.applicationConnectionConnect(request);
}

export async function cancelApplicationConnection(operationId: string): Promise<{ cancelled: boolean }> {
  const host = window.phobosTransport;
  if (!host?.applicationConnectionCancel) return { cancelled: false };
  return host.applicationConnectionCancel({ operationId });
}

export async function disconnectApplicationInterface(applicationId: string, interfaceId: string): Promise<PhobosApplicationConnectionState> {
  const host = window.phobosTransport;
  if (!host?.applicationConnectionDisconnect) throw new Error("Connecting applications is available only in the desktop client.");
  return host.applicationConnectionDisconnect({ applicationId, interfaceId });
}

export function onApplicationConnectionProgress(listener: (progress: PhobosApplicationConnectionProgress) => void): () => void {
  return window.phobosTransport?.onApplicationConnectionProgress?.(listener) ?? (() => {});
}

export async function mutatePhobosOsWorkspace(request: PhobosOsWorkspaceMutationRequest): Promise<PhobosOsWorkspaceMutationOutcome> {
  const host = window.phobosTransport;
  if (!host?.mutatePhobosOsWorkspace) throw new Error("Phobos OS workspace editing is available only in the live desktop client.");
  return host.mutatePhobosOsWorkspace(request);
}

export async function saveSetupFile(request: { text: string; suggestedName: string }): Promise<{ saved: false } | { saved: true; name: string }> {
  const host = window.phobosTransport;
  if (!host?.saveSetupFile) throw new Error("Exporting a setup is available only in the live desktop client.");
  return host.saveSetupFile(request);
}

export async function openSetupFile(): Promise<{ opened: false } | { opened: true; name: string; text: string }> {
  const host = window.phobosTransport;
  if (!host?.openSetupFile) throw new Error("Importing a setup is available only in the live desktop client.");
  return host.openSetupFile();
}

export async function readWorkspaceSetupState(): Promise<PhobosWorkspaceSetupState> {
  const host = window.phobosTransport;
  if (!host?.workspaceSetupState) throw new Error("Workspace setup state is available only in the live desktop client.");
  return host.workspaceSetupState();
}

export async function readClientSetup(operationId: string): Promise<PhobosClientSetupState | null> {
  const host = window.phobosTransport;
  if (!host?.clientSetupRead) throw new Error("Client setup state is available only in the live desktop client.");
  return host.clientSetupRead({ operationId });
}

export async function readCurrentClientSetup(): Promise<PhobosClientSetupState | null> {
  const host = window.phobosTransport;
  if (!host?.clientSetupReadCurrent) throw new Error("Current client setup state is available only in the live desktop client.");
  return host.clientSetupReadCurrent();
}

export async function beginClientSetup(request: PhobosClientSetupBeginRequest): Promise<PhobosClientSetupState> {
  const host = window.phobosTransport;
  if (!host?.clientSetupBegin) throw new Error("Client setup is available only in the live desktop client.");
  return host.clientSetupBegin(request);
}

export async function resumeClientSetup(operationId: string, options: { allowSignIn?: boolean } = {}): Promise<PhobosClientSetupState> {
  const host = window.phobosTransport;
  if (!host?.clientSetupResume) throw new Error("Client setup is available only in the live desktop client.");
  return host.clientSetupResume({ operationId, ...(options.allowSignIn ? {} : { stopBefore: "provider" as const }) });
}

export function onApplicationLifecycleProgress(listener: (progress: PhobosApplicationLifecycleProgress) => void): () => void {
  return window.phobosTransport?.onApplicationLifecycleProgress?.(listener) ?? (() => {});
}

export function onWorkspaceSetupProgress(listener: (progress: PhobosWorkspaceSetupProgress) => void): () => void {
  return window.phobosTransport?.onWorkspaceSetupProgress?.(listener) ?? (() => {});
}

export function onClientSetupProgress(listener: (progress: PhobosClientSetupProgress) => void): () => void {
  return window.phobosTransport?.onClientSetupProgress?.(listener) ?? (() => {});
}

export async function readRuntimeProviderInterfaces(): Promise<PhobosProviderInterfacesResponse> {
  const bridge = window.phobosTransport;
  if (bridge?.providerInterfaces) {
    return bridge.providerInterfaces();
  }
  if (import.meta.env.DEV) {
    const httpResponse = await fetch(DEV_PROVIDERS_URL);
    const payload = await httpResponse.json();
    if (!httpResponse.ok) {
      throw new Error(typeof payload?.error === "string" ? payload.error : `provider read failed: ${httpResponse.status}`);
    }
    return payload as PhobosProviderInterfacesResponse;
  }
  return { repoRoot: null, providers: [], error: "no projection reader is available" };
}

export async function readProviderInterfaceRateLimits(): Promise<Map<string, PhobosProviderRateLimits>> {
  const status = await readProjection<{ providers?: unknown[] }>("projection.operator.providers.status");
  return new Map(
    (status.providers ?? []).flatMap((row) => {
      const normalized = normalizeProviderRateLimits(row);
      return normalized ? [[normalized.providerInterfaceId, normalized.rateLimits] as const] : [];
    }),
  );
}

export async function readProviderInterfaces(): Promise<PhobosProviderInterfacesResponse> {
  const response = await readRuntimeProviderInterfaces();
  if (response.error || response.providers.length === 0) return response;
  try {
    const byProvider = await readProviderInterfaceRateLimits();
    return {
      ...response,
      providers: response.providers.map((provider) => ({
        ...provider,
        rateLimits: byProvider.get(provider.id),
      })),
    };
  } catch (failure) {
    return {
      ...response,
      error: response.error ?? `Provider usage projection unavailable: ${failure instanceof Error ? failure.message : String(failure)}`,
    };
  }
}

function normalizeProviderRateLimits(value: unknown): { providerInterfaceId: string; rateLimits: PhobosProviderRateLimits } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const providerInterfaceId = stringField(row.provider_interface_id);
  const snapshot = objectField(row.rate_limits);
  if (!providerInterfaceId || !snapshot) return null;
  return {
    providerInterfaceId,
    rateLimits: {
      observedAtMs: numberField(row.observed_at_ms),
      movementSeq: numberField(row.movement_seq),
      runId: stringField(row.run_id),
      limitId: stringField(snapshot.limitId ?? snapshot.limit_id),
      limitName: stringField(snapshot.limitName ?? snapshot.limit_name),
      primary: normalizeRateLimitWindow(snapshot.primary),
      secondary: normalizeRateLimitWindow(snapshot.secondary),
      credits: normalizeProviderCredits(snapshot.credits),
      individualLimit: normalizeIndividualLimit(snapshot.individualLimit ?? snapshot.individual_limit),
      planType: stringField(snapshot.planType ?? snapshot.plan_type),
      reachedType: stringField(snapshot.rateLimitReachedType ?? snapshot.rate_limit_reached_type),
    },
  };
}

function normalizeRateLimitWindow(value: unknown): PhobosProviderRateLimitWindow | null {
  const row = objectField(value);
  if (!row) return null;
  return {
    usedPercent: numberField(row.usedPercent ?? row.used_percent),
    windowDurationMins: nullableNumberField(row.windowDurationMins ?? row.window_duration_mins),
    resetsAt: nullableNumberField(row.resetsAt ?? row.resets_at),
  };
}

function normalizeProviderCredits(value: unknown): PhobosProviderRateLimits["credits"] {
  const row = objectField(value);
  if (!row) return null;
  return {
    hasCredits: row.hasCredits === true || row.has_credits === true,
    unlimited: row.unlimited === true,
    balance: nullableStringField(row.balance),
  };
}

function normalizeIndividualLimit(value: unknown): PhobosProviderRateLimits["individualLimit"] {
  const row = objectField(value);
  if (!row) return null;
  return {
    limit: stringField(row.limit),
    used: stringField(row.used),
    remainingPercent: numberField(row.remainingPercent ?? row.remaining_percent),
    resetsAt: numberField(row.resetsAt ?? row.resets_at),
  };
}

function objectField(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableStringField(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nullableNumberField(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function canSubmitOperatorTurn(): boolean {
  return Boolean(window.phobosTransport?.submitChatTurn) || import.meta.env.DEV;
}

export async function submitOperatorTurn(request: PhobosChatTurnRequest): Promise<PhobosChatTurnResponse> {
  const bridge = window.phobosTransport;
  if (bridge?.submitChatTurn) {
    return bridge.submitChatTurn(request);
  }
  if (import.meta.env.DEV) {
    if (request.attachments.length) throw new Error("Attachment submission requires the desktop attachment staging host.");
    const response = await fetch(DEV_SUBMIT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endpoint: request.endpoint,
        timeoutMs: request.timeoutMs,
        messageId: request.messageId,
        recoverPreparedMessage: request.recoverPreparedMessage,
        runId: request.runId,
        providerInterfaceId: request.providerInterfaceId,
        providerModel: request.providerModel,
        reasoningEffort: request.reasoningEffort,
        serviceTier: request.serviceTier,
        eeId: request.eeId,
        workerInterfaceId: request.workerInterfaceId,
        doorHostSlots: request.doorHostSlots,
        externalInputs: request.externalInputs,
        externalRelays: request.externalRelays,
        modelOutputs: request.modelOutputs,
        contextArtifactBindings: request.contextArtifactBindings,
        selectedWorkerEnvironmentKinds: request.selectedWorkerEnvironmentKinds,
        selectedTools: request.selectedTools,
        clientSurfaceRole: request.clientSurfaceRole,
        clientContext: request.clientContext,
        continuation: request.continuation,
        text: request.text,
        attachments: [],
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(typeof payload?.error === "string" ? payload.error : `submit failed: ${response.status}`);
    }
    return payload as PhobosChatTurnResponse;
  }
  throw new Error("no local writer is available for the operator turn: open the desktop app or the dev server");
}

export async function readOperatorChatArtifacts(
  request: PhobosOperatorChatArtifactsRequest,
): Promise<PhobosOperatorChatArtifactsResponse> {
  const bridge = window.phobosTransport;
  if (bridge?.readOperatorChatArtifacts) {
    return bridge.readOperatorChatArtifacts(request);
  }
  if (import.meta.env.DEV) {
    const response = await fetch(DEV_OPERATOR_CHAT_ARTIFACTS_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(
        typeof payload?.error === "string"
          ? payload.error
          : `operator chat artifact read failed: ${response.status}`,
      );
    }
    return payload as PhobosOperatorChatArtifactsResponse;
  }
  throw new Error("no exact operator chat artifact reader is available");
}

export async function submitOperatorTurnControl(
  request: PhobosOperatorTurnControlRequest,
): Promise<PhobosOperatorTurnControlResponse> {
  if (window.phobosTransport?.submitOperatorTurnControl) {
    return window.phobosTransport.submitOperatorTurnControl(request);
  }
  if (!import.meta.env.DEV) return { deliveryError: { stage: "not-sent", message: "No local operator turn-control writer is available." } };
  const response = await fetch(DEV_OPERATOR_TURN_CONTROL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await response.json();
  if (!response.ok) {
    return { deliveryError: {
      stage: [401, 403, 405].includes(response.status) ? "not-sent" : "outcome-unknown",
      message: typeof payload?.error === "string" ? payload.error : `operator turn control failed: ${response.status}`,
    } };
  }
  return payload as PhobosOperatorTurnControlResponse;
}

export function canSubmitOperatorSteer(): boolean {
  return Boolean(window.phobosTransport?.submitChatSteer) || import.meta.env.DEV;
}

export async function submitOperatorSteer(request: PhobosChatSteerRequest): Promise<PhobosChatSteerResponse> {
  const host = window.phobosTransport;
  if (host?.submitChatSteer) return host.submitChatSteer(request);
  if (!import.meta.env.DEV) throw new Error("No local writer is available for an in-flight operator message.");
  if (request.attachments.length) throw new Error("Attachment submission requires the desktop attachment staging host.");
  const response = await fetch(DEV_STEER_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      runId: request.runId,
      messageId: request.messageId,
      recoverPreparedMessage: request.recoverPreparedMessage,
      providerInterfaceId: request.providerInterfaceId,
      providerModel: request.providerModel,
      eeId: request.eeId,
      workerInterfaceId: request.workerInterfaceId,
      clientSurfaceRole: request.clientSurfaceRole,
      clientContext: request.clientContext,
      endpoint: request.endpoint,
      text: request.text,
      timeoutMs: request.timeoutMs,
      attachments: [],
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : `steer failed: ${response.status}`);
  }
  return payload as PhobosChatSteerResponse;
}

export async function updateOperatorChatPins(request: PhobosChatPinsRequest): Promise<PhobosChatPinsResponse> {
  const bridge = window.phobosTransport;
  if (bridge?.updateChatPins) return bridge.updateChatPins(request);
  if (!import.meta.env.DEV) throw new Error("no local operator chat editor is available");
  const response = await fetch(DEV_CHAT_PINS_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : `pin update failed: ${response.status}`);
  }
  return payload as PhobosChatPinsResponse;
}

export async function refreshProviderModels(
  request: PhobosProviderModelsRefreshRequest,
): Promise<PhobosProviderModelsRefreshResponse> {
  const host = window.phobosTransport;
  if (!host?.refreshProviderModels) {
    throw new Error("Provider model refresh is available only in the live desktop client.");
  }
  return host.refreshProviderModels(request);
}

export async function submitInterfaceArtifact(request: PhobosInterfaceArtifactRequest): Promise<PhobosInterfaceArtifactResponse> {
  if (window.phobosTransport?.submitInterfaceArtifact) {
    return window.phobosTransport.submitInterfaceArtifact(request);
  }
  if (!import.meta.env.DEV) throw new Error("No interface artifact writer is available.");
  const response = await fetch(DEV_INTERFACE_ARTIFACT_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : `interface artifact submit failed: ${response.status}`);
  }
  return payload as PhobosInterfaceArtifactResponse;
}

export async function transcribeDictation(request: PhobosDictationRequest): Promise<PhobosDictationResponse> {
  const bridge = window.phobosTransport;
  if (!bridge?.transcribeDictation) throw new Error("Dictation requires the Phobos desktop interface host.");
  return bridge.transcribeDictation(request);
}

export async function beginInterfaceArtifactStream(request: PhobosArtifactStreamBeginRequest): Promise<PhobosArtifactStreamHandle> {
  if (window.phobosTransport?.beginInterfaceArtifactStream) return window.phobosTransport.beginInterfaceArtifactStream(request);
  return artifactStreamRequest<PhobosArtifactStreamHandle>("begin", request);
}

export async function appendInterfaceArtifactStream(request: PhobosArtifactStreamAppendRequest): Promise<PhobosArtifactStreamProgress> {
  if (window.phobosTransport?.appendInterfaceArtifactStream) return window.phobosTransport.appendInterfaceArtifactStream(request);
  return artifactStreamRequest<PhobosArtifactStreamProgress>("append", {
    streamId: request.streamId,
    base64: bytesToBase64(request.bytes),
  });
}

export async function finalizeInterfaceArtifactStream(request: PhobosArtifactStreamFinalizeRequest): Promise<PhobosArtifactStreamOutcome> {
  if (window.phobosTransport?.finalizeInterfaceArtifactStream) return window.phobosTransport.finalizeInterfaceArtifactStream(request);
  return artifactStreamRequest<PhobosArtifactStreamOutcome>("finalize", request);
}

export async function abortInterfaceArtifactStream(request: PhobosArtifactStreamAbortRequest): Promise<PhobosArtifactStreamAbortOutcome> {
  if (window.phobosTransport?.abortInterfaceArtifactStream) return window.phobosTransport.abortInterfaceArtifactStream(request);
  return artifactStreamRequest<PhobosArtifactStreamAbortOutcome>("abort", request);
}

async function artifactStreamRequest<T>(operation: "begin" | "append" | "finalize" | "abort", request: unknown): Promise<T> {
  if (!import.meta.env.DEV) throw new Error("No interface artifact stream transport is available.");
  const response = await fetch(`${DEV_ARTIFACT_STREAM_URL}/${operation}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `artifact stream ${operation} failed: ${response.status}`);
  return payload as T;
}


function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const CHUNK = 0x8000;
  for (let index = 0; index < view.length; index += CHUNK) {
    binary += String.fromCharCode(...view.subarray(index, index + CHUNK));
  }
  return btoa(binary);
}

export function formatProjectionError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}
