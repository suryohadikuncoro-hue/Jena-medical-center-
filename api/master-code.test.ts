import { describe, expect, it } from "vitest";
import { nextSequentialCode } from "./queries/master-code";

describe("nextSequentialCode", () => {
  it("uses the highest customer suffix instead of the current row count", () => {
    expect(nextSequentialCode("C", ["C003", "C002"])).toBe("C004");
  });

  it("continues after deleted product SKU gaps", () => {
    expect(nextSequentialCode("SKU-", ["SKU-002", "SKU-003", "SKU-004", "SKU-005", "SKU-006"])).toBe("SKU-007");
  });

  it("continues supplier codes and starts at one for an empty table", () => {
    expect(nextSequentialCode("S", ["S001", "S002"])).toBe("S003");
    expect(nextSequentialCode("C", [])).toBe("C001");
  });

  it("ignores values with a different prefix or a non-numeric suffix", () => {
    expect(nextSequentialCode("C", ["S004", "C002", "C-003"])).toBe("C003");
  });
});
