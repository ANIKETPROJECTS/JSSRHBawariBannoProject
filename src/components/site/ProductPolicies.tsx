import { useState } from "react";
import { BadgeCheck, ChevronDown, LockKeyhole, RefreshCw } from "lucide-react";
import { categories, type Saree } from "@/data/sarees";

const policies = [
  {
    id: "shipping",
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
    id: "returns",
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
    id: "cancellations",
    title: "Cancellations",
    points: [
      "Orders can be cancelled within 24 hours of placing the order.",
      "Please contact us as soon as possible to request a cancellation.",
      "Once an order is shipped, it cannot be cancelled.",
      "If a parcel is rejected at the time of delivery, the refund will be processed after applicable deductions, including shipping charges.",
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    points: [
      "Product images are captured in natural daylight; actual colours may vary slightly depending on screen settings and brightness.",
      "In handloom and handcrafted products, minor variations in weave, texture, or design are natural and are not considered defects.",
      "Minor irregularities such as thread pulls, slight weaving variations, or yarn differences are inherent to handcrafted fabrics and add to their unique character.",
      "These natural characteristics are not considered defects.",
    ],
  },
];

type ProductAccordionSection =
  | { id: string; title: string; kind: "rows"; rows: Array<[string, string]> }
  | { id: string; title: string; kind: "text"; text: string }
  | { id: string; title: string; kind: "points"; points: string[] };

export function ProductPolicies({ saree }: { saree: Saree }) {
  const [openSection, setOpenSection] = useState("details");
  const categoryLabel = categories.find((category) => category.id === saree.category)?.label
    ?? saree.category.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
  const sections: ProductAccordionSection[] = [
    {
      id: "details",
      title: "PRODUCT DETAILS",
      kind: "rows",
      rows: [
        ["Fabric", saree.fabric],
        ["Category", categoryLabel],
        ["Length", saree.length],
      ].filter(([, value]) => Boolean(value)),
    },
    {
      id: "description",
      title: "PRODUCT DESCRIPTION",
      kind: "text",
      text: saree.productDescription?.trim() || saree.description || "Product description will be added soon.",
    },
    {
      id: "specification",
      title: "PRODUCT SPECIFICATION",
      kind: "rows",
      rows: [
        ["Weight", saree.weight ?? ""],
        ["Care Instructions", saree.care],
        ["Country of Origin", saree.countryOfOrigin || "India"],
        ...(saree.productSpecification?.trim()
          ? [["Additional Specifications", saree.productSpecification.trim()] as [string, string]]
          : []),
      ].filter(([, value]) => Boolean(value)),
    },
    ...policies.map((policy) => ({
      id: policy.id,
      title: policy.title.toUpperCase(),
      kind: "points" as const,
      points: policy.points,
    })),
  ];

  return (
    <div id="product-policies" className="product-detail-accordion">
      {sections.map((section) => {
        const isOpen = openSection === section.id;
        const contentId = `product-accordion-${section.id}`;
        return (
          <section key={section.id} className="product-detail-accordion-item">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={contentId}
              onClick={() => setOpenSection(isOpen ? "" : section.id)}
              className={`product-detail-accordion-trigger${isOpen ? " is-open" : ""}`}
            >
              <span>{section.title}</span>
              <ChevronDown className={`product-detail-accordion-chevron${isOpen ? " is-open" : ""}`} aria-hidden="true" />
            </button>
            <div
              id={contentId}
              className={`product-detail-accordion-panel${isOpen ? " is-open" : ""}`}
              aria-hidden={!isOpen}
            >
              <div className="product-detail-accordion-content">
                {section.kind === "rows" ? (
                  <div className="product-detail-info-table">
                    {section.rows.map(([label, value]) => (
                      <div key={label} className="product-detail-info-row">
                        <span>{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : section.kind === "text" ? (
                  <p>{section.text}</p>
                ) : (
                  <ul className="product-detail-policy-list">
                    {section.points.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function ProductTrustStrip() {
  const trustItems = [
    { label: "Authentic handloom", Icon: BadgeCheck },
    { label: "Easy returns", Icon: RefreshCw },
    { label: "Secure payment", Icon: LockKeyhole },
  ];

  return (
    <div className="product-trust-strip" aria-label="Shopping assurances">
      {trustItems.map(({ label, Icon }) => (
        <div key={label} className="product-trust-item">
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}