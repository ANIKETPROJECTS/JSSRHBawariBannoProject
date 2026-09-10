---
name: Financial inventory foundation
description: Rules for introducing purchase traceability without corrupting existing catalog stock.
---

Existing catalog stock must not be assigned invented vendor or cost data. Treat legacy quantities as an explicit `opening_balance` stock source until the owner supplies a real vendor and cost history.

**Why:** The storefront already has live product and color-variant stock, but no reliable historical procurement records. Fabricating costs would make margin and inventory valuation misleading.

**How to apply:** New purchase invoices should create purchase-backed stock batches; legacy stock should be migrated separately and transparently, with optional variant-level linkage.