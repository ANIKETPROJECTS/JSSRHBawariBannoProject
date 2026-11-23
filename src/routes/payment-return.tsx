import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { pendingPaymentCartStorageKey, useCart, type CartItem } from "@/components/site/CartContext";
import "@/components/site/cart-checkout.css";

export const Route = createFileRoute("/payment-return")({
  head: () => ({
    meta: [
      { title: "Payment status | Bawari Banno" },
      { name: "description", content: "Check the status of your Bawari Banno PhonePe payment." },
    ],
  }),
  component: PaymentReturn,
});

type PaymentState = {
  orderId?: string;
  paymentStatus?: string;
  status?: string;
  total?: number;
};

function readPendingCartSnapshot() {
  try {
    const raw = window.sessionStorage.getItem(pendingPaymentCartStorageKey);
    if (!raw) return { items: [] as CartItem[], coupon: "" };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { items: [] as CartItem[], coupon: "" };
    const record = parsed as { items?: unknown; coupon?: unknown };
    const items = Array.isArray(record.items)
      ? record.items.filter((entry): entry is CartItem => {
          if (!entry || typeof entry !== "object") return false;
          const item = entry as Partial<CartItem>;
          const product = item.product;
          return Boolean(
            product
            && typeof product.id === "string"
            && typeof product.name === "string"
            && Number.isFinite(Number(product.price))
            && Number.isFinite(Number(item.quantity))
            && Number(item.quantity) > 0,
          );
        })
      : [];
    return { items, coupon: typeof record.coupon === "string" ? record.coupon : "" };
  } catch {
    return { items: [] as CartItem[], coupon: "" };
  }
}

function PaymentReturn() {
  const navigate = useNavigate();
  const { clearCart, restoreItems } = useCart();
  const [state, setState] = useState<PaymentState | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [pendingCoupon, setPendingCoupon] = useState("");
  const transactionId =
    new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get(
      "transactionId",
    ) ?? "";

  useEffect(() => {
    if (!transactionId) {
      setError("We could not find the payment reference.");
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function readStatus() {
      try {
        const response = await fetch(
          `/api/phonepe/status?transactionId=${encodeURIComponent(transactionId)}`,
          { credentials: "same-origin" },
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "We could not read the payment status.");
        if (cancelled) return;
        setState(result);
        const paymentStatus = String(result.paymentStatus ?? "").toLowerCase();
        if (paymentStatus === "paid") {
          clearCart();
          window.sessionStorage.removeItem(pendingPaymentCartStorageKey);
        } else if (paymentStatus === "failed") {
          const snapshot = readPendingCartSnapshot();
          if (snapshot.items.length) restoreItems(snapshot.items);
          setPendingCoupon(snapshot.coupon);
        }
        if (paymentStatus === "pending" && attempt < 5) {
          timer = setTimeout(() => setAttempt((value) => value + 1), 1800);
        }
      } catch (readError) {
        if (!cancelled)
          setError(
            readError instanceof Error
              ? readError.message
              : "We could not read the payment status.",
          );
      }
    }
    void readStatus();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attempt, clearCart, restoreItems, transactionId]);

  const paymentStatus = String(state?.paymentStatus ?? "").toLowerCase();
  const paid = paymentStatus === "paid";
  const failed = paymentStatus === "failed";
  const pending = !paid && !failed;
  const Icon = paid ? CheckCircle2 : failed ? XCircle : Clock3;

  useEffect(() => {
    if (!paid) return;
    const timer = window.setTimeout(() => {
      void navigate({ to: "/profile" });
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [navigate, paid]);

  return (
    <SiteShell>
      <main className="payment-return-page mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="payment-return-card overflow-hidden rounded-xl border border-[#eee6e8] bg-white shadow-sm">
          <div className={`flex justify-center border-b border-[#eee6e8] py-7 ${paid ? "bg-[#f1faf5]" : failed ? "bg-[#fff5f6]" : "bg-[#fffaf0]"}`}>
            <div className={`flex size-16 items-center justify-center rounded-full bg-white ${paid ? "text-emerald-700" : failed ? "text-[#c43045]" : "text-[#a78338]"}`}>
              <Icon className="size-9" strokeWidth={1.7} />
            </div>
          </div>
          <div className="px-5 py-7 text-center sm:px-10 sm:py-9">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7d82]">PhonePe payment</p>
            <h1 className="mt-2 font-display font-medium text-[#25212a]">
              {error
                ? "Payment status unavailable"
                : paid
                  ? "Payment received"
                  : failed
                    ? "Payment was not completed"
                    : "Confirming your payment"}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#6f666c]">
              {error ||
                (paid
                  ? "Your order is confirmed. We’re taking you to your order details."
                  : failed
                    ? "Your cart is safe and no stock was deducted. Return to your cart to review your items and try again."
                    : "PhonePe is confirming your payment. Please wait here while we check the result.")}
            </p>

            {(state?.orderId || state?.total !== undefined || !error) && (
              <div className="mx-auto mt-6 grid max-w-md gap-3 rounded-lg bg-[#f7f6f6] p-4 text-left sm:grid-cols-2">
                {state?.orderId && (
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#8a7d82]">Order number</p>
                    <p className="mt-1 break-all text-sm font-medium text-[#302a30]">{state.orderId}</p>
                  </div>
                )}
                {state?.total !== undefined && (
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#8a7d82]">Order total</p>
                    <p className="mt-1 text-sm font-medium text-[#302a30]">₹{Number(state.total).toLocaleString("en-IN")}</p>
                  </div>
                )}
                {!error && (
                  <div className="sm:col-span-2">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#8a7d82]">Status</p>
                    <p className="mt-1 text-sm capitalize text-[#302a30]">Payment {paymentStatus || "pending"} · Order {state?.status ?? "pending"}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              {failed ? (
                <>
                  <Link
                    to="/cart"
                    search={{ coupon: pendingCoupon || undefined }}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#ed145b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#bd104a]"
                  >
                    Return to cart
                  </Link>
                  <Link
                    to="/products"
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#ded9db] px-6 py-3 text-sm font-medium text-[#51474c] hover:border-[#ed145b]"
                  >
                    Continue shopping
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/profile"
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#ed145b] px-6 py-3 text-sm font-semibold text-white hover:bg-[#bd104a]"
                  >
                    View my orders
                  </Link>
                  <Link
                    to="/products"
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#ded9db] px-6 py-3 text-sm font-medium text-[#51474c] hover:border-[#ed145b]"
                  >
                    Continue shopping
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
