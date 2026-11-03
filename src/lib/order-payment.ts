const successfulPaymentStatuses = new Set(["paid", "success", "completed"]);

export function isSuccessfulPayment(status: unknown) {
  return successfulPaymentStatuses.has(String(status ?? "").trim().toLowerCase());
}

export function isFailedPayment(status: unknown) {
  return String(status ?? "").trim().toLowerCase() === "failed";
}

export function countableOrder(status: unknown) {
  return !isFailedPayment(status);
}

export function recognizedOrderRevenue(total: unknown, paymentStatus: unknown) {
  if (!isSuccessfulPayment(paymentStatus)) return 0;
  const amount = Number(total ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}
