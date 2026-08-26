import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

export type Customer = { _id?: string; phone: string; name?: string; email?: string; wishlist?: string[] };

type CustomerAuthContextValue = {
  customer: Customer | null;
  checking: boolean;
  authenticated: boolean;
  openAuth: (afterLogin?: () => void) => void;
  closeAuth: () => void;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

async function authApi(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    credentials: "same-origin",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "Something went wrong.");
  return result;
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [checking, setChecking] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [afterLogin, setAfterLogin] = useState<(() => void) | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await authApi("/api/auth/me");
      setCustomer(result.customer ?? null);
    } catch {
      setCustomer(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onLogin = () => void refresh();
    const onLogout = () => {
      setCustomer(null);
      setIsOpen(false);
      setAfterLogin(null);
    };
    window.addEventListener("customer-login", onLogin);
    window.addEventListener("customer-logout", onLogout);
    return () => {
      window.removeEventListener("customer-login", onLogin);
      window.removeEventListener("customer-logout", onLogout);
    };
  }, [refresh]);

  const closeAuth = useCallback(() => {
    setIsOpen(false);
    setAfterLogin(null);
  }, []);

  const openAuth = useCallback((callback?: () => void) => {
    if (customer) {
      callback?.();
      return;
    }
    setAfterLogin(() => callback ?? null);
    setIsOpen(true);
  }, [customer]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAuth();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeAuth, isOpen]);

  useEffect(() => {
    if (!isOpen || checking || !customer) return;
    setIsOpen(false);
    const callback = afterLogin;
    setAfterLogin(null);
    callback?.();
  }, [afterLogin, checking, customer, isOpen]);

  const completeLogin = useCallback((nextCustomer: Customer) => {
    setCustomer(nextCustomer);
    setIsOpen(false);
    window.dispatchEvent(new Event("customer-login"));
    const callback = afterLogin;
    setAfterLogin(null);
    callback?.();
  }, [afterLogin]);

  const value = useMemo(() => ({
    customer,
    checking,
    authenticated: Boolean(customer),
    openAuth,
    closeAuth,
  }), [checking, closeAuth, customer, openAuth]);

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/65 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Sign in to Bawari Banno"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAuth();
          }}
        >
          <div className="relative grid max-h-[min(720px,calc(100vh-2rem))] w-full max-w-4xl overflow-y-auto border border-border bg-white shadow-2xl md:grid-cols-[0.9fr_1.1fr]">
            <button type="button" onClick={closeAuth} className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-primary" aria-label="Close sign in">
              <X className="size-4" />
            </button>
            <div className="flex min-h-[250px] flex-col justify-between bg-[#fbf0f5] p-7 md:min-h-[520px] md:p-10">
              <div>
                <p className="font-display text-3xl tracking-tight text-primary">Bawari Banno</p>
                <div className="mt-8 flex size-24 items-center justify-center border border-gold/40 bg-white/80 font-display text-4xl text-gold md:size-32 md:text-5xl">BB</div>
              </div>
              <div className="mt-8 max-w-xs">
                <h2 className="font-display text-3xl leading-tight text-primary md:text-4xl">Welcome to Bawari Banno</h2>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Discover handpicked sarees and timeless heirlooms, saved favourites, and a simpler way to follow every order.</p>
              </div>
            </div>
            <div className="flex items-center p-7 md:p-12">
              {checking ? (
                <div className="w-full py-16 text-center text-sm text-muted-foreground">Checking your account…</div>
              ) : (
                <AccountAccess onComplete={completeLogin} />
              )}
            </div>
          </div>
        </div>
      )}
    </CustomerAuthContext.Provider>
  );
}

function AccountAccess({ onComplete }: { onComplete: (customer: Customer) => void }) {
  const [step, setStep] = useState<"phone" | "otp" | "details">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const stepNumber = step === "phone" ? 1 : step === "otp" ? 2 : 3;

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await authApi("/api/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) });
      setStep("otp");
      toast.success("Demo OTP sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await authApi("/api/auth/verify", { method: "POST", body: JSON.stringify({ phone, otp }) });
      if (result.customer?.name) onComplete(result.customer);
      else setStep("details");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDetails(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const customer = await authApi("/api/auth/profile", { method: "PUT", body: JSON.stringify({ name, email }) });
      toast.success("Your account has been created.");
      onComplete(customer);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <p className="text-eyebrow text-muted-foreground">Welcome to Bawari Banno</p>
        <span className="text-xs text-muted-foreground">{stepNumber}/3</span>
      </div>
      <h2 className="mt-4 font-display text-3xl text-primary md:text-4xl">{step === "phone" ? "Create your account" : step === "otp" ? "Verify your number" : "Complete your details"}</h2>
      <div className="mt-6 flex gap-1">
        {[1, 2, 3].map((item) => <div key={item} className={`h-1 flex-1 ${item <= stepNumber ? "bg-primary" : "bg-border"}`} />)}
      </div>
      {step === "phone" && (
        <form onSubmit={sendOtp}>
          <label className="mt-9 block text-eyebrow text-muted-foreground">Mobile number<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} placeholder="Enter 10-digit mobile number" className="mt-3 w-full border-b border-border px-0 py-3 text-sm outline-none focus:border-gold" /></label>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">We’ll send a one-time password to verify your number. No password required.</p>
          <button disabled={busy} className="mt-8 flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 text-eyebrow text-white transition-colors hover:bg-ink disabled:opacity-50">{busy ? "Sending…" : "Continue"} <ArrowRight className="size-3.5" /></button>
          <p className="mt-5 text-center text-xs text-muted-foreground">Use any valid 10-digit number · Demo OTP: 123456</p>
        </form>
      )}
      {step === "otp" && (
        <form onSubmit={verify}>
          <label className="mt-9 block text-eyebrow text-muted-foreground">One-time password<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} placeholder="123456" className="mt-3 w-full border-b border-border px-0 py-3 text-sm tracking-[0.4em] outline-none focus:border-gold" /></label>
          <p className="mt-4 text-xs text-muted-foreground">Use demo OTP <strong className="font-medium text-primary">123456</strong>.</p>
          <button disabled={busy} className="mt-8 flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 text-eyebrow text-white transition-colors hover:bg-ink disabled:opacity-50">{busy ? "Verifying…" : "Verify and continue"} <ChevronRight className="size-3.5" /></button>
        </form>
      )}
      {step === "details" && (
        <form onSubmit={saveDetails}>
          <label className="mt-8 block text-eyebrow text-muted-foreground">Your name<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-3 w-full border-b border-border px-0 py-3 text-sm outline-none focus:border-gold" /></label>
          <label className="mt-6 block text-eyebrow text-muted-foreground">Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-3 w-full border-b border-border px-0 py-3 text-sm outline-none focus:border-gold" /></label>
          <button disabled={busy} className="mt-8 flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 text-eyebrow text-white transition-colors hover:bg-ink disabled:opacity-50">{busy ? "Saving…" : "Create account"} <Check className="size-3.5" /></button>
        </form>
      )}
    </div>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  return context;
}