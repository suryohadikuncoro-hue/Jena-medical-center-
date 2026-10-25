import { describe, expect, it } from "vitest";
import {
  assertPaymentReference,
  assertPaymentWithinOutstanding,
  assertSufficientStock,
  orderTotal,
} from "./queries/business";

describe("business transaction guards", () => {
  it("accepts only matching payment references", () => {
    expect(() => assertPaymentReference("in", 10)).not.toThrow();
    expect(() => assertPaymentReference("out", undefined, 20)).not.toThrow();
    expect(() => assertPaymentReference("in", undefined, 20)).toThrow(
      "Referensi pembayaran tidak sesuai arah pembayaran",
    );
    expect(() => assertPaymentReference("out", 10)).toThrow(
      "Referensi pembayaran tidak sesuai arah pembayaran",
    );
    expect(() => assertPaymentReference("in", 10, 20)).toThrow(
      "Referensi pembayaran tidak sesuai arah pembayaran",
    );
  });

  it("rejects zero, negative, and overpayment amounts", () => {
    expect(() => assertPaymentWithinOutstanding(500, 1_000, "overpayment")).not.toThrow();
    expect(() => assertPaymentWithinOutstanding(0, 1_000, "invalid amount")).toThrow("invalid amount");
    expect(() => assertPaymentWithinOutstanding(-1, 1_000, "invalid amount")).toThrow("invalid amount");
    expect(() => assertPaymentWithinOutstanding(1_001, 1_000, "overpayment")).toThrow("overpayment");
  });

  it("rejects sales quantities above available stock", () => {
    expect(() => assertSufficientStock(10, 10, "Masker")).not.toThrow();
    expect(() => assertSufficientStock(9, 10, "Masker")).toThrow("Stok Masker tidak mencukupi");
    expect(() => assertSufficientStock(10, 0, "Masker")).toThrow("Stok Masker tidak mencukupi");
  });

  it("calculates an order total from all line items", () => {
    expect(orderTotal([
      { qty: 2, unitPrice: 12_500 },
      { qty: 3, unitPrice: 8_000 },
    ])).toBe(49_000);
  });
});
