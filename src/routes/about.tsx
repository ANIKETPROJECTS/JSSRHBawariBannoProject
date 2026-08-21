import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeading } from "@/components/site/SiteShell";
import storyImage from "@/assets/story.jpg";
import craftImage from "@/assets/craft.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Our Story & Craft — Vastraa Saree Atelier" },
      {
        name: "description",
        content:
          "Three generations of saree sourcing: how Vastraa works with weaving clusters in Kanchipuram, Varanasi and Bengal.",
      },
      { property: "og:title", content: "Our Story & Craft — Vastraa Saree Atelier" },
      {
        property: "og:description",
        content: "How Vastraa sources handwoven sarees directly from Indian weaving families.",
      },
    ],
  }),
  component: About,
});

const heritage = [
  { year: "1974", text: "A single counter in Mylapore, selling Kanchipuram silks on trust." },
  { year: "1998", text: "Direct weaver partnerships begin in Varanasi and Bengal." },
  { year: "2012", text: "The revival programme restores twelve lapsed korvai motifs." },
  { year: "2026", text: "Nine weaving clusters, 240 weaver families, one atelier." },
];

const team = [
  { name: "Kamala Iyer", role: "Founder & Master Buyer" },
  { name: "Rohan Iyer", role: "Weave Revival Lead" },
  { name: "Meera Das", role: "Cluster Relations, Bengal" },
];

function About() {
  return (
    <SiteShell>
      <PageHeading
        eyebrow="About Us"
        title="A house built on six yards"
        intro="Vastraa began as a counter in Mylapore in 1974. Fifty-two years on, we still buy the way we started — loom by loom, family by family."
      />

      <section className="mx-auto mt-16 grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2">
        <img
          src={storyImage}
          alt="Folded silk sarees stacked on wooden shelves"
          loading="lazy"
          width={1200}
          height={900}
          className="w-full border border-border object-cover"
        />
        <div>
          <p className="text-eyebrow text-muted-foreground">Our Story</p>
          <h2 className="mt-2 font-display text-4xl text-primary rule-gold">
            Bought the slow way, on purpose
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            We do not buy from wholesalers. Twice a year our buyers travel to Kanchipuram,
            Varanasi, Bagru and Phulia, sit at the looms, and commission what they see. That
            means fewer sarees on our shelves — and a name attached to each one.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            A pure zari Kanjivaram can take twenty-one days on the loom. We price it so the
            weaver is paid for all twenty-one, not for the fifteen a middleman would allow.
          </p>
        </div>
      </section>

      <section className="mt-24 border-y border-border fabric-texture py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <p className="text-eyebrow text-muted-foreground">Our Craft</p>
            <h2 className="mt-2 font-display text-4xl text-primary rule-gold">
              From cocoon to korvai border
            </h2>
            <ol className="mt-8 space-y-6">
              {[
                ["Sourcing the yarn", "Mulberry silk from Bengaluru, zari drawn in Surat."],
                ["Dyeing", "Small-batch dye lots, tested for colourfastness before weaving."],
                ["The loom", "Pit and jacquard looms; 18–21 days for a bridal Kanjivaram."],
                ["Finishing", "Hand-knotted tassels, steam press, muslin wrap for storage."],
              ].map(([title, text], i) => (
                <li key={title} className="flex gap-5">
                  <span className="font-display text-2xl text-gold">0{i + 1}</span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <img
            src={craftImage}
            alt="Weaver's hands working gold zari thread on a wooden loom"
            loading="lazy"
            width={1200}
            height={900}
            className="order-1 w-full border border-border object-cover md:order-2"
          />
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-5">
        <p className="text-eyebrow text-muted-foreground">Heritage</p>
        <h2 className="mt-2 font-display text-4xl text-primary rule-gold">Fifty-two years</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {heritage.map((item) => (
            <div key={item.year} className="border-t border-gold/50 pt-5">
              <p className="font-display text-3xl text-primary">{item.year}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 grid gap-8 sm:grid-cols-3">
          {team.map((person) => (
            <div key={person.name} className="border border-border bg-card p-7 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-gold/60 font-display text-2xl text-primary">
                {person.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <h3 className="mt-5 font-display text-2xl text-foreground">{person.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {person.role}
              </p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
