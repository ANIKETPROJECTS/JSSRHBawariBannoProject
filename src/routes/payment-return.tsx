import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";

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

function PaymentReturn() {
  const [state, setState] = useState<PaymentState | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
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
  }, [attempt, transactionId]);

  const paymentStatus = String(state?.paymentStatus ?? "").toLowerCase();
  const paid = paymentStatus === "paid";
  const failed = paymentStatus === "failed";
  const pending = !paid && !failed;
  const Icon = paid ? CheckCircle2 : failed ? XCircle : Clock3;

  return (
    <SiteShell>
      <section className="fabric-texture border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:py-20">
          <p className="text-eyebrow text-muted-foreground">PhonePe payment</p>
          <h1 className="mt-3 max-w-3xl font-display text-5xl font-light leading-[1.05] text-primary sm:text-7xl">
            {error
              ? "Payment status unavailable"
              : paid
                ? "Payment received"
                : failed
                  ? "Payment was not completed"
                  : "Confirming your payment"}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {error ||
              (paid
                ? "Your order is now in our system. We will begin preparing it shortly."
                : failed
                  ? "No stock was deducted. You can return to the collection and try checkout again."
                  : "PhonePe is sending the payment result to us. This page will update automatically.")}
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <div className="border border-border bg-card p-7 text-center sm:p-12">
          <Icon
            className={`mx-auto size-14 ${paid ? "text-emerald-deep" : failed ? "text-red-700" : "text-gold"}`}
            strokeWidth={1.2}
          />
          {state?.orderId && (
            <p className="mt-7 text-eyebrow text-muted-foreground">Order number</p>
          )}
          {state?.orderId && (
            <p className="mt-2 font-display text-3xl text-primary">{state.orderId}</p>
          )}
          {state?.total !== undefined && (
            <p className="mt-3 text-sm text-muted-foreground">
              Total: ₹{Number(state.total).toLocaleString("en-IN")}
            </p>
          )}
          {!error && (
            <p className="mt-5 text-sm capitalize text-muted-foreground">
              Payment: {paymentStatus || "pending"} · Order: {state?.status ?? "pending"}
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/profile"
              className="bg-primary px-6 py-3 text-eyebrow text-primary-foreground hover:bg-ink"
            >
              View my orders
            </Link>
            <Link
              to="/products"
              className="border border-primary px-6 py-3 text-eyebrow text-primary hover:bg-secondary"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
