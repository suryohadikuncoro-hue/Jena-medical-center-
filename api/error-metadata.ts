export type SafeCauseMetadata = {
  depth: number;
  name?: string;
  code?: string;
  severity?: string;
};

const SAFE_TOKEN = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_CAUSE_DEPTH = 4;

function safeToken(value: unknown): string | undefined {
  return typeof value === "string" && SAFE_TOKEN.test(value) ? value : undefined;
}

export function getSafeCauseMetadata(error: unknown): SafeCauseMetadata[] {
  const metadata: SafeCauseMetadata[] = [];
  const root = error && typeof error === "object" ? (error as Record<string, unknown>) : undefined;
  let current = root?.cause;

  for (let depth = 0; current && depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof current !== "object" && typeof current !== "function") break;

    const cause = current as Record<string, unknown>;
    const entry: SafeCauseMetadata = {
      depth,
      name: safeToken(cause.name),
      code: safeToken(cause.code),
      severity: safeToken(cause.severity),
    };

    if (entry.name || entry.code || entry.severity) metadata.push(entry);
    current = cause.cause;
  }

  return metadata;
}
