import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, MapPin, ShieldCheck, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { CheckoutFlowShell } from "@/components/site/CheckoutFlowShell";
import { useCart } from "@/components/site/CartContext";
import { useCustomerAuth } from "@/components/site/CustomerAuthContext";
import { calculateShippingCharge } from "@/lib/phonepe-test-shipping";
import { formatPrice } from "@/data/sarees";
import { formatCustomerPhone } from "@/lib/customer-phone";

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
  const [step, setStep] = useState<"address" | "payment">("address");
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
      setStep("payment");
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
    return <CheckoutFlowShell currentStep="bag"><p className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted-foreground">Returning to your bag…</p></CheckoutFlowShell>;
  }

  return (
    <CheckoutFlowShell currentStep={step}>
      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7d82]">
              {step === "address" ? "Step 2 of 3" : "Step 3 of 3"}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#25212a] sm:text-3xl">
              {step === "address" ? "Delivery Address" : "Payment"}
            </h1>
          </div>
          {step === "address"
            ? <Link to="/cart" search={{ coupon: coupon || undefined }} className="inline-flex items-center gap-2 text-sm text-[#51474c] hover:text-[#ed145b]"><ArrowLeft className="size-4" /> Back to bag</Link>
            : <button type="button" onClick={() => setStep("address")} className="inline-flex items-center gap-2 text-sm text-[#51474c] hover:text-[#ed145b]"><ArrowLeft className="size-4" /> Change address</button>}
        </div>

        {loading ? (
          <p role="status" className="border border-[#eee6e8] bg-white px-5 py-8 text-sm text-[#777078]">Loading your delivery details…</p>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)] lg:gap-7">
            <div className="space-y-5">
              {step === "address" ? (
                <section className="border border-[#eee6e8] bg-white p-4 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7d82]">Deliver to</p>
                      <h2 className="mt-1 text-lg font-semibold text-[#302a30]">Choose your address</h2>
                    </div>
                    {addresses.length > 0 && <button type="button" onClick={() => setShowAddressForm((open) => !open)} className="text-sm font-medium text-[#ed145b] underline underline-offset-4">{showAddressForm ? "Cancel" : "Add address"}</button>}
                  </div>
                  {addresses.length > 0 && (
                    <div className="mt-5 space-y-3">
                      {addresses.map((address) => (
                        <label key={address.id} className={`flex cursor-pointer gap-3 border p-4 transition-colors ${selectedId === address.id ? "border-[#ed145b] bg-[#fff6f8]" : "border-[#eee6e8] hover:border-[#d9a7b7]"}`}>
                          <input type="radio" name="delivery-address" checked={selectedId === address.id} onChange={() => setSelectedId(address.id)} className="mt-1 accent-[#ed145b]" />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2 font-medium text-[#302a30]">{address.name}{address.isDefault && <span className="text-xs font-semibold uppercase tracking-wider text-[#ed145b]">Default</span>}</span>
                            <span className="mt-1 block text-sm text-[#6f666c]">{formatCustomerPhone(address.phone)}</span>
                            <span className="mt-2 block text-sm leading-relaxed text-[#51474c]">{formatAddress(address)}</span>
                          </span>
                          {selectedId === address.id && <Check className="size-5 shrink-0 text-[#ed145b]" aria-label="Selected" />}
                        </label>
                      ))}
                    </div>
                  )}
                  {showAddressForm && (
                    <div className="mt-5 border border-[#eee6e8] bg-[#fffafb] p-4 sm:p-5">
                      <h3 className="font-semibold text-[#302a30]">{addresses.length ? "Add another address" : "Add your delivery address"}</h3>
                      <p className="mt-1 text-sm text-[#777078]">This address will also be saved to your profile.</p>
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
                              className="w-full border border-[#e6dcdf] bg-white px-3 py-2.5 text-base outline-none focus:border-[#ed145b]"
                            />
                          </label>
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-[#777078]">Phone number: {formatCustomerPhone(customer?.phone)}</p>
                      <button type="button" disabled={savingAddress} onClick={() => void saveAddress()} className="mt-4 bg-[#ed145b] px-5 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-white hover:bg-[#bd104a] disabled:opacity-50">{savingAddress ? "Saving address…" : "Save and continue to payment"}</button>
                    </div>
                  )}
                  {addresses.length > 0 && !showAddressForm && (
                    <button type="button" disabled={!selectedId} onClick={() => setStep("payment")} className="mt-5 inline-flex items-center justify-center gap-2 bg-[#ed145b] px-5 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-white hover:bg-[#bd104a] disabled:cursor-not-allowed disabled:opacity-50">
                      Continue to payment <ArrowLeft className="size-4 rotate-180" />
                    </button>
                  )}
                </section>
              ) : (
                <>
                  <section className="border border-[#eee6e8] bg-white p-4 sm:p-6">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 size-5 shrink-0 text-[#ed145b]" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7d82]">Delivering to</p>
                        {addresses.filter((address) => address.id === selectedId).map((address) => (
                          <div key={address.id} className="mt-2">
                            <p className="font-semibold text-[#302a30]">{address.name} · {formatCustomerPhone(address.phone)}</p>
                            <p className="mt-1 text-sm leading-relaxed text-[#51474c]">{formatAddress(address)}</p>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => setStep("address")} className="ml-auto shrink-0 text-sm font-medium text-[#ed145b] underline underline-offset-4">Change</button>
                    </div>
                  </section>
                  <section className="border border-[#eee6e8] bg-white p-4 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a7d82]">Payment method</p>
                    <h2 className="mt-1 text-lg font-semibold text-[#302a30]">Pay securely with PhonePe</h2>
                    <div className="mt-4 flex items-center gap-3 border border-[#ed145b]/30 bg-[#fff6f8] p-4">
                      <span className="flex size-5 items-center justify-center rounded-full border border-[#ed145b]"><span className="size-2.5 rounded-full bg-[#ed145b]" /></span>
                      <span className="text-sm text-[#302a30]">UPI, cards and net banking</span>
                    </div>
                    <p className="mt-3 flex items-center gap-2 text-sm text-[#6f666c]"><ShieldCheck className="size-4 text-emerald-600" /> You’ll be redirected to PhonePe to complete payment.</p>
                  </section>
                </>
              )}
            </div>

            <aside className="h-fit border border-[#eee6e8] bg-white p-4 sm:p-5 lg:sticky lg:top-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-[#ed145b]" />
                <h2 className="text-base font-semibold text-[#302a30]">Order summary</h2>
              </div>
              <div className="mt-4 divide-y divide-[#eee6e8] border-y border-[#eee6e8]">
                {items.map(({ product, quantity }) => (
                  <div key={`${product.id}-${product.selectedVariantId ?? ""}`} className="flex gap-3 py-3">
                    {product.image ? <img src={product.image} alt="" className="size-16 object-cover" /> : <div role="img" aria-label={`${product.name} image unavailable`} className="flex size-16 shrink-0 items-center justify-center bg-[#f4efe8] px-1 text-center text-xs text-[#777078]">Image unavailable</div>}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#302a30]">{product.name}</p>
                      <p className="mt-1 text-sm text-[#777078]">Qty {quantity}</p>
                    </div>
                    <p className="text-sm">{formatPrice(product.price * quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" className="min-w-0 flex-1 border border-[#e6dcdf] px-3 py-2.5 text-sm outline-none focus:border-[#ed145b]" />
                <button type="button" onClick={() => void applyCoupon()} disabled={!coupon.trim()} className="border border-[#ed145b] px-4 text-xs font-semibold uppercase tracking-[0.1em] text-[#ed145b] disabled:opacity-50">Apply</button>
              </div>
              {couponMessage && <p role="status" className={`mt-2 text-sm ${couponDiscount ? "text-emerald-700" : "text-[#bd104a]"}`}>{couponMessage}</p>}
              <dl className="mt-5 space-y-3 border-t border-[#eee6e8] pt-4 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-[#6f666c]">Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[#6f666c]">Shipping</dt><dd>{shipping ? formatPrice(shipping) : "Free"}</dd></div>
                {couponDiscount > 0 && <div className="flex justify-between gap-3 text-emerald-700"><dt>Discount</dt><dd>−{formatPrice(couponDiscount)}</dd></div>}
                <div className="flex justify-between gap-3 border-t border-[#eee6e8] pt-4 text-base font-semibold text-[#302a30]"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
              </dl>
              {step === "payment" && <button type="button" disabled={!selectedId || !items.length || busy} onClick={() => void placeOrder()} className="mt-5 w-full bg-[#ed145b] px-5 py-3.5 text-sm font-semibold uppercase tracking-[0.1em] text-white hover:bg-[#bd104a] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Redirecting to PhonePe…" : "Pay securely"}</button>}
              {step === "address" && <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[#6f666c]"><ShieldCheck className="size-4 text-emerald-600" /> Secure payment on the next step</p>}
              {step === "payment" && <p className="mt-3 text-center text-xs text-[#777078]">By continuing, you agree to our Terms of Use and Privacy Policy.</p>}
            </aside>
          </div>
        )}
      </main>
    </CheckoutFlowShell>
  );
}
