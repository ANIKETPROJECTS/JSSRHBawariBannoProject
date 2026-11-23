import type { ReactNode } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoImage from "../../../attached_assets/Bawari_Banno_Horizontal_Transparent-01_1789242095079.png";
import "./checkout-flow.css";

export type CheckoutStep = "bag" | "address" | "payment";

const steps: { id: CheckoutStep; label: string }[] = [
  { id: "bag", label: "Bag" },
  { id: "address", label: "Address" },
  { id: "payment", label: "Payment" },
];

export function CheckoutFlowShell({
  currentStep,
  children,
}: {
  currentStep: CheckoutStep;
  children: ReactNode;
}) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <div className="checkout-flow-page flex min-h-screen flex-col bg-[#fffdfd] text-[#28232a]">
      <header className="border-b border-[#eee7e9] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Bawari Banno home" className="shrink-0 bg-[#ed145b] px-2 py-1">
            <img src={logoImage} alt="Bawari Banno" className="h-auto w-28 object-contain sm:w-36" />
          </Link>
          <div className="order-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#78887e] sm:text-xs md:order-3">
            <ShieldCheck className="size-5 fill-emerald-500 text-white" aria-hidden="true" />
            <span>100% Secure</span>
          </div>
          <nav aria-label="Checkout progress" className="order-3 flex w-full items-center justify-center gap-2 sm:gap-3 md:order-2 md:w-auto md:flex-1">
            {steps.map((step, index) => {
              const isComplete = index < currentIndex;
              const isCurrent = index === currentIndex;
              return (
                <div key={step.id} className="flex items-center gap-2 sm:gap-3">
                  {index > 0 && <span aria-hidden="true" className="w-5 border-t border-dashed border-[#d9cdd1] sm:w-9" />}
                  <span
                    aria-current={isCurrent ? "step" : undefined}
                    className={`text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-xs ${
                      isCurrent || isComplete ? "text-[#ed145b]" : "text-[#8f898c]"
                    }`}
                  >
                    {step.label}
                  </span>
                  {isComplete && <Check className="size-3.5 text-emerald-600" aria-label="Complete" />}
                </div>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="w-full flex-1">{children}</main>
      <footer className="border-t border-[#eee7e9] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-[#746d71] sm:px-6">
          <span>Need help with your order?</span>
          <div className="flex gap-4">
            <Link to="/contact" className="hover:text-[#ed145b]">Contact us</Link>
            <Link to="/privacy-policy" className="hover:text-[#ed145b]">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
