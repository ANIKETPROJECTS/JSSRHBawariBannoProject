import { createFileRoute } from "@tanstack/react-router";
import { PageHeading, SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/shipping-policy")({
  head: () => ({
    meta: [
      { title: "Shipping Policy | Bawari Banno" },
      {
        name: "description",
        content: "Find dispatch, delivery, and tracking information for Bawari Banno orders.",
      },
    ],
  }),
  component: ShippingPolicy,
});

function ShippingPolicy() {
  return (
    <SiteShell>
      <PageHeading
        eyebrow="Customer care"
        title="Shipping Policy"
        intro="A quick guide to how your Bawari Banno order is dispatched and delivered."
      />
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-display text-3xl text-primary">Dispatch</h2>
            <p className="mt-3">Orders are usually dispatched within 1–2 business days.</p>
          </section>
          <section>
            <h2 className="font-display text-3xl text-primary">Delivery and tracking</h2>
            <p className="mt-3">
              Domestic delivery typically takes 3–6 business days after dispatch. Orders are sent
              through trusted courier partners, and tracking details are shared once your order is
              dispatched.
            </p>
          </section>
          <section>
            <h2 className="font-display text-3xl text-primary">Need help?</h2>
            <p className="mt-3">
              Delivery estimates can be affected by unforeseen delays. For help with an order, email{" "}
              <a className="text-primary underline underline-offset-4" href="mailto:info@bawaribanno.com">
                info@bawaribanno.com
              </a>{" "}
              or call{" "}
              <a className="text-primary underline underline-offset-4" href="tel:+918459769859">
                +91 84597 69859
              </a>.
            </p>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
