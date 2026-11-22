import type { CSSProperties } from "react";

const PHOBOS_LOGO_URL = "./phobos-logo.png";

export function PhobosLoadingLogo({ size = 56 }: { size?: number }) {
  const maskImage = `url(${PHOBOS_LOGO_URL})`;
  return (
    <span
      aria-hidden="true"
      className="phobos-loading-logo relative inline-flex shrink-0 items-center justify-center"
      style={{
        height: size,
        width: size,
      }}
    >
      <img
        alt=""
        className="phobos-loading-logo-base size-full"
        draggable={false}
        src={PHOBOS_LOGO_URL}
      />
      <span
        className="phobos-loading-logo-overlay pointer-events-none absolute inset-0"
        style={{
          WebkitMaskImage: maskImage,
          WebkitMaskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
          maskImage,
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskSize: "contain",
        } as CSSProperties}
      />
    </span>
  );
}

export function PhobosLoadingState({
  className = "",
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={className || undefined}
      role="status"
    >
      <PhobosLoadingLogo />
    </div>
  );
}
