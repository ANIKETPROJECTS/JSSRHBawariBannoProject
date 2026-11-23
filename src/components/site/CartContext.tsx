import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Saree } from "@/data/sarees";

export type CartItem = {
  product: Saree;
  quantity: number;
};

export const pendingPaymentCartStorageKey = "bb-phonepe-pending-cart-v1";

type AddItemOptions = {
  showToast?: boolean;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (product: Saree, quantity?: number, options?: AddItemOptions) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  restoreItems: (items: CartItem[]) => void;
  openCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function cartItemKey(product: Saree) {
  return `${product.id}::${product.selectedVariantId ?? ""}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const navigate = useNavigate();
  const clearCart = useCallback(() => setItems([]), []);
  const restoreItems = useCallback((nextItems: CartItem[]) => setItems(nextItems), []);

  const addItem = (product: Saree, quantity = 1, options: AddItemOptions = {}) => {
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
    if (options.showToast !== false) toast.success(`${product.name} added to your bag`);
  };

  const value = useMemo(
    () => ({
      items,
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
        setItems((current) =>
          current.filter((item) => !(item.product.id === productId && (item.product.selectedVariantId ?? "") === (variantId ?? ""))),
        );
      },
      clearCart,
      restoreItems,
      openCart: () => {
        void navigate({ to: "/cart" });
      },
    }),
    [items, navigate, clearCart, restoreItems],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
