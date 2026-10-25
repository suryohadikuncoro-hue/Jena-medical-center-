export type PurchaseOrderStatusRow = {
  salesOrderId: number;
  status: string;
};

export function pendingSupplierCountsBySalesOrder(
  purchaseOrders: readonly PurchaseOrderStatusRow[],
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const purchaseOrder of purchaseOrders) {
    if (purchaseOrder.status !== "sent") continue;
    counts.set(purchaseOrder.salesOrderId, (counts.get(purchaseOrder.salesOrderId) ?? 0) + 1);
  }
  return counts;
}

export function countSalesOrdersWithPendingSupplier(
  salesOrderIds: readonly number[],
  pendingCounts: ReadonlyMap<number, number>,
): number {
  let count = 0;
  for (const salesOrderId of new Set(salesOrderIds)) {
    if ((pendingCounts.get(salesOrderId) ?? 0) > 0) count += 1;
  }
  return count;
}
