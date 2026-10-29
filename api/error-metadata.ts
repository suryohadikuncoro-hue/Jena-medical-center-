export type SafeCauseMetadata = {
  depth: number;
  name?: string;
  code?: string;
  severity?: string;
};

export const SAFE_ERROR_CATEGORIES = [
  "connection_timeout",
  "connection_reset_or_closed",
  "authentication",
  "schema_or_permission",
  "capacity",
  "other",
] as const;

export type SafeErrorCategory = (typeof SAFE_ERROR_CATEGORIES)[number];

const SAFE_TOKEN = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_CAUSE_DEPTH = 4;

function safeToken(value: unknown): string | undefined {
  return typeof value === "string" && SAFE_TOKEN.test(value) ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function getCauseChain(error: unknown): Record<string, unknown>[] {
  const chain: Record<string, unknown>[] = [];
  let current = asRecord(error)?.cause;

  for (let depth = 0; current && depth < MAX_CAUSE_DEPTH; depth += 1) {
    const cause = asRecord(current);
    if (!cause) break;
    chain.push(cause);
    current = cause.cause;
  }

  return chain;
}

export function getSafeCauseMetadata(error: unknown): SafeCauseMetadata[] {
  return getCauseChain(error).flatMap((cause, depth) => {
    const entry: SafeCauseMetadata = {
      depth,
      name: safeToken(cause.name),
      code: safeToken(cause.code),
      severity: safeToken(cause.severity),
    };

    return entry.name || entry.code || entry.severity ? [entry] : [];
  });
}

export function classifyCauseCategory(error: unknown): SafeErrorCategory {
  const chain = getCauseChain(error);
  const codes = chain.flatMap((cause) => {
    const code = safeToken(cause.code ?? cause.errno);
    return code ? [code.toUpperCase()] : [];
  });
  const messages = chain.flatMap((cause) => {
    if (typeof cause.message !== "string" || /^Failed query:/i.test(cause.message.trim())) return [];
    return [cause.message];
  });
  const text = messages.join(" ").toLowerCase();
  const hasCode = (...expected: string[]) => codes.some((code) => expected.includes(code));

  if (
    hasCode("ETIMEDOUT", "CONNECT_TIMEOUT") ||
    /(?:ETIMEDOUT|CONNECT_TIMEOUT|(?:connect|connection|socket).{0,40}(?:timed out|timeout))/i.test(text)
  ) {
    return "connection_timeout";
  }

  if (
    hasCode("ECONNRESET", "ECONNABORTED", "EPIPE", "ECONNREFUSED", "57P01", "57P02", "57P03") ||
    codes.some((code) => code.startsWith("08")) ||
    /(?:ECONNRESET|ECONNABORTED|EPIPE|ECONNREFUSED|socket hang up|connection (?:reset|closed|terminated)|(?:server|socket) closed the connection)/i.test(text)
  ) {
    return "connection_reset_or_closed";
  }

  if (
    hasCode("28P01", "28000") ||
    /(?:password authentication failed|authentication failed|sasl)/i.test(text)
  ) {
    return "authentication";
  }

  if (
    hasCode("53300", "53400") ||
    /(?:too many (?:connections|clients)|remaining connection slots|connection pool (?:exhausted|is full)|max(?:imum)? connections? (?:reached|exceeded))/i.test(text)
  ) {
    return "capacity";
  }

  if (
    hasCode("42P01", "42703", "42501", "3F000") ||
    /(?:relation .* does not exist|column .* does not exist|permission denied|insufficient privilege)/i.test(text)
  ) {
    return "schema_or_permission";
  }

  return "other";
}
