import { useCallback, useEffect, useState } from "react";
import type { PhobosHomeStorageHealth, PhobosInterfaceFailure, PhobosRuntimeHostState } from "./electron";

export type RuntimeClientState = PhobosRuntimeHostState & {
  available: boolean;
};

const EMPTY_STATE: RuntimeClientState = {
  phase: "probing",
  ready: false,
  available: true,
  ownership: "none",
  pid: null,
  home: "",
  sourceRegistry: "",
  runtimeBinary: "",
  repoRoot: "",
  launchCwd: "",
  launchCommand: "",
  launchEnv: {},
  endpoint: "",
  error: null,
  storageHealth: null,
  interfaceFailures: [],
  updatedAtMs: 0,
};

export function useRuntimeHost() {
  const [state, setState] = useState<RuntimeClientState>(EMPTY_STATE);

  const applyHostState = useCallback((next: PhobosRuntimeHostState) => {
    setState((current) => ({ ...current, ...next, available: true }));
  }, []);

  const refreshObservation = useCallback(async () => {
    const bridge = window.phobosTransport;
    if (!bridge?.bootStatus) {
      setState({
        ...EMPTY_STATE,
        phase: "external_preview",
        ready: true,
        available: false,
      });
      return;
    }
    try {
      applyHostState(await bridge.bootStatus());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const accessRequired = /locked or expired|profile lab|primary Phobos window/i.test(message);
      setState((current) => ({
        ...current,
        phase: accessRequired ? "access_required" : "degraded",
        ready: false,
        available: true,
        error: message,
        updatedAtMs: Date.now(),
      }));
    }
  }, [applyHostState]);

  useEffect(() => {
    const bridge = window.phobosTransport;
    if (!bridge?.bootStatus) {
      setState({ ...EMPTY_STATE, phase: "external_preview", ready: true, available: false });
      return;
    }
    const unsubscribe = bridge.onRuntimeHostState?.(applyHostState);
    void refreshObservation();
    return () => unsubscribe?.();
  }, [applyHostState, refreshObservation]);

  return state;
}

export type RuntimeHostView = ReturnType<typeof useRuntimeHost>;

const EMPTY_HOME_HEALTH = { storageHealth: null, interfaceFailures: [] as PhobosInterfaceFailure[] };

export function useRuntimeHomeHealth(home: string, enabled: boolean): Pick<PhobosRuntimeHostState, "storageHealth" | "interfaceFailures"> {
  const [observation, setObservation] = useState<{ home: string; storageHealth: PhobosHomeStorageHealth | null; interfaceFailures: PhobosInterfaceFailure[] } | null>(null);
  useEffect(() => {
    const bridge = window.phobosTransport;
    if (!enabled || !home || !bridge?.bootStatus) return;
    let active = true;
    let observedEvent = false;
    const apply = (state: PhobosRuntimeHostState) => {
      if (active && state.home === home) setObservation({ home, storageHealth: state.storageHealth, interfaceFailures: state.interfaceFailures });
    };
    const unsubscribe = bridge.onRuntimeHostState?.((state) => { observedEvent = true; apply(state); });
    void bridge.bootStatus().then((state) => { if (!observedEvent) apply(state); }).catch(() => undefined);
    return () => { active = false; unsubscribe?.(); };
  }, [home, enabled]);
  return enabled && observation?.home === home ? observation : EMPTY_HOME_HEALTH;
}
