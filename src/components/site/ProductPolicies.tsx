import { useState } from "react";
import { ChevronDown } from "lucide-react";

const policies = [
  {
    title: "Shipping & Delivery",
    points: [
      "Orders are dispatched within 1–2 business days.",
      "Domestic delivery typically takes 3–6 business days after dispatch.",
      "All orders are shipped through trusted courier partners.",
      "Tracking details are shared once your order is dispatched.",
      "Delivery timelines may occasionally be affected by unforeseen external factors. We will keep you updated and support you through any delay.",
    ],
  },
  {
    title: "Return & Refund",
    points: [
      "If you receive a defective or incorrect product, we will arrange a return or replacement.",
      "A clear parcel-opening video without pauses or cuts is mandatory for any return or exchange request.",
      "Any issue must be reported within 24 hours of receiving the parcel.",
      "Once the returned product is received and passes our quality check, the refund or replacement will be processed.",
      "If your pin code is non-serviceable for a pickup, you may need to self-ship the product. In that case, we will reimburse return courier charges along with the product refund after the quality check.",
      "Colour-change requests are not accepted.",
      "Minor variations in colour, weave, texture, or threadwork are natural in handloom products and are not considered defects.",
    ],
  },
  {
    title: "Cancellations",
    points: [
      "Orders can be cancelled within 24 hours of placing the order.",
      "Please contact us as soon as possible to request a cancellation.",
      "Once an order is shipped, it cannot be cancelled.",
      "If a parcel is rejected at the time of delivery, the refund will be processed after applicable deductions, including shipping charges.",
    ],
  },
  {
    title: "Disclaimer",
    points: [
      "Product images are captured in natural daylight; actual colours may vary slightly depending on screen settings and brightness.",
      "In handloom and handcrafted products, minor variations in weave, texture, or design are natural and are not considered defects.",
      "Minor irregularities such as thread pulls, slight weaving variations, or yarn differences are inherent to handcrafted fabrics and add to their unique character.",
      "These natural characteristics are not considered defects.",
    ],
  },
];

export function ProductPolicies() {
  const [openPolicy, setOpenPolicy] = useState(policies[0].title);

  return (
    <div id="product-policies" className="mt-8 border-t border-border">
      {policies.map((policy) => {
        const isOpen = openPolicy === policy.title;
        const contentId = `product-policy-${policy.title.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`;
        return (
        <div key={policy.title} className="border-b border-border">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={contentId}
            onClick={() => setOpenPolicy(isOpen ? "" : policy.title)}
            className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-primary"
          >
            <span>{policy.title}</span>
            <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.6} />
          </button>
          {isOpen && (
            <ul id={contentId} className="space-y-2 pb-5 pr-5 text-xs leading-relaxed text-muted-foreground">
              {policy.points.map((point) => <li key={point} className="relative pl-3 before:absolute before:left-0 before:content-['•']">{point}</li>)}
            </ul>
          )}
        </div>
        );
      })}
    </div>
  );
}