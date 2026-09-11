---
name: Private invoice upload flow
description: Constraints for private purchase-invoice attachments and recovery of posted invoices that were created without a file.
---

Keep browser `FormData` requests free of an `application/json` content type so the runtime can add the multipart boundary. An upload endpoint must process `POST` before requiring an existing file record; a missing record is expected during the first upload.

**Why:** A forced JSON header caused original invoice uploads to fail, and the first-upload path then reported that no document existed. Posted invoice lines and stock remain immutable, but a posted invoice with no attachment needs a narrowly scoped recovery upload for audit completeness.

**How to apply:** Permit attachment creation on a posted invoice only when it has no existing document, keep replacement blocked, and expose the recovery control from invoice detail. Keep private-file access behind Admin authorization.