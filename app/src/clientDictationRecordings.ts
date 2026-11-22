import type { PhobosDictationLocalResult, PhobosDictationRequest } from "./electron";

export const DICTATION_RECORDINGS_CHANGED = "phobos:dictation-recordings-changed";

export async function dictationResult<T>(result: Promise<PhobosDictationLocalResult<T>>): Promise<T> {
  let outcome: PhobosDictationLocalResult<T>;
  try { outcome = await result; }
  catch { throw new Error("Dictation is unavailable. Reopen Phobos and try again."); }
  if (!outcome.ok) throw Object.assign(new Error(outcome.error.message), { code: outcome.error.code });
  return outcome.value;
}

export function dictationHost() {
  if (!window.phobosTransport?.readDictationRecordings) throw new Error("Dictation recordings require the desktop app.");
  return window.phobosTransport;
}

export function dictationAudioRequest(bytes: ArrayBuffer, durationMs: number): PhobosDictationRequest {
  return { attemptId: crypto.randomUUID(), bytes, durationMs, mediaType: "audio/wav", sampleRateHz: 24_000, provider: "codex", timeoutMs: 120_000 };
}

export function notifyDictationRecordingsChanged() {
  window.dispatchEvent(new CustomEvent(DICTATION_RECORDINGS_CHANGED));
}

export function dictationAudioBlob(bytes: Uint8Array): Blob {
  return new Blob([new Uint8Array(bytes).buffer], { type: "audio/wav" });
}

export function dictationMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Couldn't access this dictation. Try again.";
}
