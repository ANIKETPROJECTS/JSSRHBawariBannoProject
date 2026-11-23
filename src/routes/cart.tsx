import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Tag } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { useCart } from "@/components/site/CartContext";
import { CartProductImage } from "@/components/site/CartProductImage";
import { calculateShippingCharge, isSinglePhonePeTestItem } from "@/lib/phonepe-test-shipping";
import { formatPrice } from "@/data/sarees";
import binIcon from "../../attached_assets/bin_(2)_1795455427948.png";
import "@/components/site/cart-checkout.css";

export const Route = createFileRoute("/cart")({
  validateSearch: (search: Record<string, unknown>) => ({
    coupon: typeof search.coupon === "string" ? search.coupon : undefined,
  }),
  head: () => ({ meta: [{ title: "Shopping Cart | Bawari Banno" }] }),
  component: CartPage,
});

type StoreCoupon = {
  code: string;
  label?: string;
};

function CartPage() {
  const navigate = useNavigate();
  const { coupon: initialCoupon } = Route.useSearch();
  const { items, updateQuantity, removeItem } = useCart();
  const [coupon, setCoupon] = useState(initialCoupon ?? "");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState<StoreCoupon[]>([]);
  const [shippingSettings, setShippingSettings] = useState({ shippingCharges: 250, freeShippingThreshold: 15000 });
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const previousSubtotal = useRef(0);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  );
  const shipping = calculateShippingCharge(
    items,
    subtotal,
    shippingSettings.shippingCharges,
    shippingSettings.freeShippingThreshold,
  );
  const total = Math.max(0, subtotal + shipping - discount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const phonePeTestOnlyCart = isSinglePhonePeTestItem(items);
  const freeShippingProgress = shippingSettings.freeShippingThreshold === 0
    ? 100
    : Math.min(100, (subtotal / shippingSettings.freeShippingThreshold) * 100);

  useEffect(() => {
    fetch("/api/store-config")
      .then((response) => response.json())
      .then((result) => {
        setAvailableCoupons(Array.isArray(result.coupons) ? result.coupons : []);
        const settings = result.settings && typeof result.settings === "object" ? result.settings : {};
        const shippingCharges = Number(settings.shippingCharges ?? 250);
        const freeShippingThreshold = Number(settings.freeShippingThreshold ?? 15000);
        setShippingSettings({
          shippingCharges: Number.isFinite(shippingCharges) ? Math.max(0, shippingCharges) : 250,
          freeShippingThreshold: Number.isFinite(freeShippingThreshold) ? Math.max(0, freeShippingThreshold) : 15000,
        });
      })
      .catch(() => setAvailableCoupons([]));
  }, []);

  async function applyCoupon(code = coupon) {
    if (!code.trim()) return;
    setCouponBusy(true);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Coupon could not be applied.");
      const nextCode = String(result.code ?? code).toUpperCase();
      const nextDiscount = Math.max(0, Number(result.discount ?? 0));
      setCoupon(nextCode);
      setAppliedCoupon(nextCode);
      setDiscount(nextDiscount);
      setCouponMessage({ ok: true, text: `${nextCode} applied — you save ${formatPrice(nextDiscount)}.` });
      toast.success(`${nextCode} applied.`);
    } catch (error) {
      setAppliedCoupon("");
      setDiscount(0);
      const message = error instanceof Error ? error.message : "Coupon could not be applied.";
      setCouponMessage({ ok: false, text: message });
      toast.error(message);
    } finally {
      setCouponBusy(false);
    }
  }

  useEffect(() => {
    if (!initialCoupon || !items.length) return;
    void applyCoupon(initialCoupon);
    // Apply a query-string coupon once when this cart is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCoupon, items.length]);

  useEffect(() => {
    if (previousSubtotal.current !== subtotal && appliedCoupon) {
      setAppliedCoupon("");
      setDiscount(0);
      setCouponMessage({ ok: false, text: "Your cart changed. Apply the coupon again to recalculate it." });
    }
    previousSubtotal.current = subtotal;
  }, [appliedCoupon, subtotal]);

  return (
    <SiteShell>
      <main className="cart-page mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="cart-page-title">Shopping Cart <span>({itemCount} {itemCount === 1 ? "item" : "items"})</span></h1>
        </div>
        {!items.length ? (
          <section className="flex min-h-[300px] flex-col items-center justify-center rounded-xl bg-[#f6f6f6] px-5 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-white text-[#ed145b]"><ShoppingBag className="size-6" strokeWidth={1.5} /></div>
            <h2 className="mt-4 text-[#25212a]">Your bag is empty</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#777078]">Explore the collection and add a saree to continue.</p>
          </section>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.85fr)] lg:gap-6">
            <section aria-label="Items in your cart" className="min-w-0 space-y-4">
              <div className="rounded-xl bg-[#f6f6f6] px-4 py-3 sm:px-5">
                <p className="text-sm text-[#6f666c]">
                  {freeShippingProgress >= 100
                    ? "Your order qualifies for free shipping."
                    : `Add ${formatPrice(Math.max(0, shippingSettings.freeShippingThreshold - subtotal))} more for free shipping.`}
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-[#ed145b] transition-all" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>
              <div className="space-y-3">
                {items.map(({ product, quantity }) => (
                  <article key={`${product.id}-${product.selectedVariantId ?? ""}`} className="flex gap-3 rounded-xl bg-[#f6f6f6] p-3 sm:gap-4 sm:p-4">
                    <CartProductImage product={product} className="aspect-[3/4] w-24 rounded-md sm:w-28" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#867a80]">{product.fabric}</p>
                          <h2 className="mt-1 text-base font-medium leading-snug text-[#28232a]">{product.name}</h2>
                          {product.selectedVariantColor && <p className="mt-1 text-sm text-[#6f666c]">{product.selectedVariantColor}</p>}
                        </div>
                        <button type="button" onClick={() => removeItem(product.id, product.selectedVariantId)} aria-label={`Remove ${product.name}`} title="Remove item" className="shrink-0 p-1.5 transition-opacity hover:opacity-70">
                          <img src={binIcon} alt="" className="size-[18px] object-contain mix-blend-multiply" />
                        </button>
                      </div>
                      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                        <div className="inline-flex h-9 items-center rounded-md bg-white">
                          <button type="button" aria-label={`Decrease quantity of ${product.name}`} onClick={() => updateQuantity(product.id, quantity - 1, product.selectedVariantId)} className="px-2.5 py-2 text-[#51474c] hover:text-[#ed145b]"><Minus className="size-3.5" /></button>
                          <span className="w-8 text-center text-sm">{quantity}</span>
                          <button type="button" aria-label={`Increase quantity of ${product.name}`} onClick={() => updateQuantity(product.id, quantity + 1, product.selectedVariantId)} className="px-2.5 py-2 text-[#51474c] hover:text-[#ed145b]"><Plus className="size-3.5" /></button>
                        </div>
                        <p className="text-base font-semibold text-[#ed145b]">{formatPrice(product.price * quantity)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <aside className="h-fit rounded-xl bg-[#f6f6f6] p-4 sm:p-5 lg:sticky lg:top-5">
              <h2 className="text-[#302a30]">Order Summary</h2>
              <div className="mt-3 border-y border-[#e6e3e4] py-3">
                <div className="flex items-center gap-2"><Tag className="size-4 text-[#ed145b]" /><p className="text-sm font-medium">Apply coupon</p></div>
                <div className="mt-2 flex gap-2">
                  <input value={coupon} onChange={(event) => { setCoupon(event.target.value.toUpperCase()); setCouponMessage(null); }} placeholder="Enter coupon code" aria-label="Coupon code" className="min-w-0 flex-1 rounded-md border border-[#ded9db] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#ed145b]" />
                  <button type="button" disabled={couponBusy || !coupon.trim()} onClick={() => void applyCoupon()} className="rounded-md border border-[#ed145b] px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#ed145b] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{couponBusy ? "Checking" : "Apply"}</button>
                </div>
                {availableCoupons.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{availableCoupons.map(({ code }) => <button key={code} type="button" onClick={() => { setCoupon(code); setCouponMessage(null); }} className="rounded border border-dashed border-[#d9cbd0] bg-white px-2 py-1 text-xs text-[#6f5962] hover:border-[#ed145b]">{code}</button>)}</div>}
                {couponMessage && <p role="status" className={`mt-2 text-sm ${couponMessage.ok ? "text-emerald-700" : "text-[#bd104a]"}`}>{couponMessage.text}</p>}
              </div>
              <dl className="space-y-3 py-3 text-sm">
                <div className="flex justify-between gap-3 text-[#6f666c]"><dt>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</dt><dd>{formatPrice(subtotal)}</dd></div>
                <div className="flex justify-between gap-3 text-[#6f666c]"><dt>Shipping Charges</dt><dd>{shipping ? formatPrice(shipping) : phonePeTestOnlyCart ? "FREE" : "FREE"}</dd></div>
                {discount > 0 && <div className="flex justify-between gap-3 text-emerald-700"><dt>Coupon discount</dt><dd>−{formatPrice(discount)}</dd></div>}
                <div className="flex justify-between gap-3 border-t border-[#e6e3e4] pt-3 text-base font-semibold text-[#28232a]"><dt>Total</dt><dd className="text-[#ed145b]">{formatPrice(total)}</dd></div>
                <p className="text-xs text-[#777078]">Inclusive of all taxes</p>
              </dl>
              <button type="button" onClick={() => void navigate({ to: "/checkout", search: { coupon: appliedCoupon || undefined } })} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#ed145b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#bd104a]">
                Proceed to Checkout
              </button>
              <p className="mt-2 text-center text-xs text-[#777078]">100% Secure Safe Payments</p>
            </aside>
          </div>
        )}
      </main>
    </SiteShell>
  );
}
