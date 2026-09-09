# Saree Showcase Studio

Build a frontend-only e-commerce UI for a saree business. No backend, no auth, no payment integration — just the visual storefront using dummy/sample data.

Pages needed: Home, Products, Product Detail, About Us, Contact Us

Header (all pages) — logo on the left, nav links (Home, Products, About Us, Contact Us), user profile icon on the right.

Sidebar (Home + Products pages) — a collapsible category tree of saree types (e.g. Silk Sarees → Kanjivaram, Banarasi, Mysore Silk; Cotton Sarees → Handloom, Printed; Designer Sarees; Wedding Collection). Clicking a category filters the product grid.

Home page, top to bottom:

Hero banner — large full-width promotional image, headline, "Shop Now" button

Horizontally scrollable row — "New Arrivals" or "Shop by Fabric" cards, swipeable sideways

Product grid — featured sarees as a responsive grid (image, name, price, fabric tag)

Footer — about/contact links, social icons, newsletter signup, copyright

Products page — same sidebar filtering, full catalog grid, plus a sort dropdown (price, newest).

Product Detail page — opens on card click: image gallery, name, price, fabric/blouse details, quantity selector, "Add to Cart" button, related products row.

About Us page — brand story section, a "Our Craft" or "Sourcing" section (how sarees are made/sourced), a small team or heritage highlight, consistent header/footer.

Contact Us page — a contact form (name, email, message — visual only, no backend), business address/phone/email, and an embedded-style map placeholder.

Design direction: elegant and premium, not a generic template — rich colors (maroon, gold, deep jewel tones), an elegant serif or display font for headings, generous product photography space, subtle tasteful details (fine borders, fabric-texture accents).

Use React + Tailwind. Populate with 8–10 realistic dummy sarees (name, fabric, price, placeholder image) across a few categories. No cart persistence, no login, no backend calls anywhere.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c659d3ac-fda5-47d2-85e8-fa8b6e6f8283).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## VPS production deployment with PM2

This project builds a standalone Node/Nitro server. On the VPS, use Node.js
22.12.0 or newer, install PM2 once, and run the following from the project
root:

```sh
npm install
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

The included `ecosystem.config.cjs` starts the production server on
`0.0.0.0:3020`. It runs the built output directly, so do not use
`npm run dev` or `npm run preview` in production.

Before starting PM2, configure the production environment variables required
by the store on the VPS. Do not commit their values to this repository:

```sh
export MONGODB_URI="your-mongodb-connection-string"
export SESSION_SECRET="your-long-random-session-secret"
export ADMIN_EMAIL="your-admin-email"
export ADMIN_PASSWORD="your-admin-password"
```

For a persistent server reboot setup, run the command printed by:

```sh
pm2 startup
```

Useful PM2 commands:

```sh
pm2 status
pm2 logs bawari-banno
pm2 restart bawari-banno
pm2 stop bawari-banno
```
