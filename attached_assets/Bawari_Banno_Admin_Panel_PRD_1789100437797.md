# Bawari Banno — Admin Panel Redesign
### Product Requirements Document (PRD) for Developer
**Scope:** Vendor Management, Purchase/Procurement, Inventory, Reorder, and Business Expense Tracking

---

## 1. Purpose

The current admin panel (Overview, Products & Stock, Inventory History, Orders, Customers, Reviews, Categories, Hero Slides, Announcement Bar, Coupons, Settings) is a storefront-only shell — it has no way to record **what was bought, from whom, at what cost, and what it's being sold for.**

This document specifies the modules needed to turn the admin panel into a real trading-business system: every saree that enters stock must be traceable back to a **vendor**, a **vendor invoice**, and a **cost price**, and every stock-in event must automatically update inventory. It also adds a module to track day-to-day business expenses (e.g. sourcing trips to Surat).

This doc is written to be handed directly to a developer (or a Replit build agent) as a build spec — it defines modules, data fields, relationships, and user flows, not visual design.

---

## 2. Core Business Flow (New)

```
VENDOR (added once)
   │
   ▼
PURCHASE INVOICE (one per vendor bill — e.g. Heer Fashion Invoice #426827)
   │   → invoice-level details (GSTIN, date, payment status, totals)
   │   → line items (each saree bought, vendor's product code, qty, price)
   ▼
INVENTORY (each line item creates OR restocks a product)
   │   → product gets an internal Bawari Banno Product ID (permanent)
   │   → product stays linked to: Vendor + Vendor's Product Code + this Invoice
   │   → cost price stored from this specific purchase
   │   → seller sets/updates the selling price
   ▼
STOREFRONT (customer-facing listing, existing "Products & Stock" module)
   │
   ▼
SALE → ORDER (existing Orders module)

Separately:
EXPENSES (trips, packaging, shipping, etc.) — tracked independently,
optionally linked to a Vendor or a Trip, for true cost-of-business visibility.
```

---

## 3. Module Specifications

### 3.1 Vendor Management (NEW)

**Purpose:** Maintain a master list of manufacturers/sellers you buy from (e.g. Heer Fashion / Hanumana Enterprise), so every purchase and every product can be tied back to a vendor.

**Key features**
- Add/edit/deactivate vendors
- Auto-generate an internal **Vendor Code** (e.g. `VEN-001`) — this is Bawari Banno's own reference, separate from the vendor's GSTIN
- View all invoices and products ever purchased from a vendor on one screen
- View total lifetime spend per vendor

**Data fields — Vendor**

| Field | Type | Notes |
|---|---|---|
| Vendor ID | Auto ID | Internal primary key |
| Vendor Code | Auto (e.g. VEN-001) | Human-readable internal reference |
| Business Name | Text | e.g. "Heer Fashion" |
| Legal/Enterprise Name | Text | e.g. "Hanumana Enterprise" |
| GSTIN | Text | e.g. 24AJGPV0929C1ZD |
| State | Text | For IGST/CGST-SGST logic |
| Address | Text (multi-line) | Godown/shop address |
| Contact Person | Text | |
| Phone | Text | |
| Email | Text | Optional |
| Bank Details | Text | Optional, for payment reference |
| Status | Enum: Active / Inactive | |
| Notes | Text | Free notes (e.g. "best for silk sarees") |
| Created Date | Date | Auto |

---

### 3.2 Purchase / Vendor Invoices (NEW)

**Purpose:** Record every bill received from a vendor exactly as it exists on paper (like the Heer Fashion invoice sample), and store the original file for reference/audit. This is the single source of truth for cost prices.

**Key features**
- Create a new purchase invoice under a selected vendor
- Upload the original invoice file (PDF/image) — stored and viewable anytime
- Add multiple line items per invoice (one row per saree/style purchased)
- Auto-calculate subtotal, tax, and payable amount from line items
- On save, each line item is pushed into Inventory (3.3) — either creating a new product or restocking an existing one
- Track payment status separately from delivery/stock status

