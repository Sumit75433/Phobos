import type { ReactNode } from "react";
import { PhobosSpinner } from "./PhobosSpinner";

export function PhobosLoadingState({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 py-2 text-sm text-secondary" role="status">
    <PhobosSpinner className="icon-xs shrink-0 text-secondary" />
    <span className="text-balance">{children}</span>
  </div>;
}
