import type {
  ClientExtensionActionOutcome,
  ClientExtensionActionRequest,
  ClientExtensionCredentialCheck,
  ClientExtensionCredentialUpdate,
  ClientExtensionLifecycleOutcome,
  ClientExtensionLifecycleRequest,
  ClientExtensionMutation,
  ClientExtensionStoreSnapshot,
} from "./types";

export async function readClientExtensions(): Promise<ClientExtensionStoreSnapshot> {
  const transport = window.phobosTransport?.clientExtensions;
  if (!transport) throw new Error("Client extension catalog requires the desktop client.");
  return transport();
}

export async function mutateClientExtension(request: ClientExtensionMutation): Promise<ClientExtensionStoreSnapshot> {
  const transport = window.phobosTransport?.mutateClientExtension;
  if (!transport) throw new Error("Client extension mutation requires the desktop client.");
  return transport(request);
}

export async function setClientExtensionCredential(request: ClientExtensionCredentialUpdate): Promise<ClientExtensionStoreSnapshot> {
  const transport = window.phobosTransport?.setClientExtensionCredential;
  if (!transport) throw new Error("Client extension credentials require the desktop client.");
  return transport(request);
}

export async function checkClientExtensionCredential(request: { id: string; sourceId: string }): Promise<ClientExtensionCredentialCheck> {
  const transport = window.phobosTransport?.checkClientExtensionCredential;
  if (!transport) throw new Error("Client extension credentials require the desktop client.");
  return transport(request);
}

export async function applyClientExtensionLifecycle(
  request: ClientExtensionLifecycleRequest,
): Promise<ClientExtensionLifecycleOutcome> {
  const transport = window.phobosTransport?.applyClientExtensionLifecycle;
  if (!transport) throw new Error("Client extension lifecycle requires the desktop client.");
  return transport(request);
}

export async function revealClientExtensions(): Promise<{ opened: true; path: string }> {
  const transport = window.phobosTransport?.revealClientExtensions;
  if (!transport) throw new Error("Client extension folder requires the desktop client.");
  return transport();
}

export async function readClientExtensionFilesystemSource(request: {
  path: string;
  read: "text" | "json" | "directory";
}): Promise<unknown> {
  const transport = window.phobosTransport?.readClientExtensionFilesystemSource;
  if (!transport) throw new Error("Client extension filesystem sources require the desktop client.");
  return transport(request);
}

export async function runClientExtensionAction(
  request: ClientExtensionActionRequest,
): Promise<ClientExtensionActionOutcome> {
  const transport = window.phobosTransport?.runClientExtensionAction;
  if (!transport) throw new Error("Client extension actions require the desktop client.");
  return transport(request);
}

export function subscribeClientExtensions(listener: () => void): () => void {
  return window.phobosTransport?.onClientExtensionsChanged?.(listener) ?? (() => {});
}
