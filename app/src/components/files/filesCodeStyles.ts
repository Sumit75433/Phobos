export const filesCodeSurfaceCss = `
[data-file] {
    
  --phobos-diffs-surface: var(--color-surface);
  --phobos-diffs-context-surface: color-mix(
  in srgb,
  var(--phobos-diffs-surface) 94%,
  var(--color-surface)
);
  --phobos-diffs-separator-surface: color-mix(
  in srgb,
  var(--phobos-diffs-surface) 94%,
  var(--color-text-info)
);
  --phobos-diffs-hover-surface: color-mix(
  in srgb,
  var(--phobos-diffs-surface) 92%,
  var(--color-surface)
);
  --phobos-diffs-header-surface: var(--phobos-diffs-surface);
  --phobos-diffs-context-number: color-mix(
  in lab,
  var(--phobos-diffs-surface) 98.5%,
  var(--diffs-mixer)
);
  --phobos-diffs-addition-number: light-dark(
  color-mix(in lab, var(--diffs-light-bg, #fff) 91%, var(--diffs-addition-base)),
  color-mix(in lab, var(--diffs-dark-bg, #000) 85%, var(--diffs-addition-base))
);
  --phobos-diffs-deletion-number: light-dark(
  color-mix(in lab, var(--diffs-light-bg, #fff) 91%, var(--diffs-deletion-base)),
  color-mix(in lab, var(--diffs-dark-bg, #000) 85%, var(--diffs-deletion-base))
);
  --phobos-diffs-addition-hover: light-dark(
  color-mix(
    in lab,
    var(--diffs-light-bg, #fff) 80%,
    var(--diffs-addition-base)
  ),
  color-mix(
    in lab,
    var(--diffs-dark-bg, #000) 70%,
    var(--diffs-addition-base)
  )
);
  --phobos-diffs-deletion-hover: light-dark(
  color-mix(
    in lab,
    var(--diffs-light-bg, #fff) 80%,
    var(--diffs-deletion-base)
  ),
  color-mix(
    in lab,
    var(--diffs-dark-bg, #000) 75%,
    var(--diffs-deletion-base)
  )
);
  
  --diffs-dark: var(--color-text);
  --diffs-light: var(--color-text);
  --diffs-bg-context-override: var(--phobos-diffs-context-surface);
  --diffs-bg-separator-override: var(--phobos-diffs-separator-surface);
  --diffs-bg-hover-override: var(--phobos-diffs-hover-surface);

    --diffs-bg: var(--color-surface) !important;
    background-color: var(--color-surface) !important;
  }

  [data-file] [data-language-symbol-highlight] {
    background-color: var(--color-background-primary-ghost-hover) !important;
  }

  [data-file] [data-utility-button] {
    background-color: var(--color-text);
    color: var(--color-surface-secondary);
    border: none;
    border-radius: 4px;
    margin-right: 0;
  }

  [data-file] [data-utility-button]:hover {
    background-color: color-mix(
      in srgb,
      var(--color-text) 88%,
      var(--color-surface-secondary)
    );
  }

  [data-file] [data-selected-line][data-line-annotation] {
    background-color: var(--diffs-bg);
  }

  [data-placeholder][data-loading] {
    --phobos-diffs-placeholder-base: color-mix(
      in srgb,
      var(--color-text-description) 10%,
      transparent
    );
    --phobos-diffs-placeholder-highlight: color-mix(
      in srgb,
      var(--color-text-description) 16%,
      transparent
    );
    position: relative;
    overflow: hidden;
    background-image: linear-gradient(
      to right,
      var(--phobos-diffs-placeholder-base) 0 82%,
      transparent 82%
    );
    background-position: 12px 8px;
    background-size: calc(100% - 24px) 22px;
    background-repeat: repeat-y;
  }

  [data-placeholder][data-loading]::before {
    content: "";
    position: absolute;
    inset: 8px 12px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--phobos-diffs-placeholder-highlight) 50%,
      transparent 100%
    );
    transform: translateX(-100%);
    animation: phobos-diffs-placeholder-shimmer 3000ms linear infinite;
    mask-image: repeating-linear-gradient(
      to bottom,
      #000 0 14px,
      transparent 14px 22px
    );
  }

  @media (prefers-reduced-motion: reduce) {
    [data-placeholder][data-loading]::before {
      animation: none;
    }
  }

  @keyframes phobos-diffs-placeholder-shimmer {
    to {
      transform: translateX(100%);
    }
  }

  
  [data-file] [data-code] {
    scrollbar-gutter: auto;
  }

  [data-file] [data-line-type='change-addition']:is([data-line], [data-no-newline]) {
    --diffs-computed-diff-line-bg: var(--diffs-bg-addition);
  }

  [data-file] [data-line-type='change-addition']:is([data-column-number], [data-gutter-buffer]) {
    --diffs-computed-diff-line-bg: var(--phobos-diffs-addition-number);
  }

  [data-file] [data-line-type='change-deletion']:is([data-line], [data-no-newline]) {
    --diffs-computed-diff-line-bg: var(--diffs-bg-deletion);
  }

  [data-file] [data-line-type='change-deletion']:is([data-column-number], [data-gutter-buffer]) {
    --diffs-computed-diff-line-bg: var(--phobos-diffs-deletion-number);
  }

  [data-file] [data-line-type='change-addition'][data-hovered]:not([data-selected-line]) {
    --diffs-computed-hovered-line-bg: var(--phobos-diffs-addition-hover);
  }

  [data-file] [data-line-type='change-deletion'][data-hovered]:not([data-selected-line]) {
    --diffs-computed-hovered-line-bg: var(--phobos-diffs-deletion-hover);
  }

  [data-file][data-diff-type="split"] [data-line-type="change-deletion"][data-column-number]::before {
    background-color: var(--diffs-deletion-base);
    background-image: none;
  }

  [data-file] [data-line-type="change-addition"][data-column-number]
    + [data-line-type="change-addition"][data-column-number]::before,
  [data-file][data-diff-type="split"] [data-line-type="change-deletion"][data-column-number]
    + [data-line-type="change-deletion"][data-column-number]::before {
    contain: none;
    top: -1px;
    height: calc(100% + 1px);
  }
`;
