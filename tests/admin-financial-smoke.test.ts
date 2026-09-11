import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const enabled = process.env.E2E_ADMIN_SMOKE === "1";
const suite = enabled ? describe : describe.skip;
const baseUrl = process.env.E2E_ADMIN_BASE_URL ?? "http://127.0.0.1:5000";

type Json = Record<string, any>;

let cookie = "";
let vendorId = "";
let productId = "";
let productMongoId = "";
let postedInvoiceId = "";
let draftInvoiceId = "";
let smokeMarker = "";

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} failed (${response.status}): ${String(body.error ?? response.statusText)}`);
  return body;
}

async function deleteThroughApi(path: string) {
  try {
    await request(path, { method: "DELETE" });
  } catch {
    // Cleanup also runs directly against MongoDB in afterAll for posted data.
  }
}

suite("Admin financial workflow smoke test", () => {
  beforeAll(async () => {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required for the Admin smoke test.");
    smokeMarker = `E2E Admin smoke ${Date.now()}`;

    const login = await fetch(`${baseUrl}/api/admin/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!login.ok) throw new Error(`Admin login failed with status ${login.status}.`);
    const setCookie = login.headers.get("set-cookie") ?? "";
    cookie = setCookie.split(";")[0] ?? "";
    if (!cookie) throw new Error("Admin login did not return a session cookie.");

    const categories = await request("/api/admin/categories");
    const category = (categories as Json[]).find((item) => !item.parentSlug)?.slug ?? "smoke";
    const vendor = await request("/api/admin/vendors", {
      method: "POST",
      body: JSON.stringify({ businessName: smokeMarker, legalName: smokeMarker, status: "active" }),
    });
    vendorId = String(vendor._id);

    productId = `e2e-admin-${Date.now()}`;
    const product = await request("/api/admin/products", {
      method: "POST",
      body: JSON.stringify({
        id: productId,
        name: smokeMarker,
        category,
        image: "https://example.com/e2e-admin-smoke.png",
        images: ["https://example.com/e2e-admin-smoke.png"],
        price: 1000,
        originalPrice: 1000,
        discountType: "percentage",
        discountValue: 0,
        stock: 0,
        reorderLevel: 2,
        description: smokeMarker,
        productDescription: smokeMarker,
        hsnCode: "5208",
        gstRate: 5,
      }),
    });
    productMongoId = String(product._id);
  });

  afterAll(async () => {
    if (draftInvoiceId) await deleteThroughApi(`/api/admin/purchase-invoices/${draftInvoiceId}`);

    const uri = process.env.MONGODB_URI;
    if (!uri) return;
    const cleanupScript = `
      import { GridFSBucket, MongoClient, ObjectId } from "mongodb";
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      try {
        const database = client.db();
        const invoiceIds = [process.env.POSTED_INVOICE_ID, process.env.DRAFT_INVOICE_ID].filter(Boolean);
        if (invoiceIds.length) {
          const bucket = new GridFSBucket(database, { bucketName: "purchase_invoice_documents" });
          const files = await database.collection("purchase_invoice_documents.files").find({ "metadata.invoiceId": { $in: invoiceIds } }).project({ _id: 1 }).toArray();
          for (const file of files) { try { await bucket.delete(file._id); } catch {} }
          await database.collection("purchase_invoice_lines").deleteMany({ purchaseInvoiceId: { $in: invoiceIds } });
          await database.collection("stock_batches").deleteMany({ sourcePurchaseInvoiceId: { $in: invoiceIds } });
          await database.collection("purchase_invoices").deleteMany({ _id: { $in: invoiceIds.filter(ObjectId.isValid).map((id) => new ObjectId(id)) } });
          await database.collection("audit_logs").deleteMany({ entityId: { $in: invoiceIds } });
        }
        if (process.env.PRODUCT_ID) {
          await database.collection("inventory_movements").deleteMany({ productId: process.env.PRODUCT_ID });
          const productIds = process.env.PRODUCT_MONGO_ID && ObjectId.isValid(process.env.PRODUCT_MONGO_ID)
            ? [{ _id: new ObjectId(process.env.PRODUCT_MONGO_ID) }, { id: process.env.PRODUCT_ID }]
            : [{ id: process.env.PRODUCT_ID }];
          await database.collection("products").deleteMany({ $or: productIds });
        }
        if (process.env.VENDOR_ID && ObjectId.isValid(process.env.VENDOR_ID)) {
          await database.collection("vendors").deleteOne({ _id: new ObjectId(process.env.VENDOR_ID) });
          await database.collection("audit_logs").deleteMany({ entityId: process.env.VENDOR_ID });
        }
      } finally { await client.close(); }
    `;
    Bun.spawnSync(["node", "--input-type=module", "-e", cleanupScript], {
      env: {
        ...process.env,
        POSTED_INVOICE_ID: postedInvoiceId,
        DRAFT_INVOICE_ID: draftInvoiceId,
        PRODUCT_ID: productId,
        PRODUCT_MONGO_ID: productMongoId,
        VENDOR_ID: vendorId,
      },
      stdout: "ignore",
      stderr: "ignore",
    });
  });

  test("matches by vendor code, stores the invoice file, and preserves financial fields", async () => {
    const vendorCode = `E2E-${Date.now()}`;
    const invoicePayload = (invoiceNumber: string, lineProductId?: string) => ({
      vendorId,
      vendorInvoiceNumber: invoiceNumber,
      invoiceDate: "2026-09-11",
      receivedDate: "2026-09-11",
      paymentMethod: "credit",
      paymentStatus: "pending",
      taxType: "igst",
      taxRate: 0,
      lines: [{
        productId: lineProductId ?? "",
        variantId: "",
        vendorProductCode: vendorCode,
        itemName: smokeMarker,
        quantityPurchased: 1,
        costPricePerUnit: 400,
      }],
    });

    const firstDraft = await request("/api/admin/purchase-invoices", {
      method: "POST",
      body: JSON.stringify(invoicePayload(`E2E-POST-${Date.now()}`, productId)),
    });
    postedInvoiceId = String(firstDraft._id);
    const posted = await request(`/api/admin/purchase-invoices/${postedInvoiceId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "post" }),
    });
    expect(posted.status).toBe("posted");

    const productAfterPost = (await request("/api/admin/products") as Json[]).find((item) => item.id === productId);
    expect(productAfterPost?.primaryVendorId).toBe(vendorId);
    expect(productAfterPost?.primaryVendorProductCode).toBe(vendorCode);

    const postedFile = new File([new Uint8Array([37, 80, 68, 70])], "e2e-posted-invoice.pdf", { type: "application/pdf" });
    const postedForm = new FormData();
    postedForm.append("document", postedFile);
    const repairedPosted = await request(`/api/admin/purchase-invoices/${postedInvoiceId}/document`, { method: "POST", body: postedForm });
    expect(repairedPosted.documentFile.filename).toBe("e2e-posted-invoice.pdf");

    const matchedDraft = await request("/api/admin/purchase-invoices", {
      method: "POST",
      body: JSON.stringify(invoicePayload(`E2E-DRAFT-${Date.now()}`)),
    });
    draftInvoiceId = String(matchedDraft._id);
    const matchedDetail = await request(`/api/admin/purchase-invoices/${draftInvoiceId}`);
    expect(matchedDetail.lines[0].productId).toBe(productId);

    const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "e2e-invoice.png", { type: "image/png" });
    const form = new FormData();
    form.append("document", file);
    const uploaded = await request(`/api/admin/purchase-invoices/${draftInvoiceId}/document`, { method: "POST", body: form });
    expect(uploaded.documentFile.filename).toBe("e2e-invoice.png");

    const detailWithFile = await request(`/api/admin/purchase-invoices/${draftInvoiceId}`);
    expect(detailWithFile.documentFile.filename).toBe("e2e-invoice.png");
    const fileResponse = await fetch(`${baseUrl}/api/admin/purchase-invoices/${draftInvoiceId}/document`, { headers: { cookie } });
    expect(fileResponse.status).toBe(200);
    expect(fileResponse.headers.get("content-type")).toContain("image/png");

    const suggestions = await request("/api/admin/purchase-suggestions");
    const suggestion = (suggestions as Json[]).find((item) => item.productId === productId);
    expect(suggestion.vendorId).toBe(vendorId);
    expect(suggestion.vendorProductCode).toBe(vendorCode);
    expect(suggestion.lastCostPrice).toBe(400);

    const updatedProduct = await request(`/api/admin/products/${productMongoId}`, {
      method: "PUT",
      body: JSON.stringify({ ...productAfterPost, hsnCode: "5208", gstRate: 5, price: 1200, originalPrice: 1200, discountType: "percentage", discountValue: 0 }),
    });
    expect(updatedProduct.hsnCode).toBe("5208");
    expect(Number(updatedProduct.gstRate)).toBe(5);
    expect(Number(updatedProduct.price)).toBe(1200);

    const financials = await request(`/api/admin/product-financials?productId=${encodeURIComponent(productId)}`);
    expect(financials.batches.some((batch: Json) => batch.vendorId === vendorId && batch.vendorProductCode === vendorCode)).toBe(true);
  });
});