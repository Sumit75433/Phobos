import type {
  PhobosAdministratorAccessUpdate,
  PhobosClientAccessDetails,
  PhobosClientAccessStatus,
  PhobosClientLabAccess,
  PhobosTouchIdStatus,
} from "./electron";

const ACCESS_URL = "/__phobos/access";

export async function readClientAccessStatus(): Promise<PhobosClientAccessStatus> {
  if (window.phobosTransport?.accessStatus) return window.phobosTransport.accessStatus();
  return request("status", "GET");
}

export async function configureClientAccess(password: string): Promise<PhobosClientAccessStatus> {
  if (window.phobosTransport?.configureAccess) return window.phobosTransport.configureAccess(password);
  return request("configure", "POST", { password });
}

export async function unlockClientAccess(password: string): Promise<PhobosClientAccessStatus> {
  if (window.phobosTransport?.unlockAccess) return window.phobosTransport.unlockAccess(password);
  return request("unlock", "POST", { password });
}

export async function readTouchIdStatus(): Promise<PhobosTouchIdStatus> {
  if (window.phobosTransport?.touchIdStatus) return window.phobosTransport.touchIdStatus();
  return { available: false, enrolled: false, prompted: false };
}

export async function setTouchIdEnabled(enabled: boolean): Promise<PhobosTouchIdStatus> {
  if (window.phobosTransport?.setTouchIdEnabled) return window.phobosTransport.setTouchIdEnabled(enabled);
  throw new Error("Touch ID is unavailable outside the Phobos desktop app.");
}

export async function unlockWithTouchId(): Promise<PhobosClientAccessStatus> {
  if (window.phobosTransport?.unlockWithTouchId) return window.phobosTransport.unlockWithTouchId();
  throw new Error("Touch ID is unavailable outside the Phobos desktop app.");
}

export async function lockClientAccess(): Promise<PhobosClientAccessStatus> {
  if (window.phobosTransport?.lockAccess) return window.phobosTransport.lockAccess();
  return request("lock", "POST", {});
}

export async function readClientLabAccess(): Promise<PhobosClientLabAccess> {
  if (window.phobosTransport?.labAccess) return window.phobosTransport.labAccess();
  return labRequest("lab-status", "GET");
}

export async function updateClientLabAccess(password: string): Promise<PhobosClientLabAccess> {
  if (window.phobosTransport?.updateLabAccess) return window.phobosTransport.updateLabAccess(password);
  return labRequest("lab-update", "POST", { password });
}

export async function readClientAccessDetails(): Promise<PhobosClientAccessDetails> {
  if (window.phobosTransport?.accessDetails) return window.phobosTransport.accessDetails();
  return detailsRequest("details", "GET");
}

export async function updateClientAdministratorAccess(
  request: PhobosAdministratorAccessUpdate,
): Promise<PhobosClientAccessDetails> {
  if (window.phobosTransport?.updateAdministratorAccess) {
    return window.phobosTransport.updateAdministratorAccess(request);
  }
  return detailsRequest("administrator-update", "POST", request);
}

async function request(
  operation: "status" | "configure" | "unlock" | "lock",
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<PhobosClientAccessStatus> {
  if (!import.meta.env.DEV) throw new Error("Client access host is unavailable");
  const response = await fetch(`${ACCESS_URL}/${operation}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `Client access failed: HTTP ${response.status}`);
  return payload as PhobosClientAccessStatus;
}

async function labRequest(
  operation: "lab-status" | "lab-update",
  method: "GET" | "POST",
  body?: Record<string, unknown>,
): Promise<PhobosClientLabAccess> {
  if (!import.meta.env.DEV) throw new Error("Client access host is unavailable");
  const response = await fetch(`${ACCESS_URL}/${operation}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `Client access failed: HTTP ${response.status}`);
  return payload as PhobosClientLabAccess;
}

async function detailsRequest(
  operation: "details" | "administrator-update",
  method: "GET" | "POST",
  body?: PhobosAdministratorAccessUpdate,
): Promise<PhobosClientAccessDetails> {
  if (!import.meta.env.DEV) throw new Error("Client access host is unavailable");
  const response = await fetch(`${ACCESS_URL}/${operation}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : `Client access failed: HTTP ${response.status}`);
  return payload as PhobosClientAccessDetails;
}
