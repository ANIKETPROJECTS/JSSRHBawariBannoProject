---
name: PhonePe transaction identity
description: Preserve the distinction between PhonePe's provider transaction ID and the store's merchant order ID.
---

Store and display PhonePe's transaction ID only when PhonePe actually returns it. Keep the merchant order ID as a separate reference; never label it as a provider transaction ID when the provider ID is missing.

**Why:** The merchant order reference is not the PhonePe payment receipt ID needed to reconcile successful payments.

**How to apply:** When handling PhonePe checkout status, callbacks, or webhooks, persist provider transaction IDs separately and show a clear missing-ID state instead of substituting the order ID.
