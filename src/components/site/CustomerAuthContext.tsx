import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import logoImage from "../../../attached_assets/Bawari_Banno_Horizontal_Transparent-01_1789242095079.png";

export type Customer = { _id?: string; phone: string; name?: string; email?: string; wishlist?: string[] };

type CustomerAuthContextValue = {
  customer: Customer | null;
  checking: boolean;
  authenticated: boolean;
  openAuth: (afterLogin?: () => void) => void;
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
  const [authOpen, setAuthOpen] = useState(false);
  const refreshSequence = useRef(0);
  const afterLoginRef = useRef<(() => void) | undefined>(undefined);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const result = await authApi("/api/auth/me");
      if (sequence === refreshSequence.current) setCustomer(result.customer ?? null);
    } catch {
      if (sequence === refreshSequence.current) setCustomer(null);
    } finally {
      if (sequence === refreshSequence.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onLogout = () => {
      refreshSequence.current += 1;
      setCustomer(null);
      setChecking(false);
    };
    window.addEventListener("customer-logout", onLogout);
    return () => {
      window.removeEventListener("customer-logout", onLogout);
    };
  }, [refresh]);

  const openAuth = useCallback((callback?: () => void) => {
    if (customer) {
      callback?.();
      return;
    }
    afterLoginRef.current = callback;
    setAuthOpen(true);
  }, [customer]);

  const dismissAuth = () => {
    afterLoginRef.current = undefined;
    setAuthOpen(false);
  };

  const completeLogin = useCallback((nextCustomer: Customer) => {
    setCustomer(nextCustomer);
    setAuthOpen(false);
    const callback = afterLoginRef.current;
    afterLoginRef.current = undefined;
    if (callback) window.setTimeout(callback, 0);
  }, []);

  const value = useMemo(() => ({
    customer,
    checking,
    authenticated: Boolean(customer),
    openAuth,
  }), [checking, customer, openAuth]);

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
      {authOpen && !customer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dismissAuth();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Sign in or create an account"
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto border border-border bg-white p-6 shadow-2xl sm:p-9"
          >
            <button
              type="button"
              aria-label="Close sign in"
              onClick={dismissAuth}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <X className="size-5" />
            </button>
            <div className="mb-6 pr-8">
              <div className="flex w-full justify-center rounded-sm bg-[#5b1728] px-4 py-4">
                <div className="inline-flex rounded-sm bg-[#ED145B] px-3 py-1.5">
                  <img src={logoImage} alt="Bawari Banno" className="h-12 w-48 object-contain object-center" />
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Sign in or create an account to continue with your purchase.</p>
            </div>
            <AccountAccess onComplete={completeLogin} />
          </section>
        </div>
      )}
    </CustomerAuthContext.Provider>
  );
}

function AccountAccess({ onComplete }: { onComplete: (customer: Customer) => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [step, setStep] = useState<"phone" | "otp" | "details">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const stepNumber = step === "details" ? 2 : 1;
  const totalSteps = mode === "signup" ? 2 : 1;

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await authApi("/api/auth/send-otp", { method: "POST", body: JSON.stringify({ phone, mode }) });
      setStep("otp");
      toast.success("OTP sent to your WhatsApp number.");
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
      const result = await authApi("/api/auth/verify", { method: "POST", body: JSON.stringify({ phone, otp, mode }) });
      if (mode === "login" || (result.customer?.name && result.customer?.email)) onComplete(result.customer);
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
        <p className="text-eyebrow text-muted-foreground">{mode === "signup" ? "Create your account" : "Customer login"}</p>
        <span className="text-xs text-muted-foreground">{stepNumber}/{totalSteps}</span>
      </div>
      <h2 className="mt-4 font-display text-3xl text-primary md:text-4xl">{step === "phone" ? (mode === "signup" ? "Create your account" : "Log in to your account") : step === "otp" ? "Verify your number" : "Complete your details"}</h2>
      <div className="mt-6 flex gap-1">
        {Array.from({ length: totalSteps }, (_, index) => index + 1).map((item) => <div key={item} className={`h-1 flex-1 ${item <= stepNumber ? "bg-primary" : "bg-border"}`} />)}
      </div>
      {step === "phone" && (
        <>
          <div className="mt-7 grid grid-cols-2 border-b border-border" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")} className={`border-b-2 px-3 py-3 text-sm transition-colors ${mode === "signup" ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground"}`}>Create account</button>
            <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")} className={`border-b-2 px-3 py-3 text-sm transition-colors ${mode === "login" ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground"}`}>Log in</button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {mode === "signup"
              ? "Already have an account? Choose Log in and enter the WhatsApp number registered with Bawari Banno."
              : "Enter the WhatsApp number registered with your account to receive a login code."}
          </p>
          <form onSubmit={sendOtp}>
            <label className="mt-7 block text-eyebrow text-muted-foreground">
              Mobile number
              <span className="mt-3 flex w-full items-center border-b border-border focus-within:border-gold">
                <span className="border-r border-border py-3 pr-3 text-sm font-medium text-primary" aria-hidden="true">+91</span>
                <input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="tel-national" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter 10-digit mobile number" aria-label="10-digit Indian mobile number" className="w-full px-3 py-3 text-sm outline-none" />
              </span>
            </label>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">We’ll send a one-time password to your WhatsApp number. No password required.</p>
            <button disabled={busy} className="mt-8 flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 text-eyebrow text-white transition-colors hover:bg-ink disabled:opacity-50">{busy ? "Sending…" : mode === "signup" ? "Continue" : "Send login code"} <ArrowRight className="size-3.5" /></button>
          </form>
        </>
      )}
      {step === "otp" && (
        <form onSubmit={verify}>
          <label className="mt-9 block text-eyebrow text-muted-foreground">One-time password<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} placeholder="123456" className="mt-3 w-full border-b border-border px-0 py-3 text-sm tracking-[0.4em] outline-none focus:border-gold" /></label>
          <p className="mt-4 text-xs text-muted-foreground">Enter the 6-digit code sent to your WhatsApp number.</p>
          <button disabled={busy} className="mt-8 flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 text-eyebrow text-white transition-colors hover:bg-ink disabled:opacity-50">{busy ? "Verifying…" : "Verify and continue"} <ChevronRight className="size-3.5" /></button>
          <div className="mt-5 flex flex-wrap justify-between gap-3 text-xs">
            <button type="button" onClick={() => { setStep("phone"); setOtp(""); }} className="text-muted-foreground underline underline-offset-4">Change number</button>
            {mode === "login" && <button type="button" onClick={() => setMode("signup")} className="text-primary underline underline-offset-4">Create an account instead</button>}
          </div>
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