import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, ChevronRight, X } from "lucide-react";
import { getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { toast } from "sonner";
import logoImage from "../../../attached_assets/Bawari_Banno_Horizontal_Transparent-01_1789242095079.png";
import { formatCustomerPhone, parsePhoneForCountry, phoneCountryOptions } from "@/lib/customer-phone";

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
            <div className="relative flex h-20 items-center justify-center bg-[#ED145B] px-8">
              <img src={logoImage} alt="Bawari Banno" className="relative z-[1] h-20 w-64 object-contain object-center" />
            </div>
            <div className="px-6 py-7 sm:px-8 sm:py-8">
              <div className="mb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a6678] sm:text-sm">Welcome to Bawari Banno</p>
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
  const [country, setCountry] = useState<CountryCode>("IN");
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const selectedCountry = phoneCountryOptions.find((option) => option.country === country);

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    const normalizedPhone = parsePhoneForCountry(phone, country);
    if (!normalizedPhone) {
      toast.error("Enter a valid mobile number for the selected country.");
      return;
    }
    setBusy(true);
    try {
      await authApi("/api/auth/send-otp", { method: "POST", body: JSON.stringify({ phone: normalizedPhone }) });
      setVerifiedPhone(normalizedPhone);
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
      const result = await authApi("/api/auth/verify", { method: "POST", body: JSON.stringify({ phone: verifiedPhone, otp }) });
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
      <div className="mb-5">
        <h2 className="whitespace-nowrap font-display text-2xl font-medium leading-tight text-[#21151a] sm:text-sm">
          {step === "phone" ? "Enter mobile number" : "Enter verification code"}
        </h2>
        <p className="mt-2 text-base leading-relaxed text-[#70666b]">
          {step === "phone" ? "We'll send you a verification code on WhatsApp." : `Enter the code sent to ${formatCustomerPhone(verifiedPhone)}.`}
        </p>
      </div>
      {step === "phone" && (
        <>
          <form onSubmit={sendOtp}>
            <div className="block">
              <span className="sr-only">Mobile number</span>
              <span className="mt-2 flex w-full items-center border border-[#e5d6dc] bg-[#fffafb] transition-colors focus-within:border-[#ED145B] focus-within:ring-2 focus-within:ring-[#ED145B]/15">
                <span className="relative flex h-full w-[112px] shrink-0 items-center gap-1.5 border-r border-[#e5d6dc] px-2 text-[#51434a]">
                  <span aria-hidden="true" className="text-lg leading-none">{selectedCountry?.flag}</span>
                  <span aria-hidden="true" className="text-sm font-semibold">+{selectedCountry?.callingCode}</span>
                  <ChevronDown aria-hidden="true" className="ml-auto size-3.5 shrink-0" />
                  <select
                    aria-label={`Country calling code${selectedCountry ? `, ${selectedCountry.name}` : ""}`}
                    value={country}
                    onChange={(event) => {
                      setCountry(event.target.value as CountryCode);
                      setPhone("");
                    }}
                    className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
                  >
                    {phoneCountryOptions.map((option) => (
                      <option key={option.country} value={option.country}>{option.flag} +{option.callingCode} {option.name}</option>
                    ))}
                  </select>
                </span>
                <input
                  required
                  inputMode="tel"
                  autoComplete="tel-national"
                  maxLength={Math.max(4, 15 - getCountryCallingCode(country).length)}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                  placeholder="Mobile number"
                  aria-label="Mobile number"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-base text-[#21151a] outline-none placeholder:text-[#a99aa1]"
                />
              </span>
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#51434a] sm:text-base">
              <input
                required
                type="checkbox"
                checked={hasAcceptedTerms}
                onChange={(event) => setHasAcceptedTerms(event.target.checked)}
                className="mt-1 size-5 shrink-0 accent-[#ED145B]"
              />
              <span>
                By continuing, I agree to the{" "}
                <Link to="/terms-and-conditions" className="font-semibold text-[#ED145B] underline underline-offset-2">Terms of Use</Link>
                {" & "}
                <Link to="/privacy-policy" className="font-semibold text-[#ED145B] underline underline-offset-2">Privacy Policy</Link>
                {" and confirm that I am above 18 years old."}
              </span>
            </label>
            <button
              disabled={busy || !hasAcceptedTerms}
              className={`mt-5 flex w-full items-center justify-center gap-2 px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED145B] focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                hasAcceptedTerms ? "bg-[#ED145B] hover:bg-[#c90f4c]" : "bg-[#979ba1]"
              }`}
            >
              {busy ? "Sending code…" : "Login with OTP"} <ArrowRight className="size-4" />
            </button>
          </form>
        </>
      )}
      {step === "otp" && (
        <form onSubmit={verify}>
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
          <button type="button" onClick={() => { setStep("phone"); setOtp(""); setVerifiedPhone(""); }} className="mt-4 w-full text-center text-xs font-medium text-[#8a707b] underline underline-offset-4 transition-colors hover:text-[#ED145B]">
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