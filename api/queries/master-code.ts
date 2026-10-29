export function nextSequentialCode(prefix: string, codes: readonly string[]): string {
  const maxSuffix = codes.reduce((max, code) => {
    if (!code.startsWith(prefix)) return max;
    const suffix = code.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) return max;
    const value = Number(suffix);
    return Number.isSafeInteger(value) ? Math.max(max, value) : max;
  }, 0);

  return `${prefix}${String(maxSuffix + 1).padStart(3, "0")}`;
}
