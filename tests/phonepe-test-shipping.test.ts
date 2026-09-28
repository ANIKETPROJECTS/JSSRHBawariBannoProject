import { describe, expect, test } from "bun:test";
import {
  calculateShippingCharge,
  isSinglePhonePeTestItem,
  PHONEPE_TEST_PRODUCT_ID,
} from "../src/lib/phonepe-test-shipping";

describe("PhonePe test product shipping", () => {
  const testItem = {
    product: { id: PHONEPE_TEST_PRODUCT_ID, price: 1 },
    quantity: 1,
  };

  test("waives shipping only for one ₹1 test item by itself", () => {
    expect(isSinglePhonePeTestItem([testItem])).toBe(true);
    expect(calculateShippingCharge([testItem], 1)).toBe(0);
  });

  test("keeps normal shipping for multiple units, mixed carts, or a different price", () => {
    expect(calculateShippingCharge([{ ...testItem, quantity: 2 }], 2)).toBe(250);
    expect(calculateShippingCharge([testItem, { product: { id: "regular", price: 1 }, quantity: 1 }], 2)).toBe(250);
    expect(calculateShippingCharge([{ ...testItem, product: { ...testItem.product, price: 2 } }], 2)).toBe(250);
  });

  test("preserves the regular free-shipping threshold and configured fee", () => {
    const regularItem = { product: { id: "regular", price: 15_000 }, quantity: 1 };
    expect(calculateShippingCharge([regularItem], 15_000, 300, 15_000)).toBe(0);
    expect(calculateShippingCharge([{ ...regularItem, product: { ...regularItem.product, price: 10 } }], 10, 300, 15_000)).toBe(300);
  });
});