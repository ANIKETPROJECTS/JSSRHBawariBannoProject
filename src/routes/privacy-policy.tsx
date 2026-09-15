import { createFileRoute } from "@tanstack/react-router";
import { PageHeading } from "@/components/site/SiteShell";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Bawari Banno" },
      {
        name: "description",
        content: "Read the Bawari Banno privacy policy and website ownership information.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <SiteShell>
      <PageHeading
        eyebrow="Your privacy"
        title="Privacy Policy"
        intro="We keep your information focused on fulfilling orders, supporting your shopping experience and maintaining a safe storefront."
      />
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="space-y-10 text-base leading-relaxed text-muted-foreground">
          <section>
            <h2 className="font-display text-3xl text-primary">Website ownership</h2>
            <p className="mt-3 text-foreground">Website owned by Sejal Sheshmani Yadav</p>
          </section>
          <section>
            <h2 className="font-display text-3xl text-primary">Information we use</h2>
            <p className="mt-3">
              We use the details you provide to process purchases, arrange delivery, respond to questions,
              manage your account and improve the Bawari Banno shopping experience.
            </p>
          </section>
          <section>
            <h2 className="font-display text-3xl text-primary">Questions</h2>
            <p className="mt-3">
              For privacy questions or requests about your information, contact us at info@bawaribanno.com.
            </p>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}