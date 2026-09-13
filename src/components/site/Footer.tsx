import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Facebook, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";
import logoImage from "../../../attached_assets/Bawari_Banno_Horizontal_Transparent-01_1789242095079.png";

const exploreLinks = [
  { label: "All Sarees", to: "/products" },
  { label: "New Arrival", to: "/new-arrival" },
  { label: "Bestsellers", to: "/bestseller" },
  { label: "Our Story", to: "/about" },
  { label: "Contact Us", to: "/contact" },
];

const customerLinks = [
  { label: "Contact Us", to: "/contact" },
  { label: "Wishlist", to: "/wishlist" },
  { label: "My Account", to: "/profile" },
  { label: "Shipping & Returns", to: "/contact" },
  { label: "Terms & Conditions", to: "/terms-and-conditions" },
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
        <div className="grid gap-7 border-b border-white/20 py-5 sm:py-6 lg:grid-cols-[minmax(240px,0.75fr)_minmax(0,2.25fr)] lg:gap-10">
          <div className="flex flex-col gap-4 lg:pt-1">
            <img
              src={logoImage}
              alt="Bawari Banno"
              className="h-32 w-[24rem] object-contain object-left sm:h-36 sm:w-[28rem]"
            />
            <p className="mt-1 max-w-sm text-base font-medium leading-snug text-white sm:text-lg">
              Sarees chosen for their colour, craft and the stories they carry forward.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-base font-medium uppercase tracking-[0.2em] text-white">
                Follow the house
              </p>
              <div className="flex gap-3">
                {[
                  { label: "Instagram", Icon: Instagram },
                  { label: "Facebook", Icon: Facebook },
                  { label: "YouTube", Icon: Youtube },
                ].map(({ label, Icon }) => (
                  <a
                    key={label}
                    href="#"
                    aria-label={label}
                    className="flex size-11 items-center justify-center rounded-full border border-white text-white transition-colors hover:bg-white hover:text-[#ED145B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Icon className="size-4" strokeWidth={1.7} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-7 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:items-start">
            <div>
            <p className="text-base font-medium uppercase tracking-[0.2em] text-white">Explore</p>
            <ul className="mt-3 space-y-2 text-lg font-medium leading-snug">
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
            <p className="text-base font-medium uppercase tracking-[0.2em] text-white">Customer care</p>
            <ul className="mt-3 space-y-2 text-lg font-medium leading-snug">
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
            <p className="text-base font-medium uppercase tracking-[0.2em] text-white">Visit us</p>
            <address className="mt-3 space-y-2 text-base font-medium not-italic leading-snug text-white sm:text-lg">
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
            <p className="text-base font-medium uppercase tracking-[0.2em] text-white">Policies</p>
            <ul className="mt-3 space-y-2 text-lg font-medium leading-snug">
              {policyLinks.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-white transition-opacity hover:opacity-70">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-[16rem] text-base font-medium leading-snug text-white">
              Website owned by Sejal Sheshmani Yadav
            </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 py-4 text-sm font-medium text-white">
          <p>© {new Date().getFullYear()} Bawari Banno. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
