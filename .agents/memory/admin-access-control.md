---
name: Admin access control
description: Durable rules for owner and staff access to the Admin panel.
---

The owner account remains the environment-configured Admin identity. Additional staff accounts are database-backed, store only password hashes, and receive explicit permission sets; staff must never inherit owner access.

**Why:** Procurement, inventory, customer, and audit data have different operational risks, so one shared Admin identity cannot provide safe staff access.

**How to apply:** Keep permission checks on the server-side Admin route dispatcher and mirror them in navigation for clarity. Add new Admin areas to both maps whenever a new permission boundary is introduced.