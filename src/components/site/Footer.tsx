import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
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
        <div className="site-footer-main grid gap-x-8 gap-y-6 border-b border-white/20 py-8 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-7 sm:py-9 lg:grid-cols-[minmax(15rem,1.4fr)_minmax(0,3fr)] lg:gap-x-8 lg:py-10">
          <div className="flex flex-col items-start gap-3 sm:col-span-2 lg:col-span-1">
            <img
              src={logoImage}
              alt="Bawari Banno"
              className="site-footer-brand-logo h-20 w-full max-w-[18rem] object-contain object-left sm:h-24"
            />
            <p className="max-w-sm text-base font-normal leading-relaxed text-white sm:text-[1.05rem]">
              Sarees chosen for their colour, craft and the stories they carry forward.
            </p>
            <div className="mt-1 flex flex-col gap-2">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-white">
                Follow the house
              </p>
              <div className="flex items-center gap-4">
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
                    className="flex size-10 items-center justify-center text-white transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <img
                      src={icon}
                      alt=""
                      className="size-7 object-contain brightness-0 invert"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 items-start gap-x-6 gap-y-6 sm:col-span-2 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-7 lg:col-span-1 lg:grid-cols-4 lg:gap-x-6">
            <div className="min-w-0">
              <p className="footer-column-heading font-sans text-sm font-semibold uppercase tracking-[0.15em] text-white">Explore</p>
              <ul className="mt-3 space-y-2 text-base font-normal leading-snug">
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
              <p className="footer-column-heading font-sans text-sm font-semibold uppercase tracking-[0.15em] text-white">Visit us</p>
              <address className="mt-3 space-y-2 text-base font-normal not-italic leading-snug text-white">
                <p className="flex items-start gap-2 text-justify">
                  <img src="/images/footer-location.png" alt="" className="mt-0.5 size-5 shrink-0 object-contain brightness-0 invert" />
                  <span className="text-justify">
                    Hubtown Greenwood CHS, Flat No. 805/A Wing, 8th Floor,
                    <br />
                    Pokhran Road No. 1, Vartak Nagar, Thane (W), 400606
                  </span>
                </p>
                <a href="tel:+918459769859" className="flex items-center gap-2 hover:opacity-70">
                  <img src="/images/footer-phone.png" alt="" className="size-5 shrink-0 object-contain brightness-0 invert" />
                  +91 84597 69859
                </a>
                <a href="mailto:info@bawaribanno.com" className="flex items-center gap-2 hover:opacity-70">
                  <img src="/images/footer-email.png" alt="" className="size-5 shrink-0 object-contain brightness-0 invert" />
                  info@bawaribanno.com
                </a>
              </address>
              <div className="mt-3 overflow-hidden border border-white/30">
                <iframe
                  title="Map to Bawari Banno in Thane"
                  src="https://www.google.com/maps?q=Hubtown+Greenwood+CHS,+Flat+No.+805%2FA+Wing,+8th+Floor,+Pokhran+Road+No.+1,+Vartak+Nagar,+Thane+West,+Maharashtra+400606&output=embed"
                  className="h-28 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            <div className="min-w-0">
              <p className="footer-column-heading font-sans text-sm font-semibold uppercase tracking-[0.15em] text-white">Policies</p>
              <ul className="mt-3 space-y-2 text-base font-normal leading-snug">
              {policyLinks.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-white transition-opacity hover:opacity-70">
                    {item.label}
                  </a>
                </li>
              ))}
              </ul>
            </div>

            <NewsletterSignup />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 py-3 font-sans text-base font-normal text-white sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-0">
          <p className="text-left">© {new Date().getFullYear()} Bawari Banno. All rights reserved.</p>
          <p className="inline-flex items-center justify-center gap-1.5 text-center sm:col-start-2 sm:row-start-1">
            <img src="/images/india-flag.png" alt="" className="size-6 object-contain" />
            Made in India
            <span aria-label="with love" className="text-lg text-[#FFE300]">♥</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmail("");
    setMessage("This signup is a preview; your email address was not saved.");
  }

  return (
    <div className="min-w-0">
      <p className="footer-column-heading font-sans text-base font-semibold uppercase tracking-[0.15em] text-white">Newsletter</p>
      <p className="mt-3 text-base leading-snug text-white">
        Get new arrivals and saree stories in your inbox.
      </p>
      <form onSubmit={submit} className="mt-3 space-y-2">
        <label htmlFor="footer-newsletter-email" className="sr-only">Email address</label>
        <input
          id="footer-newsletter-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email address"
          className="w-full border border-white/70 bg-white px-3 py-2.5 text-base text-[#171717] outline-none placeholder:text-[#6b6266] focus-visible:ring-2 focus-visible:ring-[#FFE300]"
        />
        <div className="flex items-start gap-2 text-sm leading-snug text-white">
          <input
            id="footer-newsletter-consent"
            name="newsletter-consent"
            type="checkbox"
            required
            className="mt-1 size-4 shrink-0 accent-[#FFE300]"
          />
          <label htmlFor="footer-newsletter-consent">
            Email me updates. Unsubscribe anytime by contacting us.
          </label>
        </div>
        <button
          type="submit"
          className="w-full bg-[#FFE300] px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-[#ED145B] transition-opacity hover:opacity-90"
        >
          Subscribe
        </button>
        {message && (
          <p role="status" className="text-sm leading-snug text-[#FFE300]">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
