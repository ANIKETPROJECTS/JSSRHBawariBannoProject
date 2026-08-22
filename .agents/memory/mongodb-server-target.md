---
name: MongoDB server target
description: Runtime constraint for using the MongoDB Node driver in this TanStack Start project.
---

MongoDB's Node driver requires the app's production server target to be `node-server`, not the default Cloudflare-style Nitro target.

**Why:** The Cloudflare bundle cannot load the driver's Node dependencies and fails during Nitro compilation.

**How to apply:** Keep MongoDB access server-only and preserve the Node server preset in the Vite/TanStack configuration whenever adding server-side MongoDB features.