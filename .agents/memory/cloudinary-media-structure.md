---
name: Cloudinary media structure
description: The project convention for storing product images and Admin attachments in Cloudinary.
---

Store catalog product images in the project-root `allimages/` directory and serve them through the app using generated, non-guessable filenames. Do not route new product uploads to Cloudinary or GridFS.

Keep purchase invoice and expense attachments in Cloudinary with predictable folder paths:

- `bawari-banno/purchase-invoices/<invoice-number>/documents`
- `bawari-banno/expenses/<expense-id>/documents`

Financial attachments must continue to be accessed through authenticated Admin endpoints, which proxy the stored Cloudinary asset. Ignore uploaded files in `allimages/` in Git except for its placeholder; they are runtime data and need separate persistence/backup on the live host.

**Why:** The owner requested local project-folder storage for product images, while invoices and expenses remain private Admin documents.

**How to apply:** For new catalog image uploads, stream into `allimages/` and save `/allimages/<generated-filename>` in product records. Do not migrate or rewrite existing Cloudinary/GridFS URLs as part of this rule.