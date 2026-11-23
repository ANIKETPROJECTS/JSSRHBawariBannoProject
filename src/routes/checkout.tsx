import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { useCart } from "@/components/site/CartContext";
import { CartProductImage } from "@/components/site/CartProductImage";
import { useCustomerAuth } from "@/components/site/CustomerAuthContext";
import { calculateShippingCharge } from "@/lib/phonepe-test-shipping";
import { formatPrice } from "@/data/sarees";
import { formatCustomerPhone } from "@/lib/customer-phone";
import locationIcon from "../../attached_assets/location_(1)_1795455962716.png";
import securityIcon from "../../attached_assets/security_1795456066348.png";
import shoppingBagIcon from "../../attached_assets/shopping-bag_1795456111574.png";
import insuranceIcon from "../../attached_assets/insurance_1795456279777.png";
import "@/components/site/cart-checkout.css";

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>) => ({
    coupon: typeof search.coupon === "string" ? search.coupon : undefined,
  }),
  head: () => ({ meta: [{ title: "Checkout | Bawari Banno" }] }),
  component: Checkout,
});

type Address = { id: string; name: string; phone: string; addressLine: string; locality: string; pincode: string; city: string; state: string; landmark?: string; isDefault?: boolean };

function formatAddress(address: Address) {
  return [
    address.addressLine,
    address.locality,
    [address.city, address.state, address.pincode].filter(Boolean).join(", "),
    address.landmark ? `Landmark: ${address.landmark}` : "",
  ].filter(Boolean).join(", ");
}

