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

Sales must consume the oldest available stock batches first and persist those allocations on the order.

**Why:** FIFO allocations are required for cost traceability and allow posted-invoice corrections to distinguish unconsumed stock from units already sold.

**How to apply:** Consume variant-specific or product-level batches transactionally during successful payment; restore the same allocations on an explicit order deletion; bridge untracked legacy stock into an opening-balance batch before allowing a sale.

Product stock details should show a human-readable activity timeline, including purchase-batch history when an older invoice predates inventory-movement logging.

**Why:** The current stock number alone cannot prove how a color changed; operators need to reconcile a purchase quantity with the variant’s before/after stock.

**How to apply:** Show actor, action, product or color, quantity, source invoice, date, and before/after stock when available; label batch-derived history when exact before/after values are not stored.

Posted purchase invoices require replacement corrections rather than in-place edits.

**Why:** Changing a posted invoice directly would destroy the original financial record and can double-count or silently remove stock.

**How to apply:** Keep the original invoice immutable; create a linked correction, reverse only unconsumed original batches, reject corrections after those units are consumed, and record both reversal and replacement movements.

Reorder alerts are threshold-driven: products and colour variants can each define their own reorder level, with legacy records defaulting to three units until configured.

**Why:** A fixed global low-stock number is not useful for a catalogue where fast-moving colours and one-off sarees have different replenishment needs.

**How to apply:** Evaluate variant thresholds independently, include out-of-stock variants in alerts, and keep the default only as a migration-safe fallback.

Original purchase invoice files should be stored as private document records separate from review media, with corrections inheriting the original file unless a replacement is explicitly uploaded.

**Why:** Procurement documents are audit evidence and must remain viewable after posting without exposing them publicly or breaking the original/correction chain.

**How to apply:** Keep invoice document routes Admin-authenticated, preserve the original invoice's file reference during correction creation, and allow a correction draft to upload a replacement file before posting.