**Data fields — Purchase Invoice (header)**

| Field | Type | Notes |
|---|---|---|
| Purchase Invoice ID | Auto ID | Internal primary key |
| Vendor | FK → Vendor | Required |
| Vendor's Invoice Number | Text | e.g. 426827 (as printed on their bill) |
| Invoice Date | Date | As printed on their bill |
| Place of Supply | Text | |
| Payment Method | Enum: Prepaid / COD / Credit / Bank Transfer | |
| Payment Status | Enum: Paid / Pending / Partially Paid | |
| Subtotal (before tax) | Number | Auto-summed from line items |
| Tax Type | Enum: IGST / CGST+SGST | Based on vendor state vs. business state |
| Tax % | Number | e.g. 5% |
| Tax Amount | Number | Auto-calculated |
| Total Payable | Number | Subtotal + Tax |
| Original Invoice File | File upload (PDF/image) | Stored for reference |
| Received Date | Date | When goods physically arrived |
| Notes | Text | Optional |
| Created By | User | Which admin user entered it |
| Created Date | Date/time | Auto |

**Data fields — Purchase Invoice Line Item (one row per saree style)**

| Field | Type | Notes |
|---|---|---|
| Line Item ID | Auto ID | |
| Purchase Invoice | FK → Purchase Invoice | |
| Vendor Product Code | Text | Vendor's own code, e.g. 65749 |
| Item Name (as billed) | Text | e.g. "Red color soft muga cotton saree with pashmina..." |
| Quantity Purchased | Number | |
| Cost Price / Unit | Number | Price paid to vendor per piece |
| Line Amount | Number | Qty × Cost Price (auto) |
| Linked Product | FK → Inventory Product | Filled automatically once matched/created (see 3.3) |

---

### 3.3 Inventory / Product Master (REDESIGNED)

This replaces the current "dummy" Products & Stock module with a real structure that separates **the catalog listing** (what customers see) from **the stock-in history** (what was actually bought, from whom, and at what cost — since cost price can differ between purchases of the same style).

**Why two levels (Product + Stock Batch):** If you reorder the same saree style from the same vendor next month at a different price, you need both prices on record — not just the latest one overwriting the old one. This also lets you calculate real margin per batch, not just a guess.

**3.3.1 Product (catalog-level — customer-facing)**

| Field | Type | Notes |
|---|---|---|
| Product ID | Auto (e.g. BB-SAR-00123) | Permanent internal ID, assigned once |
| Product Name | Text | Your own storefront name/title |
| Category | FK → Category | e.g. Cotton, Silk, Khadi, Mulmul |
| Fabric | Text | e.g. Muga cotton, Katan silk, Khadi |
| Color | Text | |
| Description | Text | |
| Images | File uploads | |
| Current Selling Price (MRP) | Number | What's shown on the website |
| HSN Code | Text | For GST on sales |
| GST % (sale) | Number | |
| Total Quantity in Stock | Number | Auto-summed from all active stock batches |
| Reorder Threshold | Number | Triggers low-stock alert |
| Primary Vendor | FK → Vendor | Most recent/usual source |
| Primary Vendor Product Code | Text | For quick reorder reference |
| Status | Enum: Active / Inactive / Discontinued | |
| Date First Added | Date | Auto |

**3.3.2 Stock Batch / Inventory Ledger (purchase-level — internal)**

One row is created automatically **every time** a line item is added via a Purchase Invoice (3.2). This is your true cost history.

| Field | Type | Notes |
|---|---|---|
| Batch ID | Auto ID | |
| Product | FK → Product | |
| Vendor | FK → Vendor | |
| Vendor Product Code | Text | Copied from the invoice line item |
| Source Purchase Invoice | FK → Purchase Invoice | Traceability back to the exact bill |
| Quantity Received | Number | |
| Quantity Remaining | Number | Decreases as this batch is sold (FIFO) |
| Cost Price / Unit (this batch) | Number | What was actually paid this time |
| Date Received | Date | |
| Status | Enum: In Stock / Sold Out | |

