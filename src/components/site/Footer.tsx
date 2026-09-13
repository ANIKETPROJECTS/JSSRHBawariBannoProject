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
      className="mt-12 bg-[#ED145B] text-white"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 border-b border-white/20 py-7 sm:py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <img
              src={logoImage}
              alt="Bawari Banno"
              className="h-16 w-56 object-contain object-left sm:h-20 sm:w-64"
            />
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-white sm:text-sm">
              Sarees chosen for their colour, craft and the stories they carry forward.
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white">
              Follow the house
            </p>
            <div className="flex gap-2">
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

        <div className="grid gap-7 border-b border-white/20 py-7 sm:grid-cols-2 sm:gap-8 sm:py-8 lg:grid-cols-[1.1fr_1fr_1.35fr_1.35fr]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white">Explore</p>
            <ul className="mt-3 space-y-2 text-sm">
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
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white">Customer care</p>
            <ul className="mt-3 space-y-2 text-sm">
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
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white">Visit us</p>
            <address className="mt-3 space-y-2 text-xs not-italic leading-relaxed text-white sm:text-sm">
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
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white">The Loom Letter</p>
            <p className="mt-3 text-xs leading-relaxed text-white sm:text-sm">
              New weaves, revival drops and atelier notes, delivered once a month.
            </p>
            <form
              className="mt-3 flex border-b border-white pb-2 focus-within:border-white"
              onSubmit={(event) => event.preventDefault()}
            >
              <label className="sr-only" htmlFor="newsletter">
                Email address
              </label>
              <input
                id="newsletter"
                type="email"
                placeholder="your@email.com"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white"
              />
              <button
                type="submit"
                className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.16em] text-white hover:opacity-70"
              >
                Join
                <ArrowUpRight className="size-3" strokeWidth={1.7} />
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-2 py-3 text-[0.68rem] text-white sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Bawari Banno. All rights reserved.</p>
          <p>Crafted in India · Website owned by Sejal Sheshmani Yadav</p>
        </div>
      </div>
    </footer>
  );
}
