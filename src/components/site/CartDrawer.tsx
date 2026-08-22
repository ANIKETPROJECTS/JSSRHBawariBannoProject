import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Minus, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatPrice, type Saree } from "@/data/sarees";
import { cn } from "@/lib/utils";

type CartItem = {
  product: Saree;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Saree, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (product: Saree, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
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
      updateQuantity: (productId: string, quantity: number) => {
        setItems((current) =>
          current
            .map((item) =>
              item.product.id === productId
                ? { ...item, quantity: Math.max(0, Math.min(9, quantity)) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        );
      },
      removeItem: (productId: string) => {
        setItems((current) => current.filter((item) => item.product.id !== productId));
      },
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
  const { items, isOpen, closeCart, updateQuantity, removeItem } = useCart();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);

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

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 15000 ? 0 : 250;
  const total = Math.max(0, subtotal + shipping - discount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const freeShippingProgress = Math.min(100, (subtotal / 15000) * 100);

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
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <p className="text-eyebrow text-muted-foreground">Your selection</p>
            <h2 className="mt-1 font-display text-3xl font-light text-primary">Your bag</h2>
          </div>
          <button type="button" onClick={closeCart} aria-label="Close cart" className="p-2 text-foreground/70 hover:text-primary">
            <X className="size-5" strokeWidth={1.4} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {subtotal >= 15000 ? "You have unlocked free shipping" : "Free shipping on orders above ₹15,000"}
                  </span>
                  <span className="text-primary">{Math.round(freeShippingProgress)}%</span>
                </div>
                <div className="mt-3 h-1 bg-secondary">
                  <div className="h-full bg-gold transition-all" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>

              <div className="divide-y divide-border">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex gap-4 py-5">
                    <img src={product.image} alt={product.name} className="size-24 shrink-0 object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-eyebrow text-muted-foreground">{product.fabric}</p>
                          <h3 className="mt-1 text-sm leading-snug text-foreground">{product.name}</h3>
                        </div>
                        <button type="button" onClick={() => removeItem(product.id)} aria-label={`Remove ${product.name}`} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="size-4" strokeWidth={1.4} />
                        </button>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center border border-border">
                          <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(product.id, quantity - 1)} className="p-1.5 text-foreground/70 hover:text-primary">
                            <Minus className="size-3" strokeWidth={1.8} />
                          </button>
                          <span className="w-7 text-center text-xs">{quantity}</span>
                          <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(product.id, quantity + 1)} className="p-1.5 text-foreground/70 hover:text-primary">
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
                    onChange={(event) => setCoupon(event.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="min-w-0 flex-1 border border-border bg-white px-3 py-2.5 text-xs outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (coupon === "BAWARI10") {
                        setDiscount(Math.round(subtotal * 0.1));
                        toast.success("10% discount applied");
                      } else {
                        toast.error("Try the demo code BAWARI10");
                      }
                    }}
                    className="border border-primary px-4 text-eyebrow text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    Apply
                  </button>
                </div>
                <p className="mt-2 text-[0.7rem] text-muted-foreground">Demo coupon: BAWARI10</p>
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
          <div className="border-t border-border bg-white px-6 py-5">
            <button
              type="button"
              onClick={() => toast.success("Checkout is ready for the next step in this demo.")}
              className="flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-eyebrow text-primary-foreground hover:bg-ink"
            >
              Proceed to checkout <ChevronRight className="size-4" strokeWidth={1.5} />
            </button>
            <p className="mt-3 text-center text-[0.7rem] text-muted-foreground">Secure checkout · Easy returns · Personal assistance</p>
          </div>
        )}
      </aside>
    </>
  );
}