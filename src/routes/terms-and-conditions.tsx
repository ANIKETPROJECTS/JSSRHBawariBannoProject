import { createFileRoute } from "@tanstack/react-router";
import { PageHeading, SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Bawari Banno" },
      {
        name: "description",
        content:
          "Read the terms that apply when you browse, order from, or contact the Bawari Banno saree atelier.",
      },
      { property: "og:title", content: "Terms & Conditions — Bawari Banno" },
      {
        property: "og:description",
        content: "The terms that apply to browsing and shopping with Bawari Banno.",
      },
    ],
  }),
  component: TermsAndConditions,
});

const sections = [
  {
    number: "01",
    title: "Using this website",
    paragraphs: [
      "By browsing bawaribanno.com, creating an account, or placing an order, you agree to these Terms & Conditions. If you do not agree with them, please do not use the website or place an order.",
      "You must provide accurate information when you create an account or check out. Please keep your account details and login information secure and let us know if you believe your account has been used without permission.",
    ],
  },
  {
    number: "02",
    title: "Our products",
    paragraphs: [
      "Bawari Banno curates handloom and heirloom sarees from weaving communities across India. Small differences in colour, texture, weave, zari, and finish are natural characteristics of handmade textiles, not defects.",
      "We make reasonable efforts to show colours and product details accurately, but display settings and lighting can affect how a piece appears. Product descriptions, measurements, availability, and images may be updated without notice.",
    ],
  },
  {
    number: "03",
    title: "Orders and payment",
    paragraphs: [
      "Submitting an order is a request to purchase the selected products. An order is accepted when we send an order confirmation. We may decline or cancel an order where a product is unavailable, a price or description contains an obvious error, payment cannot be authorised, or we identify suspected misuse.",
      "The price, applicable taxes, delivery charges, discounts, and the total payable amount will be shown at checkout. Payment must be completed using an available payment method before an order can be dispatched.",
    ],
  },
  {
    number: "04",
    title: "Shipping and delivery",
    paragraphs: [
      "We ship to the address provided at checkout. Delivery estimates are indicative and may be affected by courier capacity, weather, public holidays, remote locations, or events outside our reasonable control.",
      "Please check your order details carefully before submitting payment. If a parcel arrives visibly damaged or appears tampered with, document it and contact us as soon as possible so that we can help with the courier investigation.",
    ],
  },
  {
    number: "05",
    title: "Returns and exchanges",
    paragraphs: [
      "Returns or exchanges are handled according to the eligibility and instructions communicated with the relevant order. A return request may require photographs, the original packaging, tags, and the product to be unused and in its received condition.",
      "Sarees that have been worn, washed, altered, tailored, stained, damaged, or personalised may not be eligible. Any statutory consumer rights that apply to your purchase remain unaffected by these terms.",
    ],
  },
  {
    number: "06",
    title: "Content and intellectual property",
    paragraphs: [
      "The Bawari Banno name, visual identity, product photography, editorial writing, graphics, and website content belong to Bawari Banno or their respective licensors. You may use the website for personal, non-commercial shopping and reference.",
      "Please do not copy, reproduce, modify, distribute, sell, or use our content or brand materials without written permission.",
    ],
  },
  {
    number: "07",
    title: "Website availability and responsibility",
    paragraphs: [
      "We work to keep the website accurate, secure, and available, but we cannot guarantee that it will always be uninterrupted or free from errors. We may suspend or change part of the website for maintenance, security, or operational reasons.",
      "To the extent permitted by law, Bawari Banno is not responsible for losses caused by events outside our reasonable control, misuse of the website, or reliance on information that has changed since it was published.",
    ],
  },
  {
    number: "08",
    title: "Changes and contact",
    paragraphs: [
      "We may update these terms when our services, policies, or legal obligations change. The version published on this page applies to future use and orders after its effective date.",
      "For questions about an order or these terms, contact care@vastraa.example or visit our atelier at 14 Mylapore Silk Street, Chennai 600004.",
    ],
  },
] as const;

function TermsAndConditions() {
  return (
    <SiteShell>
      <PageHeading
        eyebrow="Customer care"
        title="Terms & Conditions"
        intro="A clear guide to browsing, ordering, receiving, and caring for a Bawari Banno piece."
      />

      <section className="section-frame mx-2 mt-12 max-w-7xl px-4 py-7 sm:mx-3 sm:mt-16 sm:px-6 sm:py-10 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.28fr_1fr] lg:gap-16">
          <aside className="h-fit border-b border-gold/50 pb-6 lg:sticky lg:top-32 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
            <p className="text-eyebrow text-muted-foreground">Please read</p>
            <p className="mt-4 font-display text-3xl leading-tight text-primary">
              The fine print, kept human.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              These terms apply to the Bawari Banno online storefront and were last
              updated on 9 September 2026.
            </p>
          </aside>

          <div className="divide-y divide-border">
            {sections.map((section) => (
              <article key={section.number} className="py-8 first:pt-0 last:pb-0">
                <div className="flex items-start gap-4">
                  <span className="pt-1 font-display text-2xl text-gold">{section.number}</span>
                  <div className="min-w-0">
                    <h2 className="font-display text-3xl leading-tight text-primary sm:text-4xl">
                      {section.title}
                    </h2>
                    <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}