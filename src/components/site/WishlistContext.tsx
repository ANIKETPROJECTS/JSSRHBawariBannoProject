import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useCustomerAuth } from "./CustomerAuthContext";

type WishlistContextValue = {
  ids: string[];
  count: number;
  loaded: boolean;
  authenticated: boolean;
  toggle: (productId: string) => Promise<boolean>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { openAuth } = useCustomerAuth();
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/wishlist", { credentials: "same-origin" });
      if (!response.ok) {
        setIds([]);
        setAuthenticated(false);
        return;
      }
      const result = await response.json();
      setIds((result.wishlist ?? []).map(String));
      setAuthenticated(true);
    } catch {
      setIds([]);
      setAuthenticated(false);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onLogin = () => void refresh();
    const onLogout = () => {
      setIds([]);
      setAuthenticated(false);
      setLoaded(true);
    };
    window.addEventListener("customer-login", onLogin);
    window.addEventListener("customer-logout", onLogout);
    return () => {
      window.removeEventListener("customer-login", onLogin);
      window.removeEventListener("customer-logout", onLogout);
    };
  }, [refresh]);

  const toggle = useCallback(async (productId: string) => {
    try {
      const response = await fetch("/api/auth/wishlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ productId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) {
          toast.info("Please log in before saving items to your wishlist.");
          openAuth();
        } else {
          toast.error(result.error ?? "Could not update your wishlist.");
        }
        return false;
      }
      setIds((result.wishlist ?? []).map(String));
      setAuthenticated(true);
      setLoaded(true);
      return true;
    } catch {
      toast.error("Could not update your wishlist.");
      return false;
    }
  }, [openAuth]);

  const value = useMemo(() => ({
    ids,
    count: ids.length,
    loaded,
    authenticated,
    toggle,
  }), [authenticated, ids, loaded, toggle]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}