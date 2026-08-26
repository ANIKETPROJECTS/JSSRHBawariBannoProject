import { useEffect } from "react";
import { useCustomerAuth } from "./CustomerAuthContext";

export function CustomerGate({ children }: { children: React.ReactNode }) {
  const { customer, checking, openAuth } = useCustomerAuth();

  useEffect(() => {
    if (!checking && !customer) openAuth();
  }, [checking, customer, openAuth]);

  if (customer) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 text-center">
      <div>
        <p className="text-eyebrow text-muted-foreground">Your Bawari Banno account</p>
        <p className="mt-3 text-sm text-muted-foreground">Sign in to view your profile.</p>
        <button type="button" onClick={() => openAuth()} className="mt-5 bg-primary px-5 py-3 text-eyebrow text-white">
          Open sign in
        </button>
      </div>
    </div>
  );
}