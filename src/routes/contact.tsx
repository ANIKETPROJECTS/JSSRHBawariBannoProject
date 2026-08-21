import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { SiteShell, PageHeading } from "@/components/site/SiteShell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Visit — Vastraa Saree Atelier, Chennai" },
      {
        name: "description",
        content:
          "Write to the Vastraa atelier or visit our Mylapore, Chennai store. Address, phone, email and store hours.",
      },
      { property: "og:title", content: "Contact & Visit — Vastraa Saree Atelier" },
      {
        property: "og:description",
        content: "Reach the Vastraa atelier in Mylapore, Chennai — address, phone and email.",
      },
    ],
  }),
  component: Contact,
});

const details = [
  { icon: MapPin, label: "Atelier", value: "14 Mylapore Silk Street, Chennai 600004" },
  { icon: Phone, label: "Phone", value: "+91 98400 21774" },
  { icon: Mail, label: "Email", value: "care@vastraa.example" },
  { icon: Clock, label: "Hours", value: "Mon–Sat, 10:30am – 8:00pm" },
];

function Contact() {
  return (
    <SiteShell>
      <PageHeading
        eyebrow="Contact Us"
        title="Come sit with the silks"
        intro="Questions on a weave, a bridal commission, or blouse measurements? Write to us, or visit the atelier in Mylapore."
      />

      <section className="mx-auto mt-16 grid max-w-7xl gap-14 px-5 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Thank you — we'll reply within one working day.");
            (e.target as HTMLFormElement).reset();
          }}
          className="border border-border bg-card p-8"
        >
          <h2 className="font-display text-3xl text-primary rule-gold">Send a note</h2>

          <div className="mt-8 space-y-6">
            <div>
              <label htmlFor="name" className="text-eyebrow text-muted-foreground">
                Your name
              </label>
              <input
                id="name"
                required
                className="mt-2 w-full border-b border-border bg-transparent py-2.5 text-sm outline-none focus:border-gold"
                placeholder="Kamala Iyer"
              />
            </div>
            <div>
              <label htmlFor="email" className="text-eyebrow text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-2 w-full border-b border-border bg-transparent py-2.5 text-sm outline-none focus:border-gold"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="message" className="text-eyebrow text-muted-foreground">
                Message
              </label>
              <textarea
                id="message"
                rows={5}
                required
                className="mt-2 w-full resize-none border-b border-border bg-transparent py-2.5 text-sm outline-none focus:border-gold"
                placeholder="I'm looking for a Kanjivaram in deep green…"
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
          <h2 className="font-display text-3xl text-primary rule-gold">Visit the atelier</h2>
          <ul className="mt-8 space-y-6">
            {details.map(({ icon: Icon, label, value }) => (
              <li key={label} className="flex gap-4">
                <span className="mt-0.5 border border-gold/50 p-2.5 text-primary">
                  <Icon className="size-4" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-eyebrow text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm text-foreground/85">{value}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 border border-border fabric-texture">
            <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 text-center">
              <MapPin className="size-7 text-primary" strokeWidth={1.3} />
              <p className="font-display text-2xl text-primary">Mylapore, Chennai</p>
              <p className="max-w-xs px-6 text-xs text-muted-foreground">
                Two minutes from Kapaleeshwarar Temple tank. Map preview placeholder.
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