**Matching logic when a new invoice line item is added:**
1. System checks if a Product already exists for this Vendor + Vendor Product Code.
2. If yes → create a new Stock Batch under that existing Product (restock), increase Total Quantity in Stock.
3. If no → prompt admin to create a new Product (name, category, images, selling price), assign it a new Product ID, and create the first Stock Batch.

---

### 3.4 Reorder Management (NEW)

**Purpose:** Let you quickly re-purchase a style that's selling well or running low, without retyping vendor/product details from scratch.

**Key features**
- "Reorder" button on any Product's detail page
- Pre-fills a new Purchase Invoice line item with: Vendor, Vendor Product Code, Item Name, and last paid Cost Price (editable)
- Reorder suggestions list: products at or below their Reorder Threshold
- Reorder history: shows how many times and how often a product has been reordered, and price movement over time (e.g. "570 → 590 → 600")

---

### 3.5 Expense Management (NEW)

**Purpose:** Track all non-inventory business costs — sourcing trips (e.g. Surat visits), packaging, shipping, marketing, etc. — separately from cost of goods, so you can see true running cost of the business.

**Data fields — Expense**

| Field | Type | Notes |
|---|---|---|
| Expense ID | Auto ID | |
| Date | Date | |
| Category | Enum: Travel, Accommodation, Food, Vendor Sourcing Visit, Packaging Material, Courier/Shipping, Marketing, Photography/Shoot, Software/Subscriptions, Miscellaneous | Extendable list |
| Description | Text | |
| Amount | Number | |
| Payment Mode | Enum: Cash / UPI / Card / Bank Transfer | |
| Linked Vendor | FK → Vendor (optional) | If the expense relates to a specific vendor visit |
| Linked Trip | FK → Business Trip (optional) | See 3.5.1 |
| Receipt/Bill Attachment | File upload (optional) | |
| Added By | User | |

**3.5.1 Business Trip (sub-entity, groups expenses)**

Lets you group all costs of one sourcing trip together (e.g. "Surat Visit — Sept 2026": travel + stay + food + auto-linked purchase invoices made during the trip).

| Field | Type | Notes |
|---|---|---|
| Trip ID | Auto ID | |
| Trip Name | Text | e.g. "Surat Sourcing Trip — Sept 2026" |
| Purpose | Text | |
| Location | Text | |
| Start Date | Date | |
| End Date | Date | |
| Total Expense (auto) | Number | Sum of all Expenses linked to this trip |
| Purchase Invoices Made During Trip | FK list → Purchase Invoice | Optional link, for full trip cost picture |
| Notes | Text | |

---

### 3.6 Pricing & Margin (NEW — logic layer, not a separate screen)

Once cost price (from Stock Batch) and selling price (from Product) both exist, the system should compute and display, per product and in aggregate:

- **Margin per unit** = Selling Price − Cost Price (of the active/oldest unsold batch, FIFO)
- **Margin %** = Margin per unit ÷ Cost Price
- **Total Inventory Value (at cost)** = Σ (Quantity Remaining × Cost Price) across all batches
- **Total Inventory Value (at selling price)** = Σ (Quantity Remaining × Selling Price)

---

### 3.7 Dashboard / Overview (UPDATE existing module)

Add the following to the existing Overview screen, alongside the current Revenue/Orders/Customers/Pending Orders cards:

| New card/section | Shows |
|---|---|
| Total Purchase Value | All-time and this-month spend across all vendors |
| Total Expenses | All-time and this-month, from Expense Management |
| Estimated Gross Margin | Revenue − Cost of Goods Sold (from Stock Batches sold) |
| Active Vendors | Count |
| Low Stock / Reorder Alerts | Products at/below reorder threshold |
| Pending Purchase Invoices | Invoices marked "Payment Pending" |
| Top Vendors by Spend | Ranked list |

