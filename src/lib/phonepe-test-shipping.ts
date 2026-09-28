export const PHONEPE_TEST_PRODUCT_ID = "phonepe-rupee-test-saree";

type ShippingLine = {
  quantity: number;
  product: {
    id: unknown;
    price: unknown;
  };
};

export function isSinglePhonePeTestItem(items: readonly ShippingLine[]) {
  return items.length === 1
    && Number(items[0].quantity) === 1
    && String(items[0].product.id ?? "") === PHONEPE_TEST_PRODUCT_ID
    && Number(items[0].product.price) === 1;
}

export function calculateShippingCharge(
  items: readonly ShippingLine[],
  subtotal: number,
  shippingCharge = 250,
  freeShippingThreshold = 15_000,
) {
  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
  const safeShippingCharge = Number.isFinite(shippingCharge) ? Math.max(0, shippingCharge) : 250;
  const safeFreeShippingThreshold = Number.isFinite(freeShippingThreshold)
    ? Math.max(0, freeShippingThreshold)
    : 15_000;

  if (
    isSinglePhonePeTestItem(items)
    || safeSubtotal === 0
    || safeSubtotal >= safeFreeShippingThreshold
  ) {
    return 0;
  }

  return safeShippingCharge;
}