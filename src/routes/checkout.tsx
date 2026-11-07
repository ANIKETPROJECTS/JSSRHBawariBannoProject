import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MapPin, ShieldCheck, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { useCart } from "@/components/site/CartDrawer";
import { useCustomerAuth } from "@/components/site/CustomerAuthContext";
import { calculateShippingCharge } from "@/lib/phonepe-test-shipping";
import { formatPrice } from "@/data/sarees";

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
    if (checking) return;
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
  }, [checking, customer, initialCoupon, navigate, openAuth]);

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

  return <SiteShell><main className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
    <p className="text-eyebrow text-muted-foreground">A thoughtful final step</p>
    <h1 className="mt-2 font-display text-4xl font-light text-primary sm:text-5xl">Checkout</h1>
    {loading ? <p className="mt-8 text-sm text-muted-foreground">Loading your delivery details…</p> :
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <section className="border border-border bg-card p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><MapPin className="size-4 text-primary" /><h2 className="font-display text-2xl text-primary">Delivery address</h2></div>{addresses.length > 0 && <button type="button" onClick={() => setShowAddressForm((open) => !open)} className="text-xs text-primary underline underline-offset-4">{showAddressForm ? "Cancel" : "Add address"}</button>}</div>
            {addresses.length > 0 && <div className="mt-5 space-y-3">{addresses.map((address) => <label key={address.id} className={`flex cursor-pointer gap-3 border p-4 transition-colors ${selectedId === address.id ? "border-primary bg-[#fff6f8]" : "border-border hover:border-gold"}`}><input type="radio" name="delivery-address" checked={selectedId === address.id} onChange={() => setSelectedId(address.id)} className="mt-1 accent-[#ed145b]" /><span className="min-w-0"><span className="block font-medium text-primary">{address.name} {address.isDefault && <span className="ml-2 text-xs text-[#ed145b]">Default</span>}</span><span className="mt-1 block text-xs text-muted-foreground">+91 {address.phone}</span><span className="mt-2 block text-sm leading-relaxed">{formatAddress(address)}</span></span></label>)}</div>}
            {showAddressForm && <div className="mt-5 border border-border bg-[#fbf9f6] p-4 sm:p-5"><h3 className="font-medium text-primary">{addresses.length ? "Add another address" : "Add your delivery address"}</h3><p className="mt-1 text-xs text-muted-foreground">This address will also be saved to your profile.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">
              {([
                ["name", "Full name", "text"],
                ["addressLine", "House / street address", "text"],
                ["locality", "Area / locality", "text"],
                ["pincode", "6-digit pincode", "numeric"],
                ["city", "City", "text"],
                ["state", "State", "text"],
                ["landmark", "Landmark (optional)", "text"],
              ] as const).map(([field, label, type]) => <label key={field} className={field === "addressLine" ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs text-muted-foreground">{label}</span><input value={addressForm[field]} onChange={(event) => setAddressForm((current) => ({ ...current, [field]: field === "pincode" ? event.target.value.replace(/\D/g, "").slice(0, 6) : event.target.value }))} inputMode={type === "numeric" ? "numeric" : undefined} maxLength={field === "pincode" ? 6 : undefined} required={field !== "landmark"} className="w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold" /></label>)}
            </div><p className="mt-3 text-xs text-muted-foreground">Phone number: +91 {customer?.phone ?? ""}</p><button type="button" disabled={savingAddress} onClick={() => void saveAddress()} className="mt-4 bg-primary px-5 py-3 text-eyebrow text-white disabled:opacity-50">{savingAddress ? "Saving address…" : "Save and continue"}</button></div>}
          </section>
          <section className="border border-border bg-card p-5 sm:p-7"><p className="text-eyebrow text-muted-foreground">Payment method</p><div className="mt-4 flex items-center gap-3 border border-[#ed145b]/30 bg-[#fff6f8] p-4"><span className="flex size-5 items-center justify-center rounded-full border border-[#ed145b]"><span className="size-2.5 rounded-full bg-[#ed145b]" /></span><span className="text-sm text-primary">PhonePe · UPI, cards and net banking</span></div></section>
        </div>
        <aside className="h-fit border border-border bg-card p-5 sm:p-7 lg:sticky lg:top-6"><div className="flex items-center gap-2"><ShoppingBag className="size-4 text-primary" /><h2 className="font-display text-2xl text-primary">Order summary</h2></div>
          {items.length ? <div className="mt-5 divide-y divide-border border-y border-border">{items.map(({ product, quantity }) => <div key={`${product.id}-${product.selectedVariantId ?? ""}`} className="flex gap-3 py-3"><img src={product.image} alt="" className="size-16 object-cover" /><div className="min-w-0 flex-1"><p className="text-sm text-primary">{product.name}</p><p className="mt-1 text-xs text-muted-foreground">Qty {quantity}</p></div><p className="text-sm">{formatPrice(product.price * quantity)}</p></div>)}</div> : <p className="mt-5 border-y border-border py-5 text-sm text-muted-foreground">Your bag is empty.</p>}
          <div className="mt-5 flex gap-2"><input value={coupon} onChange={(event) => setCoupon(event.target.value.toUpperCase())} placeholder="Coupon code" className="min-w-0 flex-1 border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /><button type="button" onClick={() => void applyCoupon()} className="border border-primary px-4 text-eyebrow text-primary">Apply</button></div>{couponMessage && <p className="mt-2 text-xs text-muted-foreground">{couponMessage}</p>}
          <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{shipping ? formatPrice(shipping) : "Free"}</dd></div>{couponDiscount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd>−{formatPrice(couponDiscount)}</dd></div>}<div className="flex justify-between border-t border-border pt-4 font-semibold text-primary"><dt>Total</dt><dd>{formatPrice(total)}</dd></div></dl>
          <button type="button" disabled={!selectedId || !items.length || busy} onClick={() => void placeOrder()} className="mt-5 w-full bg-primary px-5 py-4 text-eyebrow text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Starting secure payment…" : "Place order"}</button><p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" /> Secure checkout · Easy returns · Personal assistance</p>
        </aside>
      </div>}
  </main></SiteShell>;
}
