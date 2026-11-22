import type { ClientSurfaceDocumentChange, ClientSurfaceDocumentSnapshot } from "./types";

export async function readClientSurfaceDocuments(): Promise<ClientSurfaceDocumentSnapshot> {
  if (window.phobosTransport?.clientSurfaceDocuments) {
    return window.phobosTransport.clientSurfaceDocuments();
  }
  if (!import.meta.env.DEV) throw new Error("client surface documents require the desktop app or development server");
  const response = await fetch("/__phobos/client-surfaces", { cache: "no-store" });
  if (!response.ok) throw new Error(`client surface read failed: HTTP ${response.status}`);
  return response.json() as Promise<ClientSurfaceDocumentSnapshot>;
}

export function subscribeClientSurfaceDocuments(
  listener: (change: ClientSurfaceDocumentChange) => void,
): () => void {
  if (window.phobosTransport?.onClientSurfaceDocumentsChanged) {
    return window.phobosTransport.onClientSurfaceDocumentsChanged(listener);
  }
  if (!import.meta.env.DEV) return () => {};
  const source = new EventSource("/__phobos/client-surface-events");
  source.onmessage = (event) => {
    try {
      const value = JSON.parse(event.data) as ClientSurfaceDocumentChange;
      if (typeof value.generation === "number") listener(value);
    } catch {
      listener({ generation: Date.now() });
    }
  };
  return () => source.close();
}
