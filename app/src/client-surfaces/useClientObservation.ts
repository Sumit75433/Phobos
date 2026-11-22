import { useEffect, useMemo, useState } from "react";
import type { PhobosClientContext } from "../electron";
import { clientObservationContext } from "./clientObservation";
import { homeWidgetDismissalsKey, homeWidgetHiddenKey } from "./homeWidgetControls";

export function useClientObservation(options: Parameters<typeof clientObservationContext>[0]): PhobosClientContext {
  const [, changed] = useState(0);
  useEffect(() => {
    const hidden = homeWidgetHiddenKey(options.accessProfile);
    const dismissed = homeWidgetDismissalsKey(options.accessProfile, options.runId, options.interfaceId);
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === hidden || event.key === dismissed) changed(value => value + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [options.accessProfile, options.runId, options.interfaceId]);
  const text = clientObservationContext(options)[0].text;
  return useMemo(() => [{ name: "client_observation", text }], [text]);
}
