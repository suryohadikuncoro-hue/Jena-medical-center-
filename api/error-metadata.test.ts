import { describe, expect, it } from "vitest";
import { getSafeCauseMetadata } from "./error-metadata";

describe("safe database cause metadata", () => {
  it("keeps only safe name, code, and severity fields from nested causes", () => {
    const postgresError = Object.assign(new Error("sensitive database detail"), {
      name: "PostgresError",
      code: "08006",
      severity: "FATAL",
      query: "select secret_column from private_table",
    });
    const drizzleError = Object.assign(new Error("Failed query: select private data"), {
      name: "DrizzleQueryError",
      cause: postgresError,
    });
    const trpcError = Object.assign(new Error("internal wrapper"), { cause: drizzleError });

    const metadata = getSafeCauseMetadata(trpcError);

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
});
