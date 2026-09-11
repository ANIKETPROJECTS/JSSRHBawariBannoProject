export type PurchaseInvoiceDeletionPolicy =
  | { allowed: true; statusCode: 200 }
  | { allowed: false; statusCode: 409; error: string };

export function purchaseInvoiceDeletionPolicy(status: unknown): PurchaseInvoiceDeletionPolicy {
  if (status === "draft") return { allowed: true, statusCode: 200 };
  return {
    allowed: false,
    statusCode: 409,
    error: "Posted purchase invoices cannot be deleted. Create a correction instead.",
  };
}