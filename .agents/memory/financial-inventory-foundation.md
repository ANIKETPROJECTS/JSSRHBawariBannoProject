---
name: Financial inventory foundation
description: Rules for introducing purchase traceability without corrupting existing catalog stock.
---

Existing catalog stock must not be assigned invented vendor or cost data. Treat legacy quantities as an explicit `opening_balance` stock source until the owner supplies a real vendor and cost history.

**Why:** The storefront already has live product and color-variant stock, but no reliable historical procurement records. Fabricating costs would make margin and inventory valuation misleading.

**How to apply:** New purchase invoices should create purchase-backed stock batches; legacy stock should be migrated separately and transparently, with optional variant-level linkage.

Posted purchase receipts should also be represented in inventory history with the catalog product, color variant, quantity, and before/after stock, but those movement rows must remain locked.

**Why:** Editing or deleting a purchase movement without correcting its source invoice would change product stock while leaving the purchase stock batch and financial record inconsistent.

**How to apply:** Use the posted purchase invoice correction workflow for procurement corrections; use manual inventory movements only for independent adjustments.

Payment status and payment method may be updated on a posted purchase invoice without unlocking its product lines or stock batches.

**Why:** Vendor payment often happens after stock is received, so payment tracking must remain editable while procurement quantities and costs stay auditable.

**How to apply:** Keep payment updates as a separate action; reserve full line, quantity, cost, and stock changes for the explicit correction workflow.

Product stock details should show a human-readable activity timeline, including purchase-batch history when an older invoice predates inventory-movement logging.

**Why:** The current stock number alone cannot prove how a color changed; operators need to reconcile a purchase quantity with the variant’s before/after stock.

**How to apply:** Show actor, action, product or color, quantity, source invoice, date, and before/after stock when available; label batch-derived history when exact before/after values are not stored.