function Checkout() {
  const navigate = useNavigate();
  const { coupon: initialCoupon } = Route.useSearch();
  const { customer, checking, openAuth } = useCustomerAuth();
  const { items, clearCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ name: customer?.name ?? "", addressLine: "", locality: "", pincode: "", city: "", state: "", landmark: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState(initialCoupon ?? "");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [shippingSettings, setShippingSettings] = useState({ shippingCharges: 250, freeShippingThreshold: 15000 });
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [items]);
  const shipping = calculateShippingCharge(items, subtotal, shippingSettings.shippingCharges, shippingSettings.freeShippingThreshold);
  const total = Math.max(0, subtotal + shipping - couponDiscount);

  useEffect(() => {
    fetch("/api/store-config").then((response) => response.json()).then((result) => {
      const settings = result.settings && typeof result.settings === "object" ? result.settings : {};
      setShippingSettings({
        shippingCharges: Math.max(0, Number(settings.shippingCharges ?? 250) || 0),
        freeShippingThreshold: Math.max(0, Number(settings.freeShippingThreshold ?? 15000) || 0),
      });
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!checking && !items.length) {
      void navigate({ to: "/cart", search: { coupon: initialCoupon } });
      return;
    }
    if (checking || !items.length) return;
    if (!customer) {
      openAuth(() => { void navigate({ to: "/checkout", search: { coupon: initialCoupon } }); });
      return;
    }
    let active = true;
    fetch("/api/auth/addresses").then((response) => response.json()).then((result) => {
      const saved = Array.isArray(result.addresses) ? result.addresses as Address[] : [];
      if (!active) return;
      setAddresses(saved);
      setSelectedId(saved.find((address) => address.isDefault)?.id ?? saved[0]?.id ?? "");
      setLoading(false);
      if (!saved.length) setShowAddressForm(true);
    }).catch(() => {
      if (active) {
        setLoading(false);
        toast.error("Could not load your saved delivery addresses.");
      }
    });
    return () => { active = false; };
  }, [checking, customer, initialCoupon, items.length, navigate, openAuth]);

  useEffect(() => {
    if (!initialCoupon || !items.length) return;
    let active = true;
    fetch("/api/coupons/validate", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: initialCoupon, items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })) }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Coupon could not be applied.");
      if (active) { setCouponDiscount(Number(result.discount ?? 0)); setCouponMessage(`${result.code} applied — you save ${formatPrice(Number(result.discount ?? 0))}.`); }
    }).catch((error) => { if (active) setCouponMessage(error instanceof Error ? error.message : "Coupon could not be applied."); });
    return () => { active = false; };
  }, [initialCoupon, items]);

  async function saveAddress() {
    setSavingAddress(true);
    try {
      const response = await fetch("/api/auth/addresses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(addressForm),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Address could not be saved.");
      const savedAddress = result.address as Address | undefined;
      if (!savedAddress?.id) throw new Error("Address was saved but could not be selected. Please reload checkout.");
      setAddresses(Array.isArray(result.addresses) ? result.addresses : [savedAddress]);
      setSelectedId(savedAddress.id);
      setShowAddressForm(false);
      toast.success("Delivery address saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Address could not be saved.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function applyCoupon() {
    if (!coupon.trim()) return;
    try {
      const response = await fetch("/api/coupons/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: coupon, items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Coupon could not be applied.");
      setCoupon(String(result.code ?? coupon).toUpperCase()); setCouponDiscount(Number(result.discount ?? 0)); setCouponMessage(`${result.code} applied — you save ${formatPrice(Number(result.discount ?? 0))}.`);
    } catch (error) { setCouponDiscount(0); setCouponMessage(error instanceof Error ? error.message : "Coupon could not be applied."); }
  }

  async function placeOrder() {
    if (!selectedId || !items.length) return;
    setBusy(true);
    try {
      const response = await fetch("/api/inventory/purchase", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: items.map(({ product, quantity }) => ({ productId: product.id, variantId: product.selectedVariantId, quantity })), addressId: selectedId, couponCode: coupon || undefined }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Checkout could not be completed.");
      if (!result.redirectUrl) throw new Error("PhonePe did not return a payment URL.");
      clearCart();
      window.location.assign(result.redirectUrl);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Checkout could not be completed."); }
    finally { setBusy(false); }
  }

  if (!checking && !items.length) {
    return <SiteShell><p className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted-foreground">Returning to your cart…</p></SiteShell>;
  }

  return (
    <SiteShell>
      <main className="checkout-page mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="checkout-page-title mb-6">Checkout</h1>
        {loading ? (
          <p role="status" className="rounded-xl bg-[#f6f6f6] px-5 py-8 text-sm text-[#777078]">Loading your delivery details…</p>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.85fr)] lg:gap-6">
            <div className="space-y-4">
              <section className="rounded-xl bg-[#f6f6f6] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <img src={locationIcon} alt="" className="size-5 object-contain mix-blend-multiply" />
                    <h2 className="text-[#302a30]">Delivery Address</h2>
                  </div>
                  <button type="button" onClick={() => setShowAddressForm((open) => !open)} className="rounded-md border border-[#d9d4d6] bg-white px-3 py-2 text-sm font-medium text-[#51474c] hover:border-[#ed145b] hover:text-[#ed145b]">
                    {showAddressForm && addresses.length > 0 ? "Cancel" : "+ Add New Address"}
                  </button>
                </div>
                {addresses.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {addresses.map((address) => (
                      <label key={address.id} className={`flex cursor-pointer gap-3 rounded-lg border bg-white p-4 transition-colors ${selectedId === address.id ? "border-[#ed145b] ring-1 ring-[#ed145b]" : "border-[#e4dfe1] hover:border-[#d9a7b7]"}`}>
                        <input type="radio" name="delivery-address" checked={selectedId === address.id} onChange={() => setSelectedId(address.id)} className="mt-1 accent-[#ed145b]" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2 font-medium text-[#302a30]">
                            {address.name}
                            {address.isDefault && <span className="text-xs font-semibold uppercase tracking-wider text-[#ed145b]">Default</span>}
                          </span>
                          <span className="mt-1 block text-sm text-[#6f666c]">{formatCustomerPhone(address.phone)}</span>
                          <span className="mt-2 block text-sm leading-relaxed text-[#51474c]">{formatAddress(address)}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {showAddressForm && (
                  <div className="mt-4 rounded-lg border border-[#e4dfe1] bg-white p-4 sm:p-5">
                    <h3 className="font-semibold text-[#302a30]">{addresses.length ? "New delivery address" : "Add your delivery address"}</h3>
                    <p className="mt-1 text-sm text-[#777078]">Your phone number is {formatCustomerPhone(customer?.phone)}.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {([
                        ["name", "Full name", "text"],
                        ["addressLine", "House / street address", "text"],
                        ["locality", "Area / locality", "text"],
                        ["pincode", "6-digit pincode", "numeric"],
                        ["city", "City", "text"],
                        ["state", "State", "text"],
                        ["landmark", "Landmark (optional)", "text"],
                      ] as const).map(([field, label, type]) => (
                        <label key={field} className={field === "addressLine" ? "sm:col-span-2" : ""}>
                          <span className="mb-1.5 block text-sm text-[#6f666c]">{label}</span>
                          <input
                            value={addressForm[field]}
                            onChange={(event) => setAddressForm((current) => ({ ...current, [field]: field === "pincode" ? event.target.value.replace(/\D/g, "").slice(0, 6) : event.target.value }))}
                            inputMode={type === "numeric" ? "numeric" : undefined}
                            maxLength={field === "pincode" ? 6 : undefined}
                            required={field !== "landmark"}
                            className="w-full rounded-md border border-[#ded9db] px-3 py-2.5 text-base outline-none focus:border-[#ed145b]"
                          />
                        </label>
                      ))}
                    </div>
                    <button type="button" disabled={savingAddress} onClick={() => void saveAddress()} className="mt-4 rounded-md bg-[#ed145b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#bd104a] disabled:opacity-50">{savingAddress ? "Saving…" : "Save Address"}</button>
                  </div>
                )}
              </section>

              <section className="rounded-xl bg-[#f6f6f6] p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <img src={securityIcon} alt="" className="size-5 object-contain mix-blend-multiply" />
                  <h2 className="text-[#302a30]">Payment Method</h2>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#ed145b]/35 bg-white p-4">
                  <span className="flex size-5 items-center justify-center rounded-full border border-[#ed145b]"><span className="size-2.5 rounded-full bg-[#ed145b]" /></span>
                  <span className="text-sm font-medium text-[#302a30]">UPI / Cards / Net Banking</span>
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-xl bg-[#f6f6f6] p-4 sm:p-5 lg:sticky lg:top-5">
              <div className="flex items-center gap-2">
                <img src={shoppingBagIcon} alt="" className="size-5 object-contain mix-blend-multiply" />
                <h2 className="text-[#302a30]">Order Summary</h2>
              </div>
              <div className="mt-4 divide-y divide-[#e4dfe1] border-y border-[#e4dfe1]">
                {items.map(({ product, quantity }) => (
                  <div key={`${product.id}-${product.selectedVariantId ?? ""}`} className="flex gap-3 py-3">
                    <CartProductImage product={product} className="size-16 rounded-md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#302a30]">{product.name}</p>
                      {product.selectedVariantColor && <p className="mt-0.5 text-sm text-[#777078]">{product.selectedVariantColor}</p>}
                      <p className="mt-1 text-sm text-[#777078]">Qty {quantity}</p>
                    </div>
                    <p className="text-sm">{formatPrice(product.price * quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" className="min-w-0 flex-1 rounded-md border border-[#ded9db] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#ed145b]" />
                <button type="button" onClick={() => void applyCoupon()} disabled={!coupon.trim()} className="rounded-md border border-[#ed145b] bg-white px-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#ed145b] disabled:opacity-50">Apply</button>
              </div>
              {couponMessage && <p role="status" className={`mt-2 text-sm ${couponDiscount ? "text-emerald-700" : "text-[#bd104a]"}`}>{couponMessage}</p>}
              <dl className="mt-4 space-y-3 border-t border-[#e4dfe1] pt-4 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-[#6f666c]">Subtotal ({items.length} {items.length === 1 ? "item" : "items"})</dt><dd>{formatPrice(subtotal)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#6f666c]">Shipping</dt><dd>{shipping ? formatPrice(shipping) : "FREE"}</dd></div>
                {couponDiscount > 0 && <div className="flex justify-between gap-3 text-emerald-700"><dt>Discount</dt><dd>−{formatPrice(couponDiscount)}</dd></div>}
                <div className="flex justify-between gap-3 border-t border-[#e4dfe1] pt-3 text-base font-semibold text-[#302a30]"><dt>Total</dt><dd className="text-[#ed145b]">{formatPrice(total)}</dd></div>
              </dl>
              <button type="button" disabled={!selectedId || showAddressForm || !items.length || busy} onClick={() => void placeOrder()} className="mt-4 w-full rounded-md bg-[#ed145b] px-5 py-3 text-sm font-semibold text-white hover:bg-[#bd104a] disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? "Starting secure payment…" : "Place Order"}
              </button>
              <p className="mt-3 flex items-center justify-center gap-2 text-sm text-[#6f666c]"><img src={insuranceIcon} alt="" className="size-5 object-contain mix-blend-multiply" /> 100% Secure</p>
            </aside>
          </div>
        )}
      </main>
    </SiteShell>
  );
}
