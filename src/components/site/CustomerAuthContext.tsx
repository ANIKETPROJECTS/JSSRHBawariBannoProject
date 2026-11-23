import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronRight, ShieldCheck, X } from "lucide-react";
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
            aria-label="Sign in with your mobile number"
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto border border-[#f2dce4] bg-white shadow-[0_24px_80px_rgba(31,12,21,0.28)]"
          >
            <button
              type="button"
              aria-label="Close sign in"
              onClick={dismissAuth}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE300]"
            >
              <X className="size-5" />
            </button>
            <div className="relative flex min-h-28 items-center justify-center bg-[#ED145B] px-8 py-5">
              <img src={logoImage} alt="Bawari Banno" className="h-16 w-56 object-contain object-center" />
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-[#FFE300]" />
            </div>
            <div className="px-6 py-7 sm:px-8 sm:py-8">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a6678]">Customer sign in</p>
                <h2 className="mt-2 font-display text-3xl font-medium leading-tight text-[#21151a]">
                  Sign in with your mobile
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#70666b]">
                  {`Enter your number and we'll send a one-time code on WhatsApp. New customers are set up automatically—no separate registration.`}
                </p>
              </div>
              <AccountAccess onComplete={completeLogin} />
            </div>
          </section>
        </div>
      )}
    </CustomerAuthContext.Provider>
  );
}

function AccountAccess({ onComplete }: { onComplete: (customer: Customer) => void }) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await authApi("/api/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) });
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
      const result = await authApi("/api/auth/verify", { method: "POST", body: JSON.stringify({ phone, otp }) });
      if (!result.customer?.phone) throw new Error("Sign in could not be completed. Please try again.");
      onComplete(result.customer);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      {step === "phone" && (
        <>
          <form onSubmit={sendOtp}>
            <label className="block text-xs font-semibold text-[#51434a]">
              Mobile number
              <span className="mt-2 flex w-full items-center border border-[#e5d6dc] bg-[#fffafb] transition-colors focus-within:border-[#ED145B] focus-within:ring-2 focus-within:ring-[#ED145B]/15">
                <span className="border-r border-[#e5d6dc] px-4 py-3.5 text-sm font-medium text-[#51434a]" aria-hidden="true">+91</span>
                <input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="tel-national" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" aria-label="10-digit Indian mobile number" className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm text-[#21151a] outline-none placeholder:text-[#a99aa1]" />
              </span>
            </label>
            <button disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 bg-[#ED145B] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#c90f4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED145B] focus-visible:ring-offset-2 disabled:opacity-50">
              {busy ? "Sending code…" : "Continue with OTP"} <ArrowRight className="size-4" />
            </button>
            <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[#80747a]">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#ED145B]" />
              <p>Secure sign in. Your number is verified with a one-time WhatsApp code.</p>
            </div>
          </form>
        </>
      )}
      {step === "otp" && (
        <form onSubmit={verify}>
          <p className="text-sm leading-relaxed text-[#665b61]">
            Enter the 6-digit code sent to <span className="font-semibold text-[#21151a]">+91 {phone}</span>.
          </p>
          <label className="mt-5 block text-xs font-semibold text-[#51434a]" htmlFor="customer-auth-otp">One-time password</label>
          <input
            id="customer-auth-otp"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            className="mt-2 w-full border border-[#e5d6dc] bg-[#fffafb] px-4 py-3.5 text-center text-xl tracking-[0.5em] text-[#21151a] outline-none transition-colors focus:border-[#ED145B] focus:ring-2 focus:ring-[#ED145B]/15"
          />
          <button disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 bg-[#ED145B] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#c90f4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED145B] focus-visible:ring-offset-2 disabled:opacity-50">
            {busy ? "Verifying…" : "Verify and sign in"} <ChevronRight className="size-4" />
          </button>
          <button type="button" onClick={() => { setStep("phone"); setOtp(""); }} className="mt-4 w-full text-center text-xs font-medium text-[#8a707b] underline underline-offset-4 transition-colors hover:text-[#ED145B]">
            Change mobile number
          </button>
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