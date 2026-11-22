import type { PhobosTerminalOpenRequest, PhobosTerminalResizeRequest, PhobosTerminalSnapshot } from "../../electron";
import type { PhobosTerminalSession, PhobosTerminalSessionHandlers } from "./PhobosTerminal";

export type ShellLaunch = Omit<PhobosTerminalOpenRequest, "cols" | "rows">;

type HostedShell = {
  open(launch: ShellLaunch, dimensions: PhobosTerminalResizeRequest): Promise<PhobosTerminalSnapshot>;
  resize(terminalId: string, sessionId: string, dimensions: PhobosTerminalResizeRequest): Promise<PhobosTerminalSnapshot>;
  write(terminalId: string, sessionId: string, data: string): Promise<PhobosTerminalSnapshot>;
};

export function createShellSession(resolveLaunch: () => ShellLaunch | null): PhobosTerminalSession {
  const bridge = window.phobosTransport;
  return createHostedShellSession(resolveLaunch, {
    open(launch, dimensions) {
      if (!bridge?.openTerminal) return Promise.reject(new Error("The terminal is only available inside the desktop app"));
      return bridge.openTerminal({ ...launch, ...dimensions });
    },
    resize(terminalId, sessionId, dimensions) {
      if (!bridge?.resizeTerminal) return Promise.reject(new Error("The terminal is only available inside the desktop app"));
      return bridge.resizeTerminal(terminalId, sessionId, dimensions);
    },
    write(terminalId, sessionId, data) {
      if (!bridge?.writeTerminal) return Promise.reject(new Error("The terminal is only available inside the desktop app"));
      return bridge.writeTerminal(terminalId, sessionId, data);
    },
  });
}

export function createLaunchShellSession(): PhobosTerminalSession {
  const bridge = window.phobosTransport;
  return createHostedShellSession(() => ({ terminalId: "launch" }), {
    open(_launch, dimensions) {
      if (!bridge?.openLaunchTerminal) return Promise.reject(new Error("The launch terminal is unavailable"));
      return bridge.openLaunchTerminal(dimensions);
    },
    resize(_terminalId, sessionId, dimensions) {
      if (!bridge?.resizeLaunchTerminal) return Promise.reject(new Error("The launch terminal is unavailable"));
      return bridge.resizeLaunchTerminal(sessionId, dimensions);
    },
    write(_terminalId, sessionId, data) {
      if (!bridge?.writeLaunchTerminal) return Promise.reject(new Error("The launch terminal is unavailable"));
      return bridge.writeLaunchTerminal(sessionId, data);
    },
  });
}

function createHostedShellSession(resolveLaunch: () => ShellLaunch | null, host: HostedShell): PhobosTerminalSession {
  const bridge = window.phobosTransport;
  let terminalId = "";
  let sessionId = "";
  let shellExited = false;
  let reopening = false;
  let dimensions = { cols: 100, rows: 32 };
  let handlers: PhobosTerminalSessionHandlers | null = null;

  const reportFailure = (error: unknown) => {
    handlers?.onData(`\r\n\x1b[31m${error instanceof Error ? error.message : String(error)}\x1b[0m\r\n`);
  };
  const openShell = async () => {
    const launch = resolveLaunch();
    if (!launch) throw new Error("The terminal launch parameters are not resolved yet");
    const opened = await host.open(launch, dimensions);
    terminalId = opened.terminalId;
    sessionId = opened.sessionId;
    shellExited = !opened.running;
    handlers?.onInitLog(opened.transcript);
  };

  return {
    async open(next) {
      dimensions = next;
      await openShell();
    },
    write(data) {
      if (!sessionId || reopening) return;
      if (shellExited) {
        if (!data.includes("\r") && !data.includes("\n")) return;
        reopening = true;
        void openShell().catch(reportFailure).finally(() => { reopening = false; });
        return;
      }
      void host.write(terminalId, sessionId, data).catch(reportFailure);
    },
    resize(next) {
      dimensions = next;
      if (!sessionId || shellExited) return;
      void host.resize(terminalId, sessionId, next).catch(() => undefined);
    },
    subscribe(next) {
      handlers = next;
      const unsubscribeData = bridge?.onTerminalData((event) => {
        if (event.terminalId === terminalId && event.sessionId === sessionId) next.onData(event.data);
      });
      const unsubscribeExit = bridge?.onTerminalExit((event) => {
        if (event.terminalId !== terminalId || event.sessionId !== sessionId) return;
        shellExited = true;
        const signal = event.signal == null ? "" : ` (signal ${event.signal})`;
        const status = event.error || `Shell exited with status ${event.exitCode ?? "unknown"}${signal}`;
        next.onData(`\r\n\x1b[31m${status}\x1b[0m\r\n\x1b[2mPress Enter to open a new shell.\x1b[0m\r\n`);
      });
      return () => {
        if (handlers === next) handlers = null;
        unsubscribeData?.();
        unsubscribeExit?.();
      };
    },
  };
}
