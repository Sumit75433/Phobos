import type {
  PhobosCodexUsageReadRequest,
  PhobosCodexUsageSnapshot,
} from "./electron";

export function hasCodexUsageBridge(): boolean {
  return typeof window.phobosTransport?.readCodexUsage === "function";
}

export async function readCodexUsage(
  request: PhobosCodexUsageReadRequest,
): Promise<PhobosCodexUsageSnapshot> {
  const read = window.phobosTransport?.readCodexUsage;
  if (!read) throw new Error("Codex usage is available in the Phobos desktop app");
  return read(request);
}
