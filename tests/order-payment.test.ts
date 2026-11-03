import { describe, expect, it } from "bun:test";
import { countableOrder, isSuccessfulPayment, recognizedOrderRevenue } from "../src/lib/order-payment";

describe("order payment reporting", () => {
  it("counts only successful payments as revenue", () => {
    expect(recognizedOrderRevenue(15150, "failed")).toBe(0);
    expect(recognizedOrderRevenue(15150, "pending")).toBe(0);
    expect(recognizedOrderRevenue(15150, "paid")).toBe(15150);
    expect(recognizedOrderRevenue(15150, "SUCCESS")).toBe(15150);
  });

  it("keeps failed checkout attempts out of order counts but retains unpaid orders", () => {
    expect(countableOrder("failed")).toBe(false);
    expect(countableOrder("pending")).toBe(true);
  });

  it("rejects negative or non-numeric revenue amounts", () => {
    expect(recognizedOrderRevenue(-10, "paid")).toBe(0);
    expect(recognizedOrderRevenue("not a price", "paid")).toBe(0);
  });

  it("recognizes successful payment statuses", () => {
    expect(isSuccessfulPayment("completed")).toBe(true);
    expect(isSuccessfulPayment("paid")).toBe(true);
    expect(isSuccessfulPayment("pending")).toBe(false);
    expect(isSuccessfulPayment("failed")).toBe(false);
    expect(isSuccessfulPayment("refunded")).toBe(false);
  });
});
