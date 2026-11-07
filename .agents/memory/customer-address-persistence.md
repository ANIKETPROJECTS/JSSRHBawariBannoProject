---
name: Customer address persistence
description: Product expectations for reusable customer addresses across checkout, profile edits, and Admin.
---

Saved delivery addresses belong to the customer profile and should remain selectable at later checkouts. New storefront addresses become additional saved entries, and edits from the storefront update the saved entry shown in Admin. Older order shipping addresses should be imported for reuse when missing from the profile, while each order keeps its original shipping snapshot.

**Why:** The user expects an address used for an order to be available after the customer logs back in, expects additional addresses to be saved separately, and expects storefront edits to appear in Admin.

**How to apply:** Keep checkout selection keyed to a saved address ID, persist profile edits and additions in the customer record, backfill legacy order addresses only once with deduplication, and display current saved addresses separately from historical order addresses.
