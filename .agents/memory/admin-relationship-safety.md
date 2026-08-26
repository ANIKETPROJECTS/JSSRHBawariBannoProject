---
name: Admin relationship safety
description: Safety rule for destructive admin catalog operations.
---

Category records must not be deleted while products or child categories still reference them; the admin should report the dependency and require it to be resolved first.

**Why:** Deleting a referenced category would leave storefront products with broken classification and make historical catalog data harder to interpret.

**How to apply:** Keep dependency checks in the server-side delete path, even when the admin UI already asks for confirmation.