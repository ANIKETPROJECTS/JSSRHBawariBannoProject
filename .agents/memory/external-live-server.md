---
name: External live server
description: Distinguish the external production server from the Replit development preview.
---

The user runs the live storefront on an external Ubuntu/nginx server using PM2, separately from this Replit development workflow.

**Why:** The user confirmed a live server with its own credentials; the live response identifies nginx on Ubuntu while this project's Replit deployment metadata reports no active deployment. Suggesting Replit Publish alone does not address that server.

**How to apply:** Diagnose the actual live process environment separately from Replit Secrets. Workspace changes require the user's normal server update and PM2 restart before they affect production. Request only safe presence/status diagnostics, never raw environment dumps or credential values.
