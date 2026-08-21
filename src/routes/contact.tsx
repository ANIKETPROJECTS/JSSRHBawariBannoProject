import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { SiteShell, PageHeading } from "@/components/site/SiteShell";
import locationIcon from "../../attached_assets/location_(1)_1787339144815.png";
import phoneIcon from "../../attached_assets/phone-call_1787339180267.png";
import mailIcon from "../../attached_assets/mail_1787339203534.png";
import clockIcon from "../../attached_assets/clock_1787339231150.png";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Visit — Bawari Banno, Chennai" },
      {
        name: "description",
        content:
          "Write to the Bawari Banno atelier or visit our Mylapore, Chennai store. Address, phone, email and store hours.",
      },
      { property: "og:title", content: "Contact & Visit — Bawari Banno" },
      {
        property: "og:description",
        content: "Reach the Bawari Banno atelier in Mylapore, Chennai — address, phone and email.",
      },
    ],
  }),
  component: Contact,
});

const details = [
  { icon: locationIcon, label: "Atelier", value: "14 Mylapore Silk Street, Chennai 600004" },
  { icon: phoneIcon, label: "Phone", value: "+91 98400 21774" },
  { icon: mailIcon, label: "Email", value: "care@vastraa.example" },
  { icon: clockIcon, label: "Hours", value: "Mon–Sat, 10:30am – 8:00pm" },
];

function Contact() {
  return (
    <SiteShell>
      <PageHeading
        eyebrow="Contact Us"
        title="Come sit with the silks"
        intro="Questions on a weave, a bridal commission, or blouse measurements? Write to us, or visit our atelier in Mylapore."
      />

      <section className="mx-auto mt-16 grid max-w-7xl gap-16 px-5 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const phone = new FormData(form).get("phone")?.toString().replace(/\D/g, "") ?? "";
            if (phone.length !== 10) {
              toast.error("Please enter a valid 10-digit Indian mobile number.");
              return;
            }
            toast.success("Thank you — we'll reply within one working day.");
            form.reset();
          }}
          className="border border-border bg-card p-8 sm:p-10"
        >
          <p className="text-eyebrow text-muted-foreground">We would love to hear from you</p>
          <h2 className="mt-3 font-display text-4xl font-light leading-tight text-primary sm:text-5xl">
            Send us a message
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Share your question and our team will get back to you within one working day.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <label htmlFor="name" className="text-eyebrow text-muted-foreground">
                Customer name
              </label>
              <input
                id="name"
                name="name"
                required
                className="mt-2 w-full border-b border-border bg-transparent py-3 text-sm outline-none focus:border-gold"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label htmlFor="phone" className="text-eyebrow text-muted-foreground">
                Mobile number
              </label>
              <div className="mt-2 flex items-center border-b border-border focus-within:border-gold">
                <span className="mr-3 flex items-center gap-2 border-r border-border py-3 pr-3 text-sm">
                  <span aria-hidden="true" className="text-lg leading-none">🇮🇳</span>
                  <span className="text-muted-foreground">+91</span>
                </span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  minLength={10}
                  maxLength={10}
                  onChange={(event) => {
                    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 10);
                  }}
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                  placeholder="98765 43210"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Please enter your 10-digit Indian mobile number.
              </p>
            </div>
            <div>
              <label htmlFor="message" className="text-eyebrow text-muted-foreground">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                className="mt-2 w-full resize-none border-b border-border bg-transparent py-3 text-sm outline-none focus:border-gold"
                placeholder="Tell us how we can help you…"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-9 w-full bg-primary px-8 py-3.5 text-eyebrow text-primary-foreground transition-colors hover:bg-ink"
          >
            Send Message
          </button>
        </form>

        <div>
          <p className="text-eyebrow text-muted-foreground">Find us, call us, write to us</p>
          <h2 className="mt-3 font-display text-4xl font-light leading-tight text-primary sm:text-5xl">
            Visit the atelier
          </h2>
          <ul className="mt-10 grid gap-9 sm:grid-cols-2 lg:grid-cols-1">
            {details.map(({ icon, label, value }) => (
              <li key={label} className="flex items-center gap-5">
                <img
                  src={icon}
                  alt=""
                  className="size-16 shrink-0 object-contain mix-blend-multiply sm:size-20"
                />
                <div>
                  <p className="text-eyebrow text-muted-foreground">{label}</p>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-foreground/85">{value}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-12 border-y border-gold/50 py-8">
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
              <p className="font-display text-3xl font-light text-primary">Mylapore, Chennai</p>
              <p className="max-w-xs px-6 text-xs leading-relaxed text-muted-foreground">
                Two minutes from Kapaleeshwarar Temple tank. Map preview placeholder.
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}