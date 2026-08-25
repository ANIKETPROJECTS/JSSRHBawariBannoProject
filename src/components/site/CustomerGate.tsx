import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Customer = { _id?: string; phone: string; name?: string; email?: string };
type Step = "phone" | "otp" | "details";
let cachedCustomer: Customer | null | undefined;

async function authApi(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "Something went wrong.");
  return result;
}

export function CustomerGate({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null | undefined>(cachedCustomer);
  const [checking, setChecking] = useState(cachedCustomer === undefined);
  useEffect(() => {
    if (cachedCustomer !== undefined) return;
    authApi("/api/auth/me").then((result) => { cachedCustomer = result.customer; setCustomer(result.customer); }).catch(() => { cachedCustomer = null; setCustomer(null); }).finally(() => setChecking(false));
  }, []);
  if (checking) return <>{children}</>;
  if (customer) return <>{children}</>;
  return <AccountAccess onComplete={setCustomer} />;
}

function AccountAccess({ onComplete }: { onComplete: (customer: Customer) => void }) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("9876543210");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function sendOtp(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await authApi("/api/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) }); setStep("otp"); toast.success("Demo OTP sent."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not send OTP."); } finally { setBusy(false); }
  }
  function finish(customer: Customer) {
    cachedCustomer = customer;
    onComplete(customer);
    if (window.location.pathname !== "/") window.location.assign("/");
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const result = await authApi("/api/auth/verify", { method: "POST", body: JSON.stringify({ phone, otp }) });
      if (result.customer?.name) finish(result.customer); else setStep("details");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Verification failed."); } finally { setBusy(false); }
  }
  async function saveDetails(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try { const customer = await authApi("/api/auth/profile", { method: "PUT", body: JSON.stringify({ name, email }) }); toast.success("Your account has been created."); finish(customer); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your details."); } finally { setBusy(false); }
  }
  const stepNumber = step === "phone" ? 1 : step === "otp" ? 2 : 3;
  return <section className="min-h-[calc(100vh-4rem)] bg-[#fbfaf7] px-5 py-12 md:px-10 lg:py-16"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_440px]"><div className="max-w-xl"><p className="text-eyebrow text-muted-foreground">A private space for your edit</p><h1 className="mt-5 font-display text-5xl font-light leading-[1.05] text-primary md:text-7xl">Your heirlooms, all in one place.</h1><p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground">Create your Bawari Banno account to save favourite sarees, follow every delivery and keep your preferred address ready for the next occasion.</p><div className="mt-12 grid grid-cols-3 gap-5 border-t border-gold/40 pt-5 text-xs text-muted-foreground"><div><p className="text-eyebrow text-gold">01</p><p className="mt-2">One-tap checkout</p></div><div><p className="text-eyebrow text-gold">02</p><p className="mt-2">Order updates</p></div><div><p className="text-eyebrow text-gold">03</p><p className="mt-2">Saved favourites</p></div></div></div><div className="border border-border bg-white p-7 shadow-sm md:p-9"><div className="flex items-center justify-between"><p className="text-eyebrow text-muted-foreground">Welcome to Bawari Banno</p><span className="text-sm text-muted-foreground">{stepNumber}/3</span></div><h2 className="mt-3 font-display text-3xl text-primary">{step === "phone" ? "Create your account" : step === "otp" ? "Verify your number" : "Complete your details"}</h2><div className="mt-5 flex gap-1">{[1, 2, 3].map((item) => <div key={item} className={`h-1 flex-1 ${item <= stepNumber ? "bg-primary" : "bg-border"}`} />)}</div>{step === "phone" && <form onSubmit={sendOtp}><label className="mt-9 block text-eyebrow text-muted-foreground">Mobile number<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} className="mt-3 w-full border-b border-border px-0 py-3 text-sm outline-none focus:border-gold" /></label><p className="mt-4 text-xs leading-relaxed text-muted-foreground">We’ll send a one-time password to verify your number. No password required.</p><button disabled={busy} className="mt-8 flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 text-eyebrow text-white disabled:opacity-50">{busy ? "Sending…" : "Send OTP"} <ArrowRight className="size-3.5" /></button><p className="mt-5 text-center text-xs text-muted-foreground">Demo account: 9876543210 · OTP: 123456</p></form>}{step === "otp" && <form onSubmit={verify}><label className="mt-9 block text-eyebrow text-muted-foreground">Demo OTP<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="mt-3 w-full border-b border-border px-0 py-3 text-sm tracking-[0.4em] outline-none focus:border-gold" /></label><p className="mt-4 text-xs text-muted-foreground">Use demo OTP <strong className="font-medium text-primary">123456</strong>.</p><button disabled={busy} className="mt-8 flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 text-eyebrow text-white disabled:opacity-50">{busy ? "Verifying…" : "Verify and continue"} <ChevronRight className="size-3.5" /></button></form>}{step === "details" && <form onSubmit={saveDetails}><label className="mt-8 block text-eyebrow text-muted-foreground">Your name<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-3 w-full border-b border-border px-0 py-3 text-sm outline-none focus:border-gold" /></label><label className="mt-6 block text-eyebrow text-muted-foreground">Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-3 w-full border-b border-border px-0 py-3 text-sm outline-none focus:border-gold" /></label><button disabled={busy} className="mt-8 flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 text-eyebrow text-white disabled:opacity-50">{busy ? "Saving…" : "Create account"} <Check className="size-3.5" /></button></form>}</div></div></section>;
}