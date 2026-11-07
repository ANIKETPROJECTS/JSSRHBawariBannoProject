---
name: Customer address persistence
description: Product expectations for reusable customer addresses across checkout, profile edits, and Admin.
---

Saved delivery addresses belong to the customer profile and should remain selectable at later checkouts. New storefront addresses become additional saved entries, and edits from the storefront update the saved entry shown in Admin. Older order shipping addresses should be imported for reuse when missing from the profile, while each order keeps its original shipping snapshot.

Admin customer details should show saved addresses and each order’s historical shipping address. Derive the short location from the address city (for example, “Thane”), and use the latest order date as activity when available.

**Why:** The user expects an address used for an order to be available after the customer logs back in, expects additional addresses to be saved separately, and expects storefront edits to appear in Admin. They also expect Admin location and activity to reflect the customer’s delivery address and order history.

**How to apply:** Keep checkout selection keyed to a saved address ID, persist profile edits and additions in the customer record, backfill legacy order addresses only once with deduplication, and show saved addresses separately from historical order addresses. Use the city alone for the location label and the most recent order timestamp for last activity.
