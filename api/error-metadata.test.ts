import { describe, expect, it } from "vitest";
import { classifyCauseCategory, getSafeCauseMetadata, SAFE_ERROR_CATEGORIES } from "./error-metadata";

function wrapDatabaseCause(cause: unknown) {
  const drizzleError = Object.assign(new Error("Failed query: select private_data from private_table"), {
    name: "DrizzleQueryError",
    cause,
  });
  return Object.assign(new Error("internal wrapper"), { cause: drizzleError });
}

describe("safe database cause metadata", () => {
  it("keeps only safe name, code, and severity fields from nested causes", () => {
    const postgresError = Object.assign(new Error("sensitive database detail"), {
      name: "PostgresError",
      code: "08006",
      severity: "FATAL",
      query: "select secret_column from private_table",
    });

    const metadata = getSafeCauseMetadata(wrapDatabaseCause(postgresError));

    expect(metadata).toEqual([
      { depth: 0, name: "DrizzleQueryError", code: undefined, severity: undefined },
      { depth: 1, name: "PostgresError", code: "08006", severity: "FATAL" },
    ]);
    expect(JSON.stringify(metadata)).not.toContain("sensitive");
    expect(JSON.stringify(metadata)).not.toContain("select");
    expect(JSON.stringify(metadata)).not.toContain("private_table");
  });

  it("drops unsafe tokens and limits cause-chain depth", () => {
    const error = {
      cause: {
        name: "PostgresError; DROP TABLE",
        code: "08006\nsecret",
        severity: "FATAL",
        cause: {
          name: "NestedError",
          code: "ECONNRESET",
          cause: { name: "ThirdError", cause: { name: "FourthError", cause: { name: "IgnoredError" } } },
        },
      },
    };

    expect(getSafeCauseMetadata(error)).toEqual([
      { depth: 0, name: undefined, code: undefined, severity: "FATAL" },
      { depth: 1, name: "NestedError", code: "ECONNRESET", severity: undefined },
      { depth: 2, name: "ThirdError", code: undefined, severity: undefined },
      { depth: 3, name: "FourthError", code: undefined, severity: undefined },
    ]);
  });

  it.each([
    ["connection timeout", "write CONNECT ETIMEDOUT", "ETIMEDOUT", "connection_timeout"],
    ["connection reset", "write ECONNRESET", "ECONNRESET", "connection_reset_or_closed"],
    ["connection SQLSTATE", "connection failure", "08006", "connection_reset_or_closed"],
    ["authentication", "password authentication failed for sensitive_user", "28P01", "authentication"],
    ["schema or permission", 'relation "private_table" does not exist', "42P01", "schema_or_permission"],
    ["capacity", "too many connections", "53300", "capacity"],
    ["other", "an opaque internal database error", undefined, "other"],
  ] as const)("classifies %s without exposing the underlying message", (_label, message, code, expected) => {
    const cause = Object.assign(new Error(message), code ? { code } : {});
    const category = classifyCauseCategory(wrapDatabaseCause(cause));

    expect(category).toBe(expected);
    expect(SAFE_ERROR_CATEGORIES).toContain(category);
    expect(JSON.stringify({ category })).not.toContain(message);
  });

  it("ignores SQL text in the Drizzle wrapper when selecting a category", () => {
    const error = wrapDatabaseCause(new Error("unclassified cause"));

    expect(classifyCauseCategory(error)).toBe("other");
  });
});
