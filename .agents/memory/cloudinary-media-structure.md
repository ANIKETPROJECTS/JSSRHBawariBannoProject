---
name: Cloudinary media structure
description: The project convention for storing product images and Admin attachments in Cloudinary.
---

Use Cloudinary as the storage layer when the project secret is configured. Keep folder paths predictable:

- `bawari-banno/catalog/<category>/products/<product-code>/images`
- `bawari-banno/purchase-invoices/<invoice-number>/documents`
- `bawari-banno/expenses/<expense-id>/documents`

Product images may use their Cloudinary URL for storefront rendering. Purchase invoice and expense files should continue to be accessed through authenticated Admin endpoints, which proxy the stored Cloudinary asset.

**Why:** The owner needs clean, searchable media organization without exposing financial attachments through public catalog URLs.

**How to apply:** Reuse the shared Cloudinary upload/delete helpers and preserve the existing MongoDB metadata records. Keep the legacy GridFS fallback for older files and environments without Cloudinary configured.