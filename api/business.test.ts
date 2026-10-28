import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
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
    let stockError: unknown;
    try {
      assertSufficientStock(9, 10, "Masker");
    } catch (error) {
      stockError = error;
    }
    expect(stockError).toBeInstanceOf(TRPCError);
    expect((stockError as TRPCError).code).toBe("PRECONDITION_FAILED");
    expect((stockError as Error).message).toBe(
      "Stok Masker tidak cukup: tersedia 9, dibutuhkan 10. Perbarui stok sesuai barang fisik atau koreksi jumlah invoice.",
    );
    expect(() => assertSufficientStock(10, 0, "Masker")).toThrow(
      "Jumlah Masker pada invoice harus lebih dari 0",
    );
  });

  it("calculates an order total from all line items", () => {
    expect(orderTotal([
      { qty: 2, unitPrice: 12_500 },
      { qty: 3, unitPrice: 8_000 },
    ])).toBe(49_000);
  });
});
