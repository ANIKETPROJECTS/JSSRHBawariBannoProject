import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Facebook, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";
import logoImage from "../../../attached_assets/Bawari_Banno_Horizontal_Transparent-01_1789242095079.png";

const exploreLinks = [
  { label: "All Sarees", to: "/products" },
  { label: "New Arrival", to: "/new-arrival" },
  { label: "Bestsellers", to: "/bestseller" },
  { label: "Our Story", to: "/about" },
];

const customerLinks = [
  { label: "Contact Us", to: "/contact" },
  { label: "Wishlist", to: "/wishlist" },
  { label: "My Account", to: "/profile" },
  { label: "Shipping & Returns", to: "/contact" },
];

export function Footer() {
  return (
    <footer
      className="mt-8 bg-[#ED145B] font-sans text-white"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-3 border-b border-white/20 py-5 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <img
              src={logoImage}
              alt="Bawari Banno"
              className="h-24 w-80 object-contain object-left sm:h-28 sm:w-[22rem]"
            />
            <p className="mt-1 max-w-sm text-sm font-medium leading-snug text-white sm:text-base">
              Sarees chosen for their colour, craft and the stories they carry forward.
            </p>
          </div>
          <div className="flex flex-col gap-1.5 lg:items-end">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white">
              Follow the house
            </p>
            <div className="flex gap-2.5">
              {[
                { label: "Instagram", Icon: Instagram },
                { label: "Facebook", Icon: Facebook },
                { label: "YouTube", Icon: Youtube },
              ].map(({ label, Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex size-10 items-center justify-center rounded-full border border-white text-white transition-colors hover:bg-white hover:text-[#ED145B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Icon className="size-4" strokeWidth={1.7} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-5 border-b border-white/20 py-5 sm:grid-cols-2 sm:gap-6 sm:py-6 lg:grid-cols-[1.1fr_1fr_1.35fr_1.35fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white">Explore</p>
            <ul className="mt-2 space-y-1 text-base font-medium leading-snug">
              {exploreLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="inline-flex items-center gap-1 text-white transition-opacity hover:opacity-70"
                  >
                    {item.label}
                    <ArrowUpRight className="size-3" strokeWidth={1.7} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white">Customer care</p>
            <ul className="mt-2 space-y-1 text-base font-medium leading-snug">
              {customerLinks.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-white transition-opacity hover:opacity-70">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white">Visit us</p>
            <address className="mt-2 space-y-1.5 text-sm font-medium not-italic leading-snug text-white sm:text-base">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" strokeWidth={1.7} />
                <span>
                  Hubtown Greenwood CHS, Flat No. 805/A Wing, 8th Floor,
                  <br />
                  Pokhran Road No. 1, Vartak Nagar, Thane (W), 400606
                </span>
              </p>
              <a href="tel:+918459769859" className="flex items-center gap-2 hover:opacity-70">
                <Phone className="size-4 shrink-0" strokeWidth={1.7} />
                +91 84597 69859
              </a>
              <a href="mailto:info@bawaribanno.com" className="flex items-center gap-2 hover:opacity-70">
                <Mail className="size-4 shrink-0" strokeWidth={1.7} />
                info@bawaribanno.com
              </a>
            </address>
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white">The Loom Letter</p>
            <p className="mt-2 text-sm font-medium leading-snug text-white sm:text-base">
              New weaves, revival drops and atelier notes, delivered once a month.
            </p>
            <form
              className="mt-2 flex border-b border-white pb-1.5 focus-within:border-white"
              onSubmit={(event) => event.preventDefault()}
            >
              <label className="sr-only" htmlFor="newsletter">
                Email address
              </label>
              <input
                id="newsletter"
                type="email"
                placeholder="your@email.com"
                className="min-w-0 flex-1 bg-transparent text-base font-medium text-white outline-none placeholder:text-white"
              />
              <button
                type="submit"
                className="flex items-center gap-1 text-sm font-medium uppercase tracking-[0.16em] text-white hover:opacity-70"
              >
                Join
                <ArrowUpRight className="size-3" strokeWidth={1.7} />
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 py-2 text-xs font-medium text-white sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Bawari Banno. All rights reserved.</p>
          <p>Crafted in India · Website owned by Sejal Sheshmani Yadav</p>
        </div>
      </div>
    </footer>
  );
}
