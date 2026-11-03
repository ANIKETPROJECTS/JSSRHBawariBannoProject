import { createFileRoute } from "@tanstack/react-router";
import { PageHeading, SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/return-refund-policy")({
  head: () => ({
    meta: [
      { title: "Return & Refund Policy | Bawari Banno" },
      {
        name: "description",
        content: "Read how to report an incorrect or defective Bawari Banno order.",
      },
    ],
  }),
  component: ReturnRefundPolicy,
});

function ReturnRefundPolicy() {
  return (
    <SiteShell>
      <PageHeading
        eyebrow="Customer care"
        title="Return & Refund Policy"
        intro="If something is wrong with your order, contact us promptly so we can review it."
      />
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-display text-3xl text-primary">Report an issue</h2>
            <p className="mt-3">
              If you receive an incorrect or defective product, contact us within 24 hours of
              delivery. A clear parcel-opening video without pauses or cuts is required for a return
              or exchange request.
            </p>
          </section>
          <section>
            <h2 className="font-display text-3xl text-primary">Refunds and replacements</h2>
            <p className="mt-3">
              Once the returned product is received and passes our quality check, we will process an
              eligible refund or replacement. If pickup is unavailable for your pin code, you may
              need to ship the product back; return courier charges are reimbursed with the product
              refund after the quality check.
            </p>
          </section>
          <section>
            <h2 className="font-display text-3xl text-primary">Please note</h2>
            <p className="mt-3">
              Colour-change requests are not accepted. Minor variations in colour, weave, texture,
              or threadwork are natural in handloom products and are not considered defects.
            </p>
          </section>
          <p>
            To report an issue, email{" "}
            <a className="text-primary underline underline-offset-4" href="mailto:info@bawaribanno.com">
              info@bawaribanno.com
            </a>{" "}
            or call{" "}
            <a className="text-primary underline underline-offset-4" href="tel:+918459769859">
              +91 84597 69859
            </a>.
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
