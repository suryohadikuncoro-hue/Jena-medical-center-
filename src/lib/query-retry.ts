const NON_RETRYABLE_QUERY_CODES = new Set(["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND"]);

export function shouldRetryQuery(failureCount: number, code?: string): boolean {
  return failureCount < 3 && !NON_RETRYABLE_QUERY_CODES.has(code ?? "");
}

export function queryRetryDelay(attemptIndex: number): number {
  return Math.min(500 * 2 ** attemptIndex, 4_000);
}
