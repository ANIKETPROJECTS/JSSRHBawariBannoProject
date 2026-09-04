---
name: Editorial storefront experiments
description: Durable guidance for reversible visual redesigns and media-heavy storefront treatments.
---

Visual experiments should be isolated to storefront presentation files, preserve existing data and interactions, and keep the previous working version easy to restore. When a requested media type is not available locally, prefer a lightweight local derived asset with an accessible poster/fallback rather than a remote dependency.

**Why:** The storefront has an established commerce flow and the user wants to compare visual directions without risking checkout, catalog, or authentication behavior.

**How to apply:** For future homepage/header/footer experiments, avoid changing admin or business logic, keep responsive/mobile behavior intact, and verify the live preview plus build before delivery.