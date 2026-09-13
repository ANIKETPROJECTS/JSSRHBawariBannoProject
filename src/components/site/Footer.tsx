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

const policyLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Return & Refund Policy", href: "/return-refund-policy" },
];

export function Footer() {
  return (
    <footer
      className="mt-8 bg-[#ED145B] font-sans text-white"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-10">
        <div className="grid gap-6 border-b border-white/20 py-5 sm:py-6 lg:grid-cols-[minmax(220px,0.75fr)_minmax(0,2.25fr)] lg:gap-10">
          <div className="flex flex-col gap-3 lg:pt-1">
            <img
              src={logoImage}
              alt="Bawari Banno"
              className="h-28 w-[22rem] object-contain object-left sm:h-32 sm:w-[26rem]"
            />
            <p className="mt-1 max-w-sm text-sm font-medium leading-snug text-white sm:text-base">
              Sarees chosen for their colour, craft and the stories they carry forward.
            </p>
            <p className="text-sm font-medium leading-snug text-white sm:text-base">
              Website owned by Sejal Sheshmani Yadav
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
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

          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
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
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white">Policies</p>
            <ul className="mt-2 space-y-1 text-base font-medium leading-snug">
              {policyLinks.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-white transition-opacity hover:opacity-70">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 py-2 text-xs font-medium text-white">
          <p>© {new Date().getFullYear()} Bawari Banno. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
