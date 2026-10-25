import { describe, expect, it } from "vitest";
import { countSalesOrdersWithPendingSupplier, pendingSupplierCountsBySalesOrder } from "./queries/order-status";

describe("supplier waiting order aggregation", () => {
  it("counts unique sales orders with sent purchase orders, not purchase order rows", () => {
    const pendingCounts = pendingSupplierCountsBySalesOrder([
      { salesOrderId: 10, status: "sent" },
      { salesOrderId: 10, status: "sent" },
      { salesOrderId: 10, status: "confirmed" },
      { salesOrderId: 11, status: "confirmed" },
      { salesOrderId: 12, status: "sent" },
    ]);

    expect(pendingCounts).toEqual(new Map([[10, 2], [12, 1]]));
    expect(countSalesOrdersWithPendingSupplier([10, 10, 11, 12], pendingCounts)).toBe(2);
  });

  it("returns no waiting orders when there are no sent purchase orders", () => {
    const pendingCounts = pendingSupplierCountsBySalesOrder([
      { salesOrderId: 10, status: "confirmed" },
    ]);

    expect(countSalesOrdersWithPendingSupplier([10], pendingCounts)).toBe(0);
  });
});
