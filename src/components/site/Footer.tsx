import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import logoImage from "../../../attached_assets/Bawari_Banno_Horizontal_Transparent-01_1789242095079.png";
import instagramIcon from "../../../attached_assets/instagram_1789283397488.png";
import whatsappIcon from "../../../attached_assets/whatsapp_1789286832089.png";

const facebookIcon = "/images/facebook.png";

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
];

const policyLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Return & Refund Policy", href: "/return-refund-policy" },
];

export function Footer() {
  return (
    <footer className="site-footer mt-8 bg-[#ED145B] font-sans text-white">
      <div className="home-content-container">
        <div className="site-footer-main grid gap-x-8 gap-y-9 border-b border-white/20 py-9 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-10 sm:py-11 lg:grid-cols-[minmax(15rem,1.4fr)_repeat(4,minmax(0,1fr))] lg:gap-x-8 lg:py-12">
          <div className="flex flex-col items-start gap-4 sm:col-span-2 lg:col-span-1">
            <img
              src={logoImage}
              alt="Bawari Banno"
              className="site-footer-brand-logo h-20 w-full max-w-[18rem] object-contain object-left sm:h-24"
            />
            <p className="max-w-sm text-base font-normal leading-relaxed text-white sm:text-[1.05rem]">
              Sarees chosen for their colour, craft and the stories they carry forward.
            </p>
            <div className="mt-2 flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white sm:text-sm">
                Follow the house
              </p>
              <div className="flex items-center gap-3">
                {[
                  { label: "Instagram", href: "https://www.instagram.com/bawaribanno/", icon: instagramIcon },
                  { label: "WhatsApp", href: "https://wa.me/919167599635", icon: whatsappIcon },
                  { label: "Facebook", href: "#", icon: facebookIcon },
                ].map(({ label, href, icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    target={label === "Facebook" ? undefined : "_blank"}
                    rel={label === "Facebook" ? undefined : "noreferrer"}
                    className="flex size-10 items-center justify-center rounded-full border border-white/80 text-white transition-colors hover:bg-white hover:text-[#ED145B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:size-11"
                  >
                    <img
                      src={icon}
                      alt=""
                      className="size-[1.1rem] object-contain brightness-0 invert"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 items-start gap-x-6 gap-y-9 sm:col-span-2 sm:grid-cols-2 sm:gap-x-10 lg:col-span-4 lg:grid-cols-4 lg:gap-x-8">
            <div className="min-w-0">
              <p className="footer-column-heading font-sans text-xs font-semibold uppercase tracking-[0.17em] text-white sm:text-sm">Explore</p>
              <ul className="mt-4 space-y-2.5 text-sm font-normal leading-relaxed sm:text-[0.95rem]">
              {exploreLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="inline-flex items-center gap-1 text-white transition-opacity hover:opacity-70"
                  >
                    {item.label}
                    <ArrowUpRight className="size-3 shrink-0" strokeWidth={1.7} />
                  </Link>
                </li>
              ))}
              </ul>
            </div>

            <div className="min-w-0">
              <p className="footer-column-heading font-sans text-xs font-semibold uppercase tracking-[0.17em] text-white sm:text-sm">Customer care</p>
              <ul className="mt-4 space-y-2.5 text-sm font-normal leading-relaxed sm:text-[0.95rem]">
              {customerLinks.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-white transition-opacity hover:opacity-70">
                    {item.label}
                  </Link>
                </li>
              ))}
              </ul>
            </div>

            <div className="min-w-0">
              <p className="footer-column-heading font-sans text-xs font-semibold uppercase tracking-[0.17em] text-white sm:text-sm">Visit us</p>
              <address className="mt-4 space-y-3 text-sm font-normal not-italic leading-relaxed text-white">
              <p className="flex items-start gap-2">
                <MapPin className="mt-1 size-4 shrink-0" strokeWidth={1.7} />
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

            <div className="min-w-0">
              <p className="footer-column-heading font-sans text-xs font-semibold uppercase tracking-[0.17em] text-white sm:text-sm">Policies</p>
              <ul className="mt-4 space-y-2.5 text-sm font-normal leading-relaxed sm:text-[0.95rem]">
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

        <div className="flex flex-col gap-1.5 py-4 font-sans text-xs font-normal text-white sm:text-sm">
          <p>© {new Date().getFullYear()} Bawari Banno. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
