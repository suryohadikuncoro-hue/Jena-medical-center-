import { describe, expect, it } from "vitest";
import { queryRetryDelay, shouldRetryQuery } from "../src/lib/query-retry";

describe("query retry policy", () => {
  it("retries transient server and network failures up to three times", () => {
    expect(shouldRetryQuery(0, "INTERNAL_SERVER_ERROR")).toBe(true);
    expect(shouldRetryQuery(1, undefined)).toBe(true);
    expect(shouldRetryQuery(2, "INTERNAL_SERVER_ERROR")).toBe(true);
    expect(shouldRetryQuery(3, "INTERNAL_SERVER_ERROR")).toBe(false);
  });

  it("does not retry client input or authentication errors", () => {
    for (const code of ["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND"]) {
      expect(shouldRetryQuery(0, code)).toBe(false);
    }
  });

  it("uses bounded exponential backoff", () => {
    expect(queryRetryDelay(0)).toBe(500);
    expect(queryRetryDelay(1)).toBe(1_000);
    expect(queryRetryDelay(2)).toBe(2_000);
    expect(queryRetryDelay(10)).toBe(4_000);
  });
});
