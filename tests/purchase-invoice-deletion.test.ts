import { describe, expect, test } from "bun:test";
import { purchaseInvoiceDeletionPolicy } from "@/lib/purchase-invoice-policy";

describe("purchase invoice deletion policy", () => {
  test("allows draft invoices to be deleted", () => {
    expect(purchaseInvoiceDeletionPolicy("draft")).toEqual({
      allowed: true,
      statusCode: 200,
    });
  });

  test("protects posted invoices with a conflict response", () => {
    expect(purchaseInvoiceDeletionPolicy("posted")).toEqual({
      allowed: false,
      statusCode: 409,
      error: "Posted purchase invoices cannot be deleted. Create a correction instead.",
    });
  });

  test("protects unknown or missing statuses by default", () => {
    expect(purchaseInvoiceDeletionPolicy(undefined)).toEqual({
      allowed: false,
      statusCode: 409,
      error: "Posted purchase invoices cannot be deleted. Create a correction instead.",
    });
  });
});