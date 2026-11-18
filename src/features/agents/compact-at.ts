/** Context sizes, in tokens, an agent's session can compact at. */
export const COMPACT_AT = [
  "100000",
  "200000",
  "256000",
  "400000",
  "600000",
  "800000",
] as const;

/** `value` as a token count an agent compacts at, or undefined for its
 * harness's own default. */
export const compactAt = (value: unknown) =>
  COMPACT_AT.includes(value as (typeof COMPACT_AT)[number])
    ? Number(value)
    : undefined;

/** `config` with `compactAt` set to `value`, or without it for the
 * harness's own default. */
export const withCompactAt = <C extends { compactAt?: string }>(
  config: C,
  value: string,
): C => {
  const { compactAt: _, ...rest } = config;
  return (compactAt(value) ? { ...rest, compactAt: value } : rest) as C;
};
