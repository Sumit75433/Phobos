import { useEffect, useMemo, useState } from "react";
import { useShouldReduceMotion } from "../../appearance";
import { PhobosTerminal } from "../terminal/PhobosTerminal";
import { createLaunchShellSession } from "../terminal/shellSession";
import { PhobosLoadingLogo } from "../PhobosLoadingLogo";

export function LaunchTerminal({
  greeting,
  leaving,
  onExited,
}: {
  greeting: boolean;
  leaving: boolean;
  onExited: () => void;
}) {
  const reduceMotion = useShouldReduceMotion();
  const [phase, setPhase] = useState<"greeting" | "terminal">(greeting ? "greeting" : "terminal");
  const session = useMemo(() => createLaunchShellSession(), []);

  useEffect(() => {
    if (phase !== "greeting") return;
    const timer = setTimeout(() => setPhase("terminal"), reduceMotion ? 700 : 1700);
    return () => clearTimeout(timer);
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (!leaving || phase === "greeting") return;
    const timer = setTimeout(onExited, reduceMotion ? 0 : 480);
    return () => clearTimeout(timer);
  }, [leaving, onExited, phase, reduceMotion]);

  const exitVisible = leaving && phase !== "greeting";

  return (
    <main aria-label="Phobos launch" className="launch-scene" data-leaving={exitVisible || undefined} data-phase={phase}>
      <div className="launch-scene-terminal">
        <PhobosTerminal id="terminal-panel-launch" session={session} />
      </div>
      {greeting ? (
        <div aria-hidden={phase !== "greeting"} className="launch-scene-greeting">
          <PhobosLoadingLogo />
        </div>
      ) : null}
      <div className="launch-scene-drag" />
    </main>
  );
}