---

## 4. Entity Relationship Summary

| Entity | Relates to |
|---|---|
| Vendor | 1 → many Purchase Invoices; 1 → many Products (as Primary Vendor) |
| Purchase Invoice | belongs to 1 Vendor; 1 → many Line Items |
| Purchase Invoice Line Item | belongs to 1 Purchase Invoice; creates/links to 1 Product; creates 1 Stock Batch |
| Product | belongs to 1 Category; 1 → many Stock Batches; 1 → many Order Line Items (existing) |
| Stock Batch | belongs to 1 Product, 1 Vendor, 1 Purchase Invoice |
| Expense | optionally linked to 1 Vendor and/or 1 Business Trip |
| Business Trip | 1 → many Expenses; optionally linked to Purchase Invoices |

---

## 5. Key User Flows

**Flow A — Recording a new vendor purchase**
1. Admin goes to Vendors → selects existing vendor (or creates new one).
2. Admin clicks "New Purchase Invoice" → enters invoice number, date, payment status, uploads the original invoice file.
3. Admin adds line items one by one: vendor product code, item name, quantity, cost price/unit (amount auto-calculates).
4. On save, system matches each line item to an existing Product (same Vendor + Vendor Code) or prompts to create a new Product.
5. Stock Batches are created; Product's Total Quantity in Stock updates automatically.
6. Purchase Invoice now appears in Vendor's history and in the invoice archive.

**Flow B — Reordering a fast-selling saree**
1. Admin opens a Product that's low on stock.
2. Clicks "Reorder" → system pre-fills a new Purchase Invoice line item with the same vendor, vendor code, and last cost price.
3. Admin edits quantity/price if changed, submits as part of a new (or existing draft) Purchase Invoice.
4. Same matching/stock-batch logic as Flow A runs.

**Flow C — Logging a sourcing trip expense**
1. Admin creates a Business Trip (e.g. "Surat Visit — Sept 2026").
2. Admin logs individual expenses (travel, food, stay) under that trip as they occur.
3. Any Purchase Invoices created while sourcing on that trip are optionally linked to it.
4. Trip detail page shows total expense + total purchase value + effective landed cost of that trip.

**Flow D — Checking true margin on a product**
1. Admin opens a Product page.
2. Sees current stock batches with their individual cost prices, current selling price, and computed margin % per batch.
3. Can adjust selling price directly from here.

---

## 6. Non-Functional Requirements

- **File storage:** Purchase invoices and expense receipts must be stored as attached files (PDF/image), retrievable from the relevant record — not just typed-in text.
- **Audit trail:** Log who created/edited each Vendor, Purchase Invoice, and Expense, and when.
- **Data integrity:** A Purchase Invoice's line items should not be freely editable after stock batches are created from them, without an explicit "correction" action (to avoid silent stock/cost mismatches).
- **Search/filter:** Vendors, Purchase Invoices, and Products should be searchable by vendor code, vendor product code, and internal product ID.
- **Permissions:** Since this is financial data (cost prices, vendor payments, expenses), consider restricting these modules to admin/owner-level accounts only, separate from any staff accounts used for order fulfillment.

---

## 7. Suggested Build Priority

1. **Phase 1 — Core traceability:** Vendor Management → Purchase Invoices → Product/Stock Batch linkage (this alone solves "track vendor, vendor code, cost price, sell price").
2. **Phase 2 — Efficiency:** Reorder Management, Dashboard updates (low stock alerts, top vendors).
3. **Phase 3 — Full cost picture:** Expense Management + Business Trips, Margin reporting.

---

*This document defines modules, fields, and flows for build purposes. Visual layout should follow the existing admin panel's design language (as seen in the current Overview screen).*
