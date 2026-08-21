import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Heart, LogOut, MapPin, Package, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { formatPrice, sarees } from "@/data/sarees";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile | Bawari Banno" },
      {
        name: "description",
        content: "Manage your Bawari Banno profile, orders, saved sarees and delivery details.",
      },
    ],
  }),
  component: Profile,
});

const profileLinks = [
  { label: "Account details", icon: UserRound },
  { label: "My orders", icon: Package },
  { label: "Wishlist", icon: Heart },
  { label: "Saved addresses", icon: MapPin },
];

function Profile() {
  const [activeLink, setActiveLink] = useState("Account details");
  const [editing, setEditing] = useState(false);

  const handleProfileLink = (label: string) => {
    setActiveLink(label);
    if (label !== "Account details") {
      toast.info(`${label} will be available here soon.`);
    }
  };

  return (
    <SiteShell>
      <section className="fabric-texture border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:py-16">
          <p className="text-eyebrow text-muted-foreground">Your Bawari Banno</p>
          <h1 className="mt-3 font-display text-5xl font-light text-primary md:text-6xl">
            Welcome back, Ananya
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Your personal space for heirlooms, orders and the little details that make every
            drape feel yours.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[260px_1fr] lg:gap-14 lg:py-16">
        <aside>
          <div className="border border-border bg-card p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">
                AK
              </div>
              <div className="min-w-0">
                <p className="font-display text-2xl text-primary">Ananya Kapoor</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">ananya@example.com</p>
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-eyebrow text-muted-foreground">Member since</p>
              <p className="mt-1 text-sm text-foreground">August 2024</p>
            </div>
          </div>

          <nav className="mt-5 border border-border bg-background p-2">
            {profileLinks.map(({ label, icon: Icon }) => {
              const active = activeLink === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleProfileLink(label)}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors ${
                    active
                      ? "bg-secondary text-primary"
                      : "text-foreground/70 hover:bg-secondary/60 hover:text-primary"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={1.5} />
                  <span>{label}</span>
                  {active && <ChevronRight className="ml-auto size-3.5" strokeWidth={1.5} />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => toast.info("You are safely signed out of this demo profile.")}
              className="mt-1 flex w-full items-center gap-3 border-t border-border px-3 py-3 text-left text-sm text-foreground/60 transition-colors hover:text-primary"
            >
              <LogOut className="size-4" strokeWidth={1.5} />
              Sign out
            </button>
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Orders placed", "03"],
              ["Saved sarees", "07"],
              ["Loyalty points", "240"],
            ].map(([label, value]) => (
              <div key={label} className="border border-border bg-card p-5">
                <p className="font-display text-4xl font-light text-primary">{value}</p>
                <p className="mt-2 text-eyebrow text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-eyebrow text-muted-foreground">Personal details</p>
                <h2 className="mt-2 font-display text-3xl font-light text-primary">
                  Account details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing((current) => !current)}
                className="inline-flex items-center gap-2 text-sm text-primary transition-colors hover:text-ink"
              >
                <Pencil className="size-3.5" strokeWidth={1.5} />
                {editing ? "Cancel" : "Edit details"}
              </button>
            </div>

            <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {[
                ["Full name", "Ananya Kapoor"],
                ["Email address", "ananya@example.com"],
                ["Phone number", "+91 98765 43210"],
                ["Date of birth", "18 September 1995"],
              ].map(([label, value]) => (
                <label key={label} className="block">
                  <span className="text-eyebrow text-muted-foreground">{label}</span>
                  <input
                    defaultValue={value}
                    readOnly={!editing}
                    className={`mt-2 w-full border-b bg-transparent py-2 text-sm text-foreground outline-none transition-colors ${
                      editing
                        ? "border-gold focus:border-primary"
                        : "border-border cursor-default"
                    }`}
                  />
                </label>
              ))}
            </div>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  toast.success("Your profile details have been updated.");
                }}
                className="mt-8 bg-primary px-7 py-3 text-eyebrow text-primary-foreground transition-colors hover:bg-ink"
              >
                Save changes
              </button>
            )}
          </div>

          <div className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-eyebrow text-muted-foreground">Most recent</p>
                <h2 className="mt-2 font-display text-3xl font-light text-primary">Your orders</h2>
              </div>
              <button
                type="button"
                onClick={() => handleProfileLink("My orders")}
                className="text-sm text-primary hover:text-ink"
              >
                View all
              </button>
            </div>
            <div className="mt-5 divide-y divide-border border-y border-border">
              {[
                ["BB-2408-019", "12 August 2026", "Delivered", sarees[0]],
                ["BB-2407-014", "28 July 2026", "In transit", sarees[3]],
              ].map(([order, date, status, saree]) => (
                <div key={order as string} className="flex items-center gap-4 py-4">
                  <img
                    src={(saree as (typeof sarees)[number]).image}
                    alt=""
                    className="size-16 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{order as string}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{date as string}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm text-foreground">
                      {formatPrice((saree as (typeof sarees)[number]).price)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-deep">{status as string}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 border border-gold/40 bg-secondary/40 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="text-eyebrow text-primary">A little more room for beauty</p>
              <p className="mt-2 font-display text-2xl text-primary">Continue browsing your edit</p>
            </div>
            <Link
              to="/products"
              className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:text-ink sm:mt-0"
            >
              Explore sarees <ChevronRight className="size-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}