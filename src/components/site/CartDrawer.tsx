import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Minus, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, type Saree } from "@/data/sarees";
import { cn } from "@/lib/utils";
import { useCustomerAuth } from "./CustomerAuthContext";

type CartItem = {
  product: Saree;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Saree, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

type StoreCoupon = {
  code: string;
  label?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  minimumSubtotal?: number;
  maxDiscount?: number | null;
  productScope?: "all" | "specific";
  productIds?: string[];
};

const CartContext = createContext<CartContextValue | null>(null);

function cartItemKey(product: Saree) {
  return `${product.id}::${product.selectedVariantId ?? ""}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (product: Saree, quantity = 1) => {
    if (product.variants?.length && !product.selectedVariantId) {
      toast.error("Choose a color before adding this product to your bag.");
      return;
    }
    setItems((current) => {
      const key = cartItemKey(product);
      const existing = current.find((item) => cartItemKey(item.product) === key);
      if (existing) {
        return current.map((item) =>
          cartItemKey(item.product) === key
            ? { ...item, quantity: Math.min(9, item.quantity + quantity) }
            : item,
        );
      }
      return [...current, { product, quantity: Math.min(9, quantity) }];
    });
    setIsOpen(true);
    toast.success(`${product.name} added to your bag`);
  };

  const value = useMemo(
    () => ({
      items,
      isOpen,
      addItem,
      updateQuantity: (productId: string, quantity: number, variantId?: string) => {
        setItems((current) =>
          current
            .map((item) =>
              item.product.id === productId && (item.product.selectedVariantId ?? "") === (variantId ?? "")
                ? { ...item, quantity: Math.max(0, Math.min(9, quantity)) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        );
      },
      removeItem: (productId: string, variantId?: string) => {
        setItems((current) => current.filter((item) => !(item.product.id === productId && (item.product.selectedVariantId ?? "") === (variantId ?? ""))));
      },
      clearCart: () => setItems([]),
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [isOpen, items],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, clearCart } = useCart();
  const { openAuth } = useCustomerAuth();
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState<StoreCoupon[]>([]);
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<string | null>(null);

  async function checkout() {
    setCheckingOut(true);
    try {
      const sessionResponse = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!sessionResponse.ok) {
        closeCart();
        toast.info("Please log in before proceeding to checkout.");
        openAuth();
        return;
      }
      const response = await fetch("/api/inventory/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: items.map(({ product, quantity }) => ({ productId: product.id, variantId: product.selectedVariantId, quantity })), couponCode: appliedCoupon, subtotal, shipping, discount, total }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Checkout could not be completed.");
      clearCart();
      closeCart();
      setOrderConfirmation(result.orderId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout could not be completed.");
    } finally {
      setCheckingOut(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [closeCart, isOpen]);

  useEffect(() => {
    fetch("/api/store-config")
      .then((response) => response.json())
      .then((result) => setAvailableCoupons(Array.isArray(result.coupons) ? result.coupons : []))
      .catch(() => setAvailableCoupons([]));
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 15000 ? 0 : 250;
  const total = Math.max(0, subtotal + shipping - discount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const freeShippingProgress = Math.min(100, (subtotal / 15000) * 100);

  useEffect(() => {
    if (!appliedCoupon) return;
    setAppliedCoupon("");
    setDiscount(0);
    setCouponMessage({ ok: false, text: "Your cart changed. Apply the coupon again to recalculate it." });
  }, [subtotal]);

  return (
    <>
      <div
        aria-hidden={!isOpen}
        onClick={closeCart}
        className={cn(
          "fixed inset-0 z-[60] bg-ink/35 transition-opacity duration-300",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
        className={cn(
          "fixed right-0 top-0 z-[70] flex h-full w-full max-w-[440px] flex-col bg-white shadow-2xl transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-eyebrow text-muted-foreground">Your selection</p>
            <h2 className="mt-1 font-display text-3xl font-light text-primary">Your bag</h2>
          </div>
          <button type="button" onClick={closeCart} aria-label="Close cart" className="p-2 text-foreground/70 hover:text-primary">
            <X className="size-5" strokeWidth={1.4} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {items.length === 0 ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
              <ShoppingBag className="size-10 text-primary/60" strokeWidth={1.1} />
              <h3 className="mt-5 font-display text-3xl font-light text-primary">Your bag is waiting</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Add a saree from our collection and it will appear here.
              </p>
              <button type="button" onClick={closeCart} className="mt-7 bg-primary px-7 py-3 text-eyebrow text-primary-foreground hover:bg-ink">
                Continue shopping
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-border pb-5">
                <div className="flex items-start justify-between gap-3 text-[0.7rem] sm:text-xs">
                  <span className="max-w-[15rem] leading-relaxed text-muted-foreground">Free shipping on orders above ₹15,000</span>
                  <span className="text-primary">{Math.round(freeShippingProgress)}%</span>
                </div>
                <div className="mt-3 h-1 bg-secondary">
                  <div className="h-full bg-gold transition-all" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>

              <div className="divide-y divide-border">
                {items.map(({ product, quantity }) => (
                  <div key={cartItemKey(product)} className="flex gap-3 py-5 sm:gap-4">
                    <img src={product.image} alt={product.name} className="aspect-[3/4] w-16 shrink-0 object-cover sm:w-20" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div>
                          <p className="text-eyebrow text-muted-foreground">{product.fabric}</p>
                          <h3 className="mt-1 text-sm leading-snug text-foreground">{product.name}</h3>
                          {product.selectedVariantColor && <p className="mt-1 text-xs text-muted-foreground">Color: {product.selectedVariantColor}</p>}
                        </div>
                        <button type="button" onClick={() => removeItem(product.id, product.selectedVariantId)} aria-label={`Remove ${product.name}${product.selectedVariantColor ? ` in ${product.selectedVariantColor}` : ""}`} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="size-4" strokeWidth={1.4} />
                        </button>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center border border-border">
                          <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(product.id, quantity - 1, product.selectedVariantId)} className="p-1.5 text-foreground/70 hover:text-primary">
                            <Minus className="size-3" strokeWidth={1.8} />
                          </button>
                          <span className="w-7 text-center text-xs">{quantity}</span>
                          <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(product.id, quantity + 1, product.selectedVariantId)} className="p-1.5 text-foreground/70 hover:text-primary">
                            <Plus className="size-3" strokeWidth={1.8} />
                          </button>
                        </div>
                        <p className="text-sm text-primary">{formatPrice(product.price * quantity)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            <div className="border-y border-border py-5">
                <div className="flex items-center gap-2">
                  <Tag className="size-4 text-primary" strokeWidth={1.4} />
                  <p className="text-sm text-foreground">Have a coupon?</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={coupon}
                    onChange={(event) => {
                      setCoupon(event.target.value.toUpperCase());
                      setCouponMessage(null);
                    }}
                    placeholder="Enter code"
                    className="min-w-0 flex-1 border border-border bg-white px-3 py-2.5 text-xs outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    disabled={couponBusy || !coupon.trim()}
                    onClick={async () => {
                      setCouponBusy(true);
                      try {
                        const response = await fetch("/api/coupons/validate", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ code: coupon, items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })) }),
                        });
                        const result = await response.json().catch(() => ({}));
                        if (!response.ok) throw new Error(result.error ?? "Coupon could not be applied.");
                        setAppliedCoupon(String(result.code ?? coupon).toUpperCase());
                        setDiscount(Math.max(0, Number(result.discount ?? 0)));
                        setCouponMessage({ ok: true, text: `${String(result.code ?? coupon).toUpperCase()} applied — you save ${formatPrice(Number(result.discount ?? 0))}.` });
                        toast.success(`${String(result.code ?? coupon).toUpperCase()} applied.`);
                      } catch (error) {
                        setAppliedCoupon("");
                        setDiscount(0);
                        setCouponMessage({ ok: false, text: error instanceof Error ? error.message : "Coupon could not be applied." });
                        toast.error(error instanceof Error ? error.message : "Coupon could not be applied.");
                      } finally {
                        setCouponBusy(false);
                      }
                    }}
                    className="border border-primary px-4 text-eyebrow text-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {couponBusy ? "Checking…" : "Apply"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableCoupons.map(({ code }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCoupon(code)}
                      className="border border-border px-2 py-1 text-[0.65rem] text-primary transition-colors hover:border-gold hover:bg-secondary"
                    >
                      {code}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[0.7rem] text-muted-foreground">
                  {availableCoupons.length ? "Available coupons from the store:" : "No active coupons are available right now."}
                </p>
                {couponMessage && <p role="status" className={`mt-3 border px-3 py-2 text-xs ${couponMessage.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{couponMessage.text}</p>}
              </div>

              <div className="space-y-3 py-5 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal ({itemCount} items)</span><span>{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{shipping ? formatPrice(shipping) : "Free"}</span></div>
                {discount > 0 && <div className="flex justify-between text-emerald-deep"><span>Coupon discount</span><span>− {formatPrice(discount)}</span></div>}
                <div className="flex justify-between border-t border-border pt-4 text-base text-primary"><span>Total</span><span>{formatPrice(total)}</span></div>
                <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border bg-white px-4 py-4 sm:px-6 sm:py-5">
            <button
              type="button"
              onClick={() => void checkout()}
              disabled={checkingOut}
              className="flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-eyebrow text-primary-foreground hover:bg-ink"
            >
              {checkingOut ? "Processing…" : "Proceed to checkout"} <ChevronRight className="size-4" strokeWidth={1.5} />
            </button>
            <p className="mt-3 text-center text-[0.7rem] text-muted-foreground">Secure checkout · Easy returns · Personal assistance</p>
          </div>
        )}
      </aside>
      {orderConfirmation && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/45 p-5" role="dialog" aria-modal="true" aria-labelledby="order-confirmation-title">
          <div className="w-full max-w-md border border-gold/40 bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-gold bg-gold/10 text-2xl text-gold">✓</div>
            <p className="mt-6 text-eyebrow text-gold">Order confirmed</p>
            <h2 id="order-confirmation-title" className="mt-2 font-display text-4xl text-primary">Thank you for buying from us.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Your demo order has been recorded successfully. We expect it to be delivered within <strong className="font-medium text-foreground">3–5 business days</strong>.
            </p>
            <div className="mt-6 border-y border-border py-4 text-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Order number</p>
              <p className="mt-1 font-medium tracking-wide text-primary">{orderConfirmation}</p>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              This is a demo checkout for now. Payment collection and delivery partner updates will be added in the next phase.
            </p>
            <button
              type="button"
              onClick={() => setOrderConfirmation(null)}
              className="mt-7 w-full bg-primary px-6 py-3.5 text-eyebrow text-primary-foreground transition-colors hover:bg-ink"
            >
              Continue shopping
            </button>
          </div>
        </div>
      )}
    </>
  );
}