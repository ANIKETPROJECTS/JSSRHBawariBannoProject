import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { GridFSBucket, MongoClient, type ClientSession, type Db, ObjectId } from "mongodb";
import { categories, categoryEdits, sarees } from "@/data/sarees";
import { normalizeProductColor, otherColorKey, productColors } from "@/data/colors";
import { normalizeCatalogAsset, normalizeCatalogRecord } from "@/lib/catalog-assets";
import { auditCreateFields, auditUpdateFields, businessSettingsDefaults, ensureBusinessIndexes } from "@/lib/business-types";
import { purchaseInvoiceDeletionPolicy } from "@/lib/purchase-invoice-policy";
import maroonHeroImage from "@/assets/hero-editorial-maroon-wide.jpg";
import tealHeroImage from "@/assets/hero-editorial-teal-wide.jpg";
import emeraldHeroImage from "@/assets/hero-editorial-emerald-wide.jpg";

type Resource = "heroes" | "categories" | "products" | "announcements" | "coupons";
type JsonRecord = Record<string, unknown>;
type ReviewMedia = { id: string; name: string; type: "image" | "video"; contentType: string; size: number; url: string };
type ReviewRecord = {
  _id?: ObjectId;
  productId: string;
  customerId?: ObjectId;
  reviewerName: string;
  rating: number;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  media: ReviewMedia[];
  createdAt: Date;
  updatedAt: Date;
};

const reviewMediaBucketName = "review_media";
const reviewMediaLimits = { image: 8 * 1024 * 1024, video: 20 * 1024 * 1024 };
const reviewMediaTypes = new Map<string, "image" | "video">([
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
  ["image/gif", "image"],
  ["video/mp4", "video"],
  ["video/webm", "video"],
  ["video/quicktime", "video"],
]);
const purchaseInvoiceDocumentBucketName = "purchase_invoice_documents";
const purchaseInvoiceDocumentLimit = 15 * 1024 * 1024;
const purchaseInvoiceDocumentTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);
const expenseReceiptBucketName = "expense_receipts";
const expenseReceiptLimit = 15 * 1024 * 1024;
const expenseReceiptTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);

let clientPromise: Promise<MongoClient> | undefined;

function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");
  clientPromise ??= new MongoClient(uri).connect();
  return clientPromise;
}

async function db(): Promise<Db> {
  const client = await getClient();
  const database = client.db();
  await Promise.all([
    database.collection("products").createIndex({ id: 1 }, { unique: true, sparse: true }),
    database.collection("categories").createIndex({ slug: 1 }, { unique: true, sparse: true }),
    database.collection("products").createIndex({ published: 1, category: 1, createdAt: -1 }),
    database.collection("reviews").createIndex({ productId: 1, status: 1, createdAt: -1 }),
    database.collection("reviews").createIndex({ customerId: 1, createdAt: -1 }),
    database.collection("admin_users").createIndex({ email: 1 }, { unique: true }),
    ensureBusinessIndexes(database),
  ]);
  return database;
}

type StockAllocation = { batchId: string; quantity: number; costPricePerUnit?: number };

function reorderAlerts(product: JsonRecord) {
  const variants = Array.isArray(product.variants) ? product.variants as JsonRecord[] : [];
  if (variants.length) {
    return variants
      .filter((variant) => Number(variant.stock ?? 0) <= Number(variant.reorderLevel ?? 3))
      .map((variant) => ({ ...product, stock: Number(variant.stock ?? 0), alertLabel: String(variant.color ?? "Colour"), reorderLevel: Number(variant.reorderLevel ?? 3) }));
  }
  const stock = Number(product.stock ?? 0);
  return stock <= Number(product.reorderLevel ?? 3)
    ? [{ ...product, stock, reorderLevel: Number(product.reorderLevel ?? 3) }]
    : [];
}

async function consumeStockBatches(database: Db, productId: string, variantId: string, quantity: number, session: ClientSession): Promise<StockAllocation[]> {
  const batches = database.collection("stock_batches");
  const variantFilter = variantId
    ? { variantId }
    : { $or: [{ variantId: { $exists: false } }, { variantId: "" }] };
  let available = await batches.find({
    productId,
    ...variantFilter,
    status: "in_stock",
    quantityRemaining: { $gt: 0 },
  }, { session }).sort({ receivedDate: 1, createdAt: 1, _id: 1 }).toArray();
  const trackedQuantity = available.reduce((sum, batch) => sum + Number(batch.quantityRemaining ?? 0), 0);
  const product = await database.collection("products").findOne({ id: productId }, { session });
  const productVariant = variantId && Array.isArray(product?.variants)
    ? (product.variants as JsonRecord[]).find((entry) => String(entry.id ?? "") === variantId)
    : undefined;
  const currentStock = Number(productVariant?.stock ?? product?.stock ?? 0);
  if (trackedQuantity < quantity) {
    const legacyGap = Math.max(0, currentStock - trackedQuantity);
    if (legacyGap > 0) {
      await batches.insertOne({
        productId,
        ...(variantId ? { variantId } : {}),
        sourceType: "opening_balance",
        sourceLabel: "Legacy stock carried into FIFO ledger",
        quantityReceived: legacyGap,
        quantityRemaining: legacyGap,
        costPricePerUnit: 0,
        receivedDate: new Date(),
        status: "in_stock",
        ...auditCreateFields("system"),
      }, { session });
      available = await batches.find({
        productId,
        ...variantFilter,
        status: "in_stock",
        quantityRemaining: { $gt: 0 },
      }, { session }).sort({ receivedDate: 1, createdAt: 1, _id: 1 }).toArray();
    }
  }
  const totalAvailable = available.reduce((sum, batch) => sum + Number(batch.quantityRemaining ?? 0), 0);
  if (totalAvailable < quantity) throw new Error(`${String(product?.name ?? productId)}${productVariant ? ` in ${String(productVariant.color ?? "that color")}` : ""} has incomplete stock-batch history and cannot be sold safely.`);
  let remaining = quantity;
  const allocations: StockAllocation[] = [];
  for (const batch of available) {
    if (remaining <= 0) break;
    const batchRemaining = Number(batch.quantityRemaining ?? 0);
    const consumed = Math.min(remaining, batchRemaining);
    const nextRemaining = batchRemaining - consumed;
    const result = await batches.updateOne(
      { _id: batch._id, status: "in_stock", quantityRemaining: batchRemaining },
      { $set: { quantityRemaining: nextRemaining, status: nextRemaining > 0 ? "in_stock" : "sold_out", ...auditUpdateFields("checkout") } },
      { session },
    );
    if (!result.modifiedCount) throw new Error("Stock changed while completing checkout. Please try again.");
    allocations.push({ batchId: String(batch._id), quantity: consumed, ...(batch.costPricePerUnit !== undefined ? { costPricePerUnit: Number(batch.costPricePerUnit) } : {}) });
    remaining -= consumed;
  }
  return allocations;
}

function secret(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

const adminPermissions = ["catalog", "procurement", "inventory", "orders", "customers", "marketing", "settings", "audit"] as const;
type AdminPermission = typeof adminPermissions[number];
type AdminRole = "owner" | "staff";
type AdminContext = { email: string; role: AdminRole; permissions: AdminPermission[] };

function sessionToken(email: string, role: AdminRole = "owner", permissions: AdminPermission[] = [...adminPermissions]) {
  const payload = Buffer.from(JSON.stringify({ email, role, permissions, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString("base64url");
  const signature = createHmac("sha256", secret("SESSION_SECRET")).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function adminContext(request: Request): AdminContext | null {
  const cookie = request.headers.get("cookie")?.match(/bb_admin=([^;]+)/)?.[1];
  if (!cookie) return null;
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret("SESSION_SECRET")).update(payload).digest("base64url");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email?: string; role?: AdminRole; permissions?: string[]; exp?: number };
    if (!data.email || typeof data.exp !== "number" || data.exp <= Date.now()) return null;
    if (data.email !== process.env.ADMIN_EMAIL && data.role !== "staff") return null;
    const permissions = (Array.isArray(data.permissions) ? data.permissions : [...adminPermissions]).filter((permission): permission is AdminPermission => adminPermissions.includes(permission as AdminPermission));
    return { email: data.email, role: data.role === "staff" ? "staff" : "owner", permissions };
  } catch {
    return null;
  }
}

function adminIdentity(request: Request) {
  return adminContext(request)?.email ?? null;
}

function isAdmin(request: Request) {
  return Boolean(adminContext(request));
}

function hasAdminPermission(request: Request, permission: AdminPermission) {
  const context = adminContext(request);
  return context?.role === "owner" || Boolean(context?.permissions.includes(permission));
}

function passwordHash(password: string, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function passwordMatches(password: string, stored: string) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64).toString("hex");
  return candidate.length === hash.length && timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

function adminPermissionForPath(path: string): AdminPermission | null {
  if (path === "/api/admin/me") return null;
  if (path === "/api/admin/audit-logs") return "audit";
  if (path === "/api/admin/settings" || path.startsWith("/api/admin/team")) return "settings";
  if (path === "/api/admin/analytics" || path === "/api/admin/summary" || path === "/api/admin/product-financials") return "inventory";
  if (path === "/api/admin/purchase-suggestions" || path.startsWith("/api/admin/purchase-invoices") || path.startsWith("/api/admin/vendors") || path.startsWith("/api/admin/expenses") || path.startsWith("/api/admin/business-trips")) return "procurement";
  if (path.startsWith("/api/admin/inventory")) return "inventory";
  if (path.startsWith("/api/admin/orders")) return "orders";
  if (path.startsWith("/api/admin/customers")) return "customers";
  if (path.startsWith("/api/admin/reviews")) return "marketing";
  if (path === "/api/admin/seed" || path.includes("/reorder") || /\/api\/admin\/(products|categories|heroes|announcements|coupons)/.test(path)) return "catalog";
  return null;
}

function customerToken(userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString("base64url");
  const signature = createHmac("sha256", secret("SESSION_SECRET")).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

async function customerFromRequest(request: Request) {
  const cookie = request.headers.get("cookie")?.match(/bb_customer=([^;]+)/)?.[1];
  if (!cookie) return null;
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret("SESSION_SECRET")).update(payload).digest("base64url");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId?: string; exp?: number };
    if (!data.userId || !data.exp || data.exp <= Date.now() || !ObjectId.isValid(data.userId)) return null;
    return await (await db()).collection("customers").findOne({ _id: new ObjectId(data.userId) });
  } catch {
    return null;
  }
}

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, { headers: { "cache-control": "no-store" }, ...init });
}

function fail(message: string, status = 400) {
  return json({ error: message }, { status });
}

async function body(request: Request): Promise<JsonRecord> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? value as JsonRecord : {};
  } catch {
    return {};
  }
}

function cleanDocument(value: JsonRecord) {
  const output = { ...value };
  delete output._id;
  delete output.createdAt;
  delete output.updatedAt;
  if (typeof output.price === "string") output.price = Number(output.price);
  if (typeof output.stock === "string") output.stock = Number(output.stock);
  return output;
}

function productSlug(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function normalizeProductVariants(value: unknown, productId: string) {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  const colors = new Set<string>();
  return value.map((entry, index) => {
    const row = entry && typeof entry === "object" ? entry as JsonRecord : {};
    const rawColor = String(row.color ?? "").trim();
    const color = normalizeProductColor(rawColor);
    const rawImages = Array.isArray(row.images) ? row.images.map(String).map((image) => image.trim()).filter(Boolean) : [];
    const image = String(row.image ?? rawImages[0] ?? "").trim();
    const images = [image, ...rawImages.filter((item) => item !== image)].filter(Boolean).slice(0, 5);
    const stock = Number(row.stock ?? 0);
    const reorderLevel = Number(row.reorderLevel ?? 3);
    if (!color || rawColor === otherColorKey) throw new Error(`Color variant ${index + 1} needs a color name.`);
    if (colors.has(color.toLowerCase())) throw new Error(`Each color variant must be unique. "${color}" is repeated.`);
    if (!productColors.some((option) => option.key === color)) throw new Error(`Choose a color from the approved color palette for variant ${index + 1}.`);
    if (!image) throw new Error(`Color variant "${color}" needs a cover image.`);
    if (rawImages.filter((item) => item !== image).length > 4) throw new Error(`Color variant "${color}" can have no more than four extra images.`);
    if (!Number.isInteger(stock) || stock < 0) throw new Error(`Color variant "${color}" needs a valid stock quantity.`);
    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) throw new Error(`Color variant "${color}" needs a valid reorder level.`);
    colors.add(color.toLowerCase());
    const baseId = productSlug(row.id || color) || `${productId}-variant-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (ids.has(id)) id = `${baseId}-${suffix++}`;
    ids.add(id);
    return { id, color, stock, reorderLevel, image, images };
  });
}

function normalizeProductColors(value: unknown) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const colors = [...new Set(values.map((value) => normalizeProductColor(String(value ?? "").trim())).filter(Boolean))];
  for (const color of colors) {
    if (!productColors.some((option) => option.key === color)) {
      throw new Error(`Choose a color from the approved color palette. "${color}" is not available.`);
    }
  }
  return colors;
}

async function list(resource: Resource) {
  const collection = (await db()).collection(resource);
  const records = await collection.find({}).sort({ order: 1, createdAt: -1 }).toArray();
  return records.map((record) => normalizeCatalogRecord(record as Record<string, unknown>));
}

async function save(resource: Resource, id: string | undefined, input: JsonRecord) {
  const database = await db();
  const collection = database.collection(resource);
  const document = { ...cleanDocument(input), updatedAt: new Date() };
  let clearSubcategory = false;
  if (resource === "products") {
    if (!String(document.id ?? "").trim()) {
      const baseId = productSlug(document.name) || "product";
      let generatedId = baseId;
      let suffix = 2;
      while (await collection.findOne({ id: generatedId })) generatedId = `${baseId}-${suffix++}`;
      document.id = generatedId;
    }
    const parentSlug = String(document.category ?? "").trim();
    const childSlug = String(document.subcategory ?? "").trim();
    if (childSlug) {
      const child = await database.collection("categories").findOne({ slug: childSlug, parentSlug });
      if (!child) throw new Error("Choose a subcategory that belongs to the selected parent category.");
    } else if ("subcategory" in document) {
      delete document.subcategory;
      clearSubcategory = true;
    }
    const variants = normalizeProductVariants(document.variants, String(document.id));
    const colors = normalizeProductColors(document.colors ?? document.color);
    const coverImage = String(document.image ?? "").trim();
    const extraImages = Array.isArray(document.images) ? document.images.map(String).map((image) => image.trim()).filter(Boolean) : [];
    const images = [coverImage, ...extraImages.filter((image) => image !== coverImage)].filter(Boolean).slice(0, 5);
    if (!coverImage && !variants.length) throw new Error("A cover image is required when the product has no color variants.");
    if (extraImages.length > 4) throw new Error("Add no more than four extra product images.");
    document.variants = variants;
    const reorderLevel = Number(document.reorderLevel ?? 3);
    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) throw new Error("Enter a valid product reorder level.");
    document.reorderLevel = reorderLevel;
    document.colors = variants.length ? [...new Set(variants.map((variant) => variant.color))] : colors;
    delete document.color;
    document.image = coverImage || variants[0]?.image || "";
    document.images = coverImage ? images : (variants[0]?.images ?? []);
    if (variants.length) document.stock = variants.reduce((total, variant) => total + variant.stock, 0);
    const originalPrice = Number(document.originalPrice ?? document.price);
    const discountType = String(document.discountType ?? "percentage") === "fixed" ? "fixed" : "percentage";
    const discountValue = document.discountValue === "" || document.discountValue == null ? 0 : Number(document.discountValue);
    if (!Number.isFinite(originalPrice) || originalPrice < 0) throw new Error("Enter a valid product price.");
    if (!Number.isFinite(discountValue) || discountValue < 0 || (discountType === "percentage" && discountValue > 100)) throw new Error("Enter a valid product discount.");
    if (discountType === "fixed" && discountValue > originalPrice) throw new Error("The fixed discount cannot be greater than the product price.");
    const sellingPrice = discountType === "fixed"
      ? Math.max(0, originalPrice - discountValue)
      : Math.max(0, Math.round(originalPrice * (1 - discountValue / 100)));
    document.originalPrice = originalPrice;
    document.discountType = discountType;
    document.discountValue = discountValue;
    document.price = sellingPrice;
    document.countryOfOrigin = String(document.countryOfOrigin ?? "").trim() || "India";
    const productDescription = String(document.productDescription ?? document.description ?? "").trim();
    document.productDescription = productDescription;
    document.description = productDescription;
    document.newArrival = document.newArrival === true;
    document.trending = document.trending === true;
    document.bestseller = document.bestseller === true;
  }
  if (resource === "coupons") {
    const code = String(document.code ?? "").trim().toUpperCase();
    const discountType = String(document.discountType ?? "percentage") === "fixed" ? "fixed" : "percentage";
    const discountValue = Number(document.discountValue ?? 0);
    const minimumSubtotal = Math.max(0, Number(document.minimumSubtotal ?? 0));
    const maxDiscount = document.maxDiscount === "" || document.maxDiscount == null ? null : Math.max(0, Number(document.maxDiscount));
    const productScope = String(document.productScope ?? "all") === "specific" ? "specific" : "all";
    const productIds = Array.isArray(document.productIds) ? document.productIds.map(String).filter(Boolean) : [];
    const expiresAt = document.expiresAt === "" || document.expiresAt == null ? null : new Date(`${String(document.expiresAt).slice(0, 10)}T23:59:59.999Z`);
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new Error("Coupon code must be 3–40 characters using letters, numbers, hyphens, or underscores.");
    if (!Number.isFinite(discountValue) || discountValue <= 0 || (discountType === "percentage" && discountValue > 100)) throw new Error("Enter a valid discount value.");
    if (!Number.isFinite(minimumSubtotal) || !Number.isFinite(maxDiscount ?? 0)) throw new Error("Enter valid coupon limits.");
    if (productScope === "specific" && !productIds.length) throw new Error("Choose at least one product for a specific-product coupon.");
    if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new Error("Enter a valid expiry date.");
    const duplicate = await collection.findOne({ code, ...(id && ObjectId.isValid(id) ? { _id: { $ne: new ObjectId(id) } } : {}) });
    if (duplicate) throw new Error("A coupon with this code already exists.");
    document.code = code;
    document.discountType = discountType;
    document.discountValue = discountValue;
    document.minimumSubtotal = minimumSubtotal;
    document.maxDiscount = maxDiscount;
    document.productScope = productScope;
    document.productIds = productScope === "specific" ? productIds : [];
    document.label = String(document.label ?? "").trim().slice(0, 120);
    document.expiresAt = expiresAt;
    document.active = document.active !== false;
  }
  if (id && ObjectId.isValid(id)) {
    const previous = await collection.findOne({ _id: new ObjectId(id) });
    await collection.updateOne({ _id: new ObjectId(id) }, clearSubcategory ? { $set: document, $unset: { subcategory: "" } } : { $set: document });
    if (resource === "products" && previous && typeof previous.stock === "number" && typeof document.stock === "number" && previous.stock !== document.stock) {
      await database.collection("inventory_movements").insertOne({
        productId: String(previous.id ?? id),
        previousStock: previous.stock,
        nextStock: document.stock,
        change: document.stock - previous.stock,
        eventType: "manual",
        reason: "Admin stock update",
        createdAt: new Date(),
      });
    }
    return collection.findOne({ _id: new ObjectId(id) });
  }
  const result = await collection.insertOne({ ...document, published: document.published !== false, createdAt: new Date() });
  return collection.findOne({ _id: result.insertedId });
}

type CouponCalculation = { ok: true; coupon: JsonRecord; discount: number; eligibleSubtotal: number } | { ok: false; message: string };

async function calculateCoupon(database: Db, code: string, items: { productId: string; quantity: number; price: number }[]): Promise<CouponCalculation> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return { ok: true, coupon: {}, discount: 0, eligibleSubtotal: 0 };
  const coupon = await database.collection("coupons").findOne({ code: normalizedCode }) as JsonRecord | null;
  if (!coupon) return { ok: false, message: "Coupon not recognised." };
  if (coupon.active === false) return { ok: false, message: `${normalizedCode} is currently inactive.` };
  if (coupon.expiresAt && new Date(String(coupon.expiresAt)).getTime() < Date.now()) return { ok: false, message: `${normalizedCode} has expired.` };
  const productIds = Array.isArray(coupon.productIds) ? coupon.productIds.map(String) : [];
  const eligibleItems = coupon.productScope === "specific" ? items.filter((item) => productIds.includes(item.productId)) : items;
  if (coupon.productScope === "specific" && !eligibleItems.length) return { ok: false, message: `${normalizedCode} does not apply to the products in your bag.` };
  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const minimumSubtotal = Math.max(0, Number(coupon.minimumSubtotal ?? 0));
  if (eligibleSubtotal < minimumSubtotal) return { ok: false, message: `${normalizedCode} applies above ₹${minimumSubtotal.toLocaleString("en-IN")}.` };
  const value = Math.max(0, Number(coupon.discountValue ?? 0));
  const rawDiscount = coupon.discountType === "fixed" ? value : Math.round(eligibleSubtotal * value / 100);
  const cappedDiscount = coupon.maxDiscount == null ? rawDiscount : Math.min(rawDiscount, Math.max(0, Number(coupon.maxDiscount)));
  return { ok: true, coupon, discount: Math.min(eligibleSubtotal, Math.max(0, cappedDiscount)), eligibleSubtotal };
}

async function validateCoupon(request: Request) {
  const input = await body(request);
  const code = String(input.code ?? "");
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const productIds = rawItems.map((item) => String((item as JsonRecord)?.productId ?? "")).filter(Boolean);
  const database = await db();
  const products = await database.collection("products").find({ id: { $in: productIds } }).project({ id: 1, price: 1 }).toArray();
  const productMap = new Map(products.map((product) => [String(product.id), Number(product.price ?? 0)]));
  const items = rawItems.map((item) => {
    const row = item as JsonRecord;
    return { productId: String(row.productId ?? ""), quantity: Math.max(1, Math.trunc(Number(row.quantity) || 1)), price: productMap.get(String(row.productId ?? "")) ?? 0 };
  }).filter((item) => item.productId && productMap.has(item.productId));
  const result = await calculateCoupon(database, code, items);
  if (!result.ok) return fail(result.message);
  return json({ ok: true, code: String(result.coupon.code ?? code).toUpperCase(), label: String(result.coupon.label ?? ""), discount: result.discount, eligibleSubtotal: result.eligibleSubtotal });
}

async function remove(resource: Resource, id: string) {
  if (!ObjectId.isValid(id)) return false;
  const database = await db();
  if (resource === "categories") {
    const category = await database.collection("categories").findOne({ _id: new ObjectId(id) });
    if (!category) return false;
    const slug = String(category.slug ?? "");
    const [productCount, childCount] = await Promise.all([
      database.collection("products").countDocuments({ $or: [{ category: slug }, { subcategory: slug }] }),
      database.collection("categories").countDocuments({ parentSlug: slug }),
    ]);
    if (productCount || childCount) throw new Error("Move or remove this category's products and subcategories before deleting it.");
  }
  const result = await database.collection(resource).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

async function reorder(resource: "heroes" | "categories", input: JsonRecord) {
  const ids = Array.isArray(input.ids) ? input.ids.map(String) : [];
  if (!ids.length || ids.some((id) => !ObjectId.isValid(id))) throw new Error("A valid ordered list is required.");
  const database = await db();
  const collection = database.collection(resource);
  const now = new Date();
  await collection.bulkWrite(ids.map((id, order) => ({
    updateOne: {
      filter: { _id: new ObjectId(id) },
      update: { $set: { order, updatedAt: now } },
    },
  })));
  return collection.find({}).sort({ order: 1, createdAt: -1 }).toArray();
}

function phonePeConfiguration() {
  const environment = String(process.env.PHONEPE_ENV ?? "sandbox").toLowerCase();
  const baseUrl = String(
    process.env.PHONEPE_API_BASE_URL
      ?? (environment === "production" ? "https://api.phonepe.com/apis/hermes" : "https://api-preprod.phonepe.com/apis/pg-sandbox"),
  ).replace(/\/+$/, "");
  return {
    merchantId: secret("PHONEPE_MERCHANT_ID"),
    saltKey: secret("PHONEPE_SALT_KEY"),
    saltIndex: String(process.env.PHONEPE_SALT_INDEX ?? "1"),
    baseUrl,
  };
}

function phonePeChecksum(encodedPayload: string, path: string, saltKey: string, saltIndex: string) {
  return `${createHash("sha256").update(`${encodedPayload}${path}${saltKey}`).digest("hex")}###${saltIndex}`;
}

function phonePeCallbackChecksum(encodedResponse: string, saltKey: string, saltIndex: string) {
  return `${createHash("sha256").update(`${encodedResponse}${saltKey}`).digest("hex")}###${saltIndex}`;
}

function signaturesMatch(expected: string, received: string | null) {
  if (!received || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

async function createPhonePeCheckout(request: Request) {
  const input = await body(request);
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) return fail("Your cart is empty.");
  const database = await db();
  const customer = await customerFromRequest(request);
  if (!customer) return fail("Please log in before proceeding to checkout.", 401);
  const counter = await database.collection("counters").findOneAndUpdate(
    { _id: "orders" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  const orderNumber = Number(counter?.value ?? 1);
  const orderId = `BawriBanno${String(orderNumber).padStart(2, "0")}`;
  const orderItems: { productId: string; variantId?: string; variantColor?: string; name: string; image: string; quantity: number; price: number }[] = [];
  const selectedProducts: { product: JsonRecord; productId: string; variantId?: string; quantity: number }[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as JsonRecord;
    const productId = typeof row.productId === "string" ? row.productId : "";
    const requestedVariantId = typeof row.variantId === "string" ? row.variantId.trim() : "";
    const quantity = Math.max(1, Math.floor(Number(row.quantity) || 0));
    if (!productId || !quantity) continue;
    const product = await database.collection("products").findOne({ id: productId }) as JsonRecord | null;
    const productVariants = Array.isArray(product?.variants) ? product.variants as JsonRecord[] : [];
    const variant = requestedVariantId ? productVariants.find((entry) => String(entry.id ?? "") === requestedVariantId) : undefined;
    if (!product) return fail(`${productId} is no longer available.`, 409);
    if (productVariants.length && !variant) return fail(`Choose a valid color for ${String(product.name ?? productId)}.`, 409);
    const availableStock = variant ? Number(variant.stock ?? 0) : Number(product.stock ?? 0);
    if (availableStock < quantity) return fail(`${String(product.name ?? productId)}${variant ? ` in ${String(variant.color ?? "that color")}` : ""} is not available in that quantity.`, 409);
    selectedProducts.push({ product, productId, ...(variant ? { variantId: requestedVariantId } : {}), quantity });
    orderItems.push({
      productId,
      ...(variant ? { variantId: requestedVariantId, variantColor: String(variant.color ?? "") } : {}),
      name: String(product.name ?? productId),
      image: String(variant?.image ?? product.image ?? ""),
      quantity,
      price: Number(product.price ?? 0),
    });
  }
  if (!orderItems.length) return fail("No valid products were found in your cart.");
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const couponCode = String(input.couponCode ?? "").trim().toUpperCase();
  const couponResult = await calculateCoupon(database, couponCode, orderItems);
  if (!couponResult.ok) return fail(couponResult.message);
  const settings = await database.collection("settings").findOne({ _id: "store" });
  const shippingCharge = Math.max(0, Number(settings?.shippingCharges ?? 250));
  const freeShippingThreshold = Math.max(0, Number(settings?.freeShippingThreshold ?? 15000));
  const shipping = subtotal === 0 || subtotal >= freeShippingThreshold ? 0 : shippingCharge;
  const discount = couponResult.discount;
  const total = Math.max(0, subtotal + shipping - discount);
  if (total <= 0) return fail("PhonePe checkout requires a payable total above ₹0.");
  const createdAt = new Date();
  const order = {
    orderId,
    customerId: customer?._id,
    customerName: customer?.name || undefined,
    customerEmail: customer?.email || undefined,
    customerPhone: customer?.phone || undefined,
    status: "pending",
    statusHistory: [{ status: "pending", changedAt: createdAt }],
    paymentStatus: "pending",
    paymentMethod: "PhonePe",
    inventoryAdjusted: false,
    items: orderItems,
    subtotal,
    shipping,
    discount,
    total,
    ...(couponCode ? { couponCode } : {}),
    createdAt,
    updatedAt: createdAt,
  };
  await database.collection("orders").insertOne(order);

  try {
    const phonePe = phonePeConfiguration();
    const paymentPath = "/pg/v1/pay";
    const redirectUrl = new URL(`/payment-return?transactionId=${encodeURIComponent(orderId)}`, request.url).toString();
    const callbackUrl = new URL("/api/phonepe/callback", request.url).toString();
    const paymentPayload = {
      merchantId: phonePe.merchantId,
      merchantTransactionId: orderId,
      merchantUserId: String(customer?._id),
      amount: Math.round(total * 100),
      redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl,
      mobileNumber: String(customer?.phone ?? ""),
      paymentInstrument: { type: "PAY_PAGE" },
    };
    const encodedPayload = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
    const response = await fetch(`${phonePe.baseUrl}${paymentPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": phonePeChecksum(encodedPayload, paymentPath, phonePe.saltKey, phonePe.saltIndex),
      },
      body: JSON.stringify({ request: encodedPayload }),
    });
    const result = await response.json().catch(() => ({})) as JsonRecord;
    const redirectInfo = result.data && typeof result.data === "object" ? (result.data as JsonRecord).instrumentResponse : undefined;
    const redirectInfoRecord = redirectInfo && typeof redirectInfo === "object" ? redirectInfo as JsonRecord : {};
    const redirect = String(redirectInfoRecord.redirectInfo && typeof redirectInfoRecord.redirectInfo === "object"
      ? (redirectInfoRecord.redirectInfo as JsonRecord).url ?? ""
      : "");
    if (!response.ok || result.success !== true || !redirect) {
      await database.collection("orders").updateOne(
        { orderId },
        { $set: { paymentStatus: "failed", paymentDetails: JSON.stringify({ code: result.code, message: result.message }).slice(0, 200), updatedAt: new Date() } },
      );
      return fail("PhonePe could not start the payment. Please try again.", 502);
    }
    await database.collection("orders").updateOne(
      { orderId },
      { $set: { transactionId: orderId, phonePeMerchantTransactionId: orderId, updatedAt: new Date() } },
    );
    return json({ ok: true, orderId, redirectUrl: redirect });
  } catch (error) {
    await database.collection("orders").updateOne(
      { orderId },
      { $set: { paymentStatus: "failed", paymentDetails: error instanceof Error ? error.message.slice(0, 200) : "PhonePe configuration error", updatedAt: new Date() } },
    );
    if (error instanceof Error && /PHONEPE_(MERCHANT_ID|SALT_KEY)/.test(error.message)) {
      return fail("PhonePe is not configured yet. Add the merchant credentials before accepting payments.", 503);
    }
    console.error("PhonePe checkout error:", error);
    return fail("PhonePe could not start the payment. Please try again.", 502);
  }
}

async function finalizePhonePePayment(orderId: string, paymentResponse: JsonRecord) {
  const database = await db();
  const client = await getClient();
  const session = client.startSession();
  let inventoryError = "";
  try {
    await session.withTransaction(async () => {
      const orders = database.collection("orders");
      const products = database.collection("products");
      const order = await orders.findOne({ orderId }, { session });
      if (!order) throw new Error("Order not found.");
      if (String(order.paymentStatus).toLowerCase() === "paid") return;

      const events: JsonRecord[] = [];
      const updatedItems: JsonRecord[] = [];
      for (const item of Array.isArray(order.items) ? order.items as JsonRecord[] : []) {
        const productId = String(item.productId ?? "");
        const variantId = String(item.variantId ?? "");
        const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 0));
        const before = await products.findOne({ id: productId }, { session });
        if (!before) throw new Error(`${String(item.name ?? productId)} is no longer available.`);
        const allocations = await consumeStockBatches(database, productId, variantId, quantity, session);
        const result = await products.findOneAndUpdate(
          variantId
            ? { id: productId, variants: { $elemMatch: { id: variantId, stock: { $gte: quantity } } } }
            : { id: productId, stock: { $gte: quantity } },
          variantId
            ? { $inc: { "variants.$.stock": -quantity, stock: -quantity }, $set: { updatedAt: new Date() } }
            : { $inc: { stock: -quantity }, $set: { updatedAt: new Date() } },
          { returnDocument: "after", session },
        );
        if (!result) throw new Error(`${String(item.name ?? productId)} sold out before payment confirmation.`);
        const updatedVariant = variantId && Array.isArray(result.variants)
          ? (result.variants as JsonRecord[]).find((entry) => String(entry.id ?? "") === variantId)
          : undefined;
        updatedItems.push({ ...item, stockAllocations: allocations });
        events.push({
          orderId,
          eventType: "sale",
          productId,
          ...(variantId ? { variantId, variantColor: String(updatedVariant?.color ?? item.variantColor ?? "") } : {}),
          productName: item.name,
          quantity: -quantity,
          previousStock: Number(variantId ? (before.variants as JsonRecord[] | undefined)?.find((entry) => String(entry.id ?? "") === variantId)?.stock ?? 0 : before.stock ?? 0),
          nextStock: Number(updatedVariant?.stock ?? result.stock ?? 0),
          stockAllocations: allocations,
          createdAt: new Date(),
        });
      }
      if (events.length) await database.collection("inventory_movements").insertMany(events, { session });
      await orders.updateOne(
        { _id: order._id, paymentStatus: { $ne: "paid" } },
        {
          $set: {
            paymentStatus: "paid",
            paymentMethod: "PhonePe",
            transactionId: String(paymentResponse.transactionId ?? orderId),
            phonePeCode: String(paymentResponse.code ?? "PAYMENT_SUCCESS"),
            inventoryAdjusted: true,
            items: updatedItems,
            updatedAt: new Date(),
          },
        },
        { session },
      );
    });
  } catch (error) {
    inventoryError = error instanceof Error ? error.message : "Inventory could not be updated.";
    console.error("PhonePe payment finalization error:", inventoryError);
    await database.collection("orders").updateOne(
      { orderId, paymentStatus: { $ne: "paid" } },
      {
        $set: {
          paymentStatus: "paid",
          paymentMethod: "PhonePe",
          transactionId: String(paymentResponse.transactionId ?? orderId),
          phonePeCode: String(paymentResponse.code ?? "PAYMENT_SUCCESS"),
          inventoryAdjusted: false,
          inventoryAdjustmentError: inventoryError.slice(0, 240),
          updatedAt: new Date(),
        },
      },
    );
  } finally {
    await session.endSession();
  }
  return { ok: true, inventoryAdjusted: !inventoryError, inventoryError };
}

async function handlePhonePeCallback(request: Request) {
  const raw = await request.text();
  const input = (() => {
    try { return JSON.parse(raw) as JsonRecord; } catch { return {}; }
  })();
  const encodedResponse = String(input.response ?? "");
  if (!encodedResponse) return fail("Invalid PhonePe callback.", 400);
  const phonePe = phonePeConfiguration();
  const expected = phonePeCallbackChecksum(encodedResponse, phonePe.saltKey, phonePe.saltIndex);
  if (!signaturesMatch(expected, request.headers.get("X-VERIFY"))) return fail("Invalid PhonePe callback signature.", 401);
  let response: JsonRecord;
  try {
    response = JSON.parse(Buffer.from(encodedResponse, "base64").toString("utf8")) as JsonRecord;
  } catch {
    return fail("Invalid PhonePe callback payload.", 400);
  }
  const data = response.data && typeof response.data === "object" ? response.data as JsonRecord : {};
  const orderId = String(data.merchantTransactionId ?? data.transactionId ?? "");
  if (!orderId) return fail("PhonePe callback is missing the transaction ID.", 400);
  const success = response.success === true || String(response.code ?? "").toUpperCase() === "PAYMENT_SUCCESS";
  const database = await db();
  const order = await database.collection("orders").findOne({ orderId });
  if (!order) return fail("Order not found.", 404);
  if (success) {
    await finalizePhonePePayment(orderId, {
      transactionId: data.transactionId ?? orderId,
      code: response.code ?? "PAYMENT_SUCCESS",
    });
  } else if (String(order.paymentStatus).toLowerCase() !== "paid") {
    await database.collection("orders").updateOne(
      { orderId, paymentStatus: { $ne: "paid" } },
      { $set: { paymentStatus: "failed", paymentMethod: "PhonePe", transactionId: String(data.transactionId ?? orderId), phonePeCode: String(response.code ?? "PAYMENT_FAILED"), updatedAt: new Date() } },
    );
  }
  return json({ ok: true });
}

async function phonePePaymentStatus(request: Request) {
  const customer = await customerFromRequest(request);
  if (!customer) return fail("Customer login required.", 401);
  const transactionId = new URL(request.url).searchParams.get("transactionId")?.trim();
  if (!transactionId) return fail("Transaction ID is required.");
  const database = await db();
  const order = await database.collection("orders").findOne({
    orderId: transactionId,
    $or: [{ customerId: customer._id }, { customerId: String(customer._id) }],
  });
  if (!order) return fail("Order not found.", 404);
  return json({
    orderId: order.orderId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: order.total,
    inventoryAdjusted: order.inventoryAdjusted === true,
  });
}

async function inventoryHistory(request: Request) {
  const url = new URL(request.url);
  const query: JsonRecord = {};
  const productId = url.searchParams.get("productId");
  const eventType = url.searchParams.get("eventType");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (productId) query.productId = productId;
  if (eventType && eventType !== "all") query.eventType = eventType;
  if (from || to) query.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) };
  const database = await db();
  const movements = await database.collection("inventory_movements").find(query).sort({ createdAt: -1 }).limit(500).toArray();
  const purchaseBatches = (!eventType || eventType === "all" || eventType === "purchase")
    ? await database.collection("stock_batches").find({
      sourceType: "purchase",
      ...(productId ? { productId } : {}),
      ...(from || to ? { receivedDate: { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {}),
    }).sort({ receivedDate: -1 }).limit(500).toArray()
    : [];
  const movementKeys = new Set(movements
    .filter((movement) => movement.eventType === "purchase" && movement.sourcePurchaseInvoiceId)
    .map((movement) => movement.sourcePurchaseInvoiceLineId
      ? `${movement.sourcePurchaseInvoiceId}|${movement.sourcePurchaseInvoiceLineId}`
      : `${movement.sourcePurchaseInvoiceId}|${movement.productId}|${movement.variantId ?? ""}|${movement.quantity}`));
  const missingPurchaseBatches = purchaseBatches.filter((batch) => {
    const exactKey = `${batch.sourcePurchaseInvoiceId}|${batch.sourcePurchaseInvoiceLineId}`;
    const fallbackKey = `${batch.sourcePurchaseInvoiceId}|${batch.productId}|${batch.variantId ?? ""}|${batch.quantityReceived}`;
    return !movementKeys.has(exactKey) && !movementKeys.has(fallbackKey);
  });
  const catalogIds = [...new Set([...movements, ...missingPurchaseBatches].map((item) => String(item.productId ?? "")).filter(Boolean))];
  const catalogProducts = await database.collection("products").find({ id: { $in: catalogIds } }).project({ id: 1, name: 1, variants: 1 }).toArray();
  const catalogById = new Map(catalogProducts.map((product) => [String(product.id), product]));
  const batchEvents = missingPurchaseBatches.map((batch) => {
    const product = catalogById.get(String(batch.productId));
    const variant = Array.isArray(product?.variants) ? (product.variants as JsonRecord[]).find((entry) => String(entry.id ?? "") === String(batch.variantId ?? "")) : undefined;
    return {
      _id: `batch:${String(batch._id)}`,
      productId: String(batch.productId),
      variantId: batch.variantId,
      variantColor: variant?.color,
      productName: product?.name ?? batch.productId,
      quantity: Number(batch.quantityReceived ?? 0),
      eventType: "purchase",
      reason: `Purchase invoice ${String(batch.sourceLabel ?? "recorded purchase")}`,
      sourcePurchaseInvoiceId: batch.sourcePurchaseInvoiceId,
      sourcePurchaseInvoiceLineId: batch.sourcePurchaseInvoiceLineId,
      createdBy: batch.createdBy ?? "admin",
      createdAt: batch.createdAt ?? batch.receivedDate,
      legacyBatchLog: true,
    };
  });
  const combinedMovements = [...movements, ...batchEvents].sort((a, b) => new Date(String(b.createdAt ?? 0)).getTime() - new Date(String(a.createdAt ?? 0)).getTime()).slice(0, 500);
  const orderIds = [...new Set(combinedMovements.map((movement) => movement.orderId).filter(Boolean))];
  const orders = await database.collection("orders").find({ orderId: { $in: orderIds } }).toArray();
  const customerIds = orders.map((order) => order.customerId).filter(Boolean);
  const customers = await database.collection("customers").find({ _id: { $in: customerIds } }).toArray();
  const ordersById = new Map(orders.map((order) => [String(order.orderId), order]));
  const customersById = new Map(customers.map((customer) => [String(customer._id), customer]));
  return json(combinedMovements.map((movement) => {
    const order = ordersById.get(String(movement.orderId));
    const customer = order?.customerId ? customersById.get(String(order.customerId)) : undefined;
    return {
      ...movement,
      productName: movement.productName ?? catalogById.get(String(movement.productId))?.name,
      buyerName: order?.customerName || customer?.name || "",
      buyerPhone: order?.customerPhone || customer?.phone || "",
      buyerEmail: order?.customerEmail || customer?.email || "",
      orderStatus: order?.status || "",
      paymentStatus: order?.paymentStatus || "",
      paymentMethod: order?.paymentMethod || "",
      orderTotal: order?.total,
      itemPrice: order?.items?.find((item: JsonRecord) => String(item.productId) === String(movement.productId))?.price,
    };
  }));
}

async function inventoryCrud(request: Request, movementId?: string) {
  const database = await db();
  const collection = database.collection("inventory_movements");
  if (movementId && !ObjectId.isValid(movementId)) return fail("Inventory record not found.", 404);

  if (request.method === "POST") {
    const input = await body(request);
    const productId = String(input.productId ?? "").trim();
    const variantId = String(input.variantId ?? "").trim();
    const quantity = Math.trunc(Number(input.quantity));
    const product = await database.collection("products").findOne({ id: productId });
    if (!product) return fail("Choose an existing product.");
    if (!Number.isFinite(quantity) || quantity === 0) return fail("Inventory change must be a non-zero whole number.");
    const productVariants = Array.isArray(product.variants) ? product.variants as JsonRecord[] : [];
    const variant = variantId ? productVariants.find((entry) => String(entry.id ?? "") === variantId) : undefined;
    if (productVariants.length && !variantId) return fail("Choose a color variant for this product.");
    if (variantId && !variant) return fail("Choose a valid color variant.");
    const previousStock = Number(variant?.stock ?? product.stock ?? 0);
    const nextStock = previousStock + quantity;
    if (nextStock < 0) return fail("Inventory cannot go below zero.");
    const result = await database.collection("products").findOneAndUpdate(
      variantId
        ? { id: productId, variants: { $elemMatch: { id: variantId, stock: previousStock } } }
        : { id: productId, stock: previousStock },
      variantId
        ? { $inc: { "variants.$.stock": quantity, stock: quantity }, $set: { updatedAt: new Date() } }
        : { $set: { stock: nextStock, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) return fail("Stock changed before this adjustment was saved. Please try again.", 409);
    const movement = {
      productId,
      ...(variantId ? { variantId, variantColor: String(variant?.color ?? "") } : {}),
      productName: product.name,
      quantity,
      previousStock,
      nextStock,
      eventType: String(input.eventType ?? "manual") === "purchase" ? "purchase" : "manual",
      reason: String(input.reason ?? "Admin inventory adjustment").trim().slice(0, 240),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const inserted = await collection.insertOne(movement);
    return json({ ...movement, _id: inserted.insertedId });
  }

  if (movementId && (request.method === "PUT" || request.method === "PATCH")) {
    const current = await collection.findOne({ _id: new ObjectId(movementId) });
    if (!current) return fail("Inventory record not found.", 404);
    if (current.sourcePurchaseInvoiceId) return fail("Purchase inventory movements are locked. Correct the posted purchase invoice instead.");
    const input = await body(request);
    const quantity = Math.trunc(Number(input.quantity ?? current.quantity));
    const reason = String(input.reason ?? current.reason ?? "Admin inventory adjustment").trim().slice(0, 240);
    const eventType = String(input.eventType ?? current.eventType ?? "manual") === "purchase" ? "purchase" : "manual";
    if (!Number.isFinite(quantity) || quantity === 0) return fail("Inventory change must be a non-zero whole number.");
    const productId = String(current.productId ?? "").trim();
    const variantId = String(current.variantId ?? "").trim();
    const product = await database.collection("products").findOne({ id: productId });
    if (!product) return fail("The product for this inventory record no longer exists.");
    const productVariants = Array.isArray(product.variants) ? product.variants as JsonRecord[] : [];
    const variant = variantId ? productVariants.find((entry) => String(entry.id ?? "") === variantId) : undefined;
    if (variantId && !variant) return fail("The color variant for this inventory record no longer exists.");
    const delta = quantity - Number(current.quantity ?? 0);
    const currentStock = Number(variant?.stock ?? product.stock ?? 0);
    const nextStock = currentStock + delta;
    if (nextStock < 0) return fail("This edit would make inventory negative.");
    if (delta) {
      const updatedProduct = await database.collection("products").findOneAndUpdate(
        variantId
          ? { id: productId, variants: { $elemMatch: { id: variantId, stock: currentStock } } }
          : { id: productId, stock: currentStock },
        variantId
          ? { $inc: { "variants.$.stock": delta, stock: delta }, $set: { updatedAt: new Date() } }
          : { $set: { stock: nextStock, updatedAt: new Date() } },
        { returnDocument: "after" },
      );
      if (!updatedProduct) return fail("Stock changed before this edit was saved. Please try again.", 409);
    }
    const updated = await collection.findOneAndUpdate(
      { _id: new ObjectId(movementId) },
      { $set: { quantity, nextStock: Number(current.nextStock ?? 0) + delta, reason, eventType, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    return updated ? json(updated) : fail("Inventory record not found.", 404);
  }

  if (movementId && request.method === "DELETE") {
    const current = await collection.findOne({ _id: new ObjectId(movementId) });
    if (!current) return fail("Inventory record not found.", 404);
    if (current.sourcePurchaseInvoiceId) return fail("Purchase inventory movements are locked. Correct the posted purchase invoice instead.");
    const productId = String(current.productId ?? "").trim();
    const variantId = String(current.variantId ?? "").trim();
    const quantity = Number(current.quantity ?? 0);
    const product = await database.collection("products").findOne({ id: productId });
    if (product) {
      const productVariants = Array.isArray(product.variants) ? product.variants as JsonRecord[] : [];
      const variant = variantId ? productVariants.find((entry) => String(entry.id ?? "") === variantId) : undefined;
      if (variantId && !variant) return fail("The color variant for this inventory record no longer exists.", 409);
      const currentStock = Number(variant?.stock ?? product.stock ?? 0);
      const nextStock = currentStock - quantity;
      if (nextStock < 0) return fail("This deletion would make inventory negative.", 409);
      await database.collection("products").updateOne(
        variantId ? { id: productId, variants: { $elemMatch: { id: variantId, stock: currentStock } } } : { id: productId, stock: currentStock },
        variantId
          ? { $inc: { "variants.$.stock": -quantity, stock: -quantity }, $set: { updatedAt: new Date() } }
          : { $set: { stock: nextStock, updatedAt: new Date() } },
      );
    }
    await collection.deleteOne({ _id: new ObjectId(movementId) });
    return json({ ok: true });
  }

  if (request.method !== "GET") return fail("Method not allowed.", 405);
  return inventoryHistory(request);
}

function vendorDocument(input: JsonRecord, current?: JsonRecord) {
  const businessName = String(input.businessName ?? current?.businessName ?? "").trim().slice(0, 160);
  const legalName = String(input.legalName ?? current?.legalName ?? "").trim().slice(0, 160);
  const gstin = String(input.gstin ?? current?.gstin ?? "").trim().toUpperCase().slice(0, 30);
  const state = String(input.state ?? current?.state ?? "").trim().slice(0, 80);
  const stateCode = String(input.stateCode ?? current?.stateCode ?? "").trim().toUpperCase().slice(0, 10);
  const address = String(input.address ?? current?.address ?? "").trim().slice(0, 1000);
  const contactPerson = String(input.contactPerson ?? current?.contactPerson ?? "").trim().slice(0, 120);
  const phone = String(input.phone ?? current?.phone ?? "").replace(/[^\d+,\-\s]/g, "").trim().slice(0, 40);
  const email = String(input.email ?? current?.email ?? "").trim().slice(0, 160);
  const bankDetails = String(input.bankDetails ?? current?.bankDetails ?? "").trim().slice(0, 500);
  const notes = String(input.notes ?? current?.notes ?? "").trim().slice(0, 2000);
  const status = String(input.status ?? current?.status ?? "active") === "inactive" ? "inactive" : "active";
  if (!businessName) throw new Error("Business name is required.");
  if (email && !email.includes("@")) throw new Error("Enter a valid vendor email.");
  if (gstin && !/^[A-Z0-9]{8,30}$/.test(gstin)) throw new Error("Enter a valid GSTIN or leave it blank.");
  return { businessName, legalName, gstin, state, stateCode, address, contactPerson, phone, email, bankDetails, notes, status };
}

function serializeVendor(vendor: JsonRecord, summary: JsonRecord = {}) {
  return { ...vendor, ...summary, _id: vendor._id ? String(vendor._id) : undefined };
}

async function nextVendorCode(database: Db) {
  const counter = await database.collection("counters").findOneAndUpdate(
    { _id: "vendors" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return `VEN-${String(Number(counter?.value ?? 1)).padStart(3, "0")}`;
}

async function vendorSummaries(database: Db, vendors: JsonRecord[]) {
  const vendorIds = vendors.map((vendor) => String(vendor._id));
  if (!vendorIds.length) return new Map<string, JsonRecord>();
  const [invoiceRows, productRows] = await Promise.all([
    database.collection("purchase_invoices").aggregate([
      { $match: { vendorId: { $in: vendorIds } } },
      { $group: { _id: "$vendorId", invoiceCount: { $sum: 1 }, lifetimeSpend: { $sum: { $ifNull: ["$totalPayable", 0] } } } },
    ]).toArray(),
    database.collection("products").aggregate([
      { $match: { primaryVendorId: { $in: vendorIds } } },
      { $group: { _id: "$primaryVendorId", productCount: { $sum: 1 } } },
    ]).toArray(),
  ]);
  const summaries = new Map<string, JsonRecord>();
  for (const row of invoiceRows) summaries.set(String(row._id), { invoiceCount: Number(row.invoiceCount ?? 0), lifetimeSpend: Number(row.lifetimeSpend ?? 0) });
  for (const row of productRows) summaries.set(String(row._id), { ...(summaries.get(String(row._id)) ?? {}), productCount: Number(row.productCount ?? 0) });
  return summaries;
}

async function adminVendors(request: Request, vendorId?: string) {
  const database = await db();
  const collection = database.collection("vendors");
  if (vendorId && !ObjectId.isValid(vendorId)) return fail("Vendor not found.", 404);
  const actor = adminIdentity(request) ?? "admin";

  if (request.method === "POST" || (vendorId && (request.method === "PUT" || request.method === "PATCH"))) {
    const input = await body(request);
    const current = vendorId ? await collection.findOne({ _id: new ObjectId(vendorId) }) as JsonRecord | null : null;
    if (vendorId && !current) return fail("Vendor not found.", 404);
    const now = new Date();
    let document: JsonRecord;
    try {
      document = vendorDocument(input, current ?? undefined);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Vendor details are invalid.");
    }
    if (vendorId) {
      const updated = await collection.findOneAndUpdate(
        { _id: new ObjectId(vendorId) },
        { $set: { ...document, ...auditUpdateFields(actor, now) } },
        { returnDocument: "after" },
      );
      if (!updated) return fail("Vendor not found.", 404);
      await database.collection("audit_logs").insertOne({
        entityType: "vendor",
        entityId: vendorId,
        action: "updated",
        actor,
        changes: document,
        createdAt: now,
      });
      return json(serializeVendor(updated));
    }
    const vendorCode = await nextVendorCode(database);
    const created = { ...document, vendorCode, ...auditCreateFields(actor, now) };
    const result = await collection.insertOne(created);
    await database.collection("audit_logs").insertOne({
      entityType: "vendor",
      entityId: String(result.insertedId),
      action: "created",
      actor,
      changes: created,
      createdAt: now,
    });
    return json(serializeVendor({ ...created, _id: result.insertedId }), { status: 201 });
  }

  if (vendorId && request.method === "GET") {
    const vendor = await collection.findOne({ _id: new ObjectId(vendorId) }) as JsonRecord | null;
    if (!vendor) return fail("Vendor not found.", 404);
    const [summaryMap, invoices, products] = await Promise.all([
      vendorSummaries(database, [vendor]),
      database.collection("purchase_invoices").find({ vendorId }).sort({ invoiceDate: -1 }).limit(100).toArray(),
      database.collection("products").find({ primaryVendorId: vendorId }).project({ id: 1, name: 1, price: 1, stock: 1 }).sort({ createdAt: -1 }).limit(200).toArray(),
    ]);
    return json(serializeVendor(vendor, {
      ...(summaryMap.get(vendorId) ?? { invoiceCount: 0, productCount: 0, lifetimeSpend: 0 }),
      invoices: invoices.map((invoice) => ({ ...invoice, _id: String(invoice._id) })),
      products,
    }));
  }

  if (request.method !== "GET") return fail("Method not allowed.", 405);
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const status = url.searchParams.get("status")?.trim();
  const query: JsonRecord = status && status !== "all" ? { status } : {};
  const candidates = await collection.find(query).sort({ status: 1, businessName: 1 }).limit(500).toArray();
  const searchValue = search?.toLocaleLowerCase() ?? "";
  const compactSearch = searchValue.replace(/[\s-]/g, "");
  const vendors = searchValue
    ? candidates.filter((vendor) => {
      const values = [vendor.vendorCode, vendor.businessName, vendor.legalName, vendor.gstin, vendor.contactPerson]
        .filter(Boolean)
        .map((value) => String(value).toLocaleLowerCase());
      return values.some((value) => value.includes(searchValue))
        || (compactSearch && values.some((value) => value.replace(/[\s-]/g, "").includes(compactSearch)));
    })
    : candidates;
  const summaries = await vendorSummaries(database, vendors);
  return json(vendors.map((vendor) => serializeVendor(vendor, summaries.get(String(vendor._id)) ?? { invoiceCount: 0, productCount: 0, lifetimeSpend: 0 })));
}

function expenseDocument(input: JsonRecord, current?: JsonRecord) {
  const rawDate = input.date ?? current?.date;
  const date = new Date(String(rawDate ?? ""));
  if (Number.isNaN(date.getTime())) throw new Error("Enter a valid expense date.");
  const category = String(input.category ?? current?.category ?? "").trim().slice(0, 80);
  const description = String(input.description ?? current?.description ?? "").trim().slice(0, 240);
  const amount = Number(input.amount ?? current?.amount ?? 0);
  const paymentMode = String(input.paymentMode ?? current?.paymentMode ?? "upi");
  if (!category) throw new Error("Enter an expense category.");
  if (!description) throw new Error("Enter an expense description.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an expense amount greater than zero.");
  if (!["cash", "upi", "card", "bank_transfer"].includes(paymentMode)) throw new Error("Choose a valid expense payment mode.");
  return {
    date,
    category,
    description,
    amount: Math.round(amount * 100) / 100,
    paymentMode,
    ...(String(input.vendorId ?? current?.vendorId ?? "").trim() ? { vendorId: String(input.vendorId ?? current?.vendorId).trim() } : {}),
    ...(String(input.tripId ?? current?.tripId ?? "").trim() ? { tripId: String(input.tripId ?? current?.tripId).trim() } : {}),
  };
}

function serializeExpense(expense: JsonRecord, vendor?: JsonRecord) {
  return {
    ...expense,
    _id: String(expense._id),
    date: expense.date instanceof Date ? expense.date.toISOString() : expense.date,
    ...(vendor ? { vendor: { _id: String(vendor._id), vendorCode: vendor.vendorCode, businessName: vendor.businessName } } : {}),
  };
}

async function adminExpenses(request: Request, expenseId?: string) {
  const database = await db();
  const collection = database.collection("expenses");
  if (expenseId && !ObjectId.isValid(expenseId)) return fail("Expense not found.", 404);
  const actor = adminIdentity(request) ?? "admin";

  if (request.method === "GET") {
    if (expenseId) {
      const expense = await collection.findOne({ _id: new ObjectId(expenseId) }) as JsonRecord | null;
      if (!expense) return fail("Expense not found.", 404);
      const vendor = expense.vendorId && ObjectId.isValid(String(expense.vendorId))
        ? await database.collection("vendors").findOne({ _id: new ObjectId(String(expense.vendorId)) })
        : null;
      return json(serializeExpense(expense, vendor ?? undefined));
    }
    const url = new URL(request.url);
    const category = url.searchParams.get("category")?.trim();
    const query = category && category !== "all" ? { category } : {};
    const expenses = await collection.find(query).sort({ date: -1, createdAt: -1 }).limit(500).toArray();
    const vendorIds = [...new Set(expenses.map((expense) => String(expense.vendorId ?? "")).filter((id) => ObjectId.isValid(id)))];
    const tripIds = [...new Set(expenses.map((expense) => String(expense.tripId ?? "")).filter((id) => ObjectId.isValid(id)))];
    const vendors = vendorIds.length
      ? await database.collection("vendors").find({ _id: { $in: vendorIds.map((id) => new ObjectId(id)) } }).project({ vendorCode: 1, businessName: 1 }).toArray()
      : [];
    const trips = tripIds.length
      ? await database.collection("business_trips").find({ _id: { $in: tripIds.map((id) => new ObjectId(id)) } }).project({ tripName: 1, location: 1 }).toArray()
      : [];
    const vendorMap = new Map(vendors.map((vendor) => [String(vendor._id), vendor]));
    const tripMap = new Map(trips.map((trip) => [String(trip._id), trip]));
    return json(expenses.map((expense) => {
      const trip = tripMap.get(String(expense.tripId ?? ""));
      return { ...serializeExpense(expense, vendorMap.get(String(expense.vendorId ?? ""))), trip: trip ? { _id: String(trip._id), tripName: trip.tripName, location: trip.location } : undefined };
    }));
  }

  if (request.method === "POST" || (expenseId && (request.method === "PUT" || request.method === "PATCH"))) {
    const input = await body(request);
    const current = expenseId ? await collection.findOne({ _id: new ObjectId(expenseId) }) as JsonRecord | null : null;
    if (expenseId && !current) return fail("Expense not found.", 404);
    let document: JsonRecord;
    try {
      document = expenseDocument(input, current ?? undefined);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Expense details are invalid.");
    }
    if (document.vendorId) {
      if (!ObjectId.isValid(String(document.vendorId))) return fail("Selected vendor is invalid.");
      const vendor = await database.collection("vendors").findOne({ _id: new ObjectId(String(document.vendorId)) });
      if (!vendor) return fail("Selected vendor was not found.");
    }
    if (document.tripId) {
      if (!ObjectId.isValid(String(document.tripId))) return fail("Selected trip is invalid.");
      const trip = await database.collection("business_trips").findOne({ _id: new ObjectId(String(document.tripId)) });
      if (!trip) return fail("Selected trip was not found.");
    }
    const now = new Date();
    if (expenseId) {
      const updated = await collection.findOneAndUpdate(
        { _id: new ObjectId(expenseId) },
        { $set: { ...document, ...auditUpdateFields(actor, now) } },
        { returnDocument: "after" },
      );
      if (!updated) return fail("Expense not found.", 404);
      await database.collection("audit_logs").insertOne({ entityType: "expense", entityId: expenseId, action: "updated", actor, changes: document, createdAt: now });
      return json(serializeExpense(updated));
    }
    const created = { ...document, ...auditCreateFields(actor, now) };
    const result = await collection.insertOne(created);
    await database.collection("audit_logs").insertOne({ entityType: "expense", entityId: String(result.insertedId), action: "created", actor, changes: document, createdAt: now });
    return json(serializeExpense({ ...created, _id: result.insertedId }), { status: 201 });
  }

  if (expenseId && request.method === "DELETE") {
    const deleted = await collection.findOneAndDelete({ _id: new ObjectId(expenseId) });
    if (!deleted) return fail("Expense not found.", 404);
    const deletedReceiptId = String((deleted.receiptFile as JsonRecord | undefined)?.id ?? "");
    if (ObjectId.isValid(deletedReceiptId)) {
      try { await new GridFSBucket(database, { bucketName: expenseReceiptBucketName }).delete(new ObjectId(deletedReceiptId)); } catch { /* Keep expense deletion successful if the binary was already absent. */ }
    }
    await database.collection("audit_logs").insertOne({ entityType: "expense", entityId: expenseId, action: "deleted", actor, changes: { amount: deleted.amount, category: deleted.category }, createdAt: new Date() });
    return json({ ok: true });
  }

  return fail("Method not allowed.", 405);
}

async function expenseReceipt(request: Request, expenseId: string) {
  if (!ObjectId.isValid(expenseId)) return fail("Expense not found.", 404);
  const database = await db();
  const expense = await database.collection("expenses").findOne({ _id: new ObjectId(expenseId) }) as JsonRecord | null;
  if (!expense) return fail("Expense not found.", 404);
  const receiptFile = expense.receiptFile as JsonRecord | undefined;
  const fileId = String(receiptFile?.id ?? "");
  const bucket = new GridFSBucket(database, { bucketName: expenseReceiptBucketName });

  if (request.method === "GET") {
    if (!ObjectId.isValid(fileId)) return fail("This expense has no receipt.", 404);
    const file = await bucket.find({ _id: new ObjectId(fileId) }).next();
    if (!file) return fail("Expense receipt not found.", 404);
    const chunks: Buffer[] = [];
    const stream = bucket.openDownloadStream(new ObjectId(fileId));
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const filename = String(receiptFile?.filename ?? file.filename ?? "expense-receipt").replace(/["\r\n]/g, "_");
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(Buffer.concat(chunks), {
      headers: {
        "cache-control": "private, no-store",
        "content-type": String(receiptFile?.contentType ?? file.metadata?.contentType ?? file.contentType ?? "application/octet-stream"),
        "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  }

  if (request.method === "DELETE") {
    if (ObjectId.isValid(fileId)) {
      try { await bucket.delete(new ObjectId(fileId)); } catch { /* The metadata cleanup is still safe if the binary was already removed. */ }
    }
    await database.collection("expenses").updateOne({ _id: new ObjectId(expenseId) }, { $unset: { receiptFile: "" }, $set: { updatedAt: new Date() } });
    await database.collection("audit_logs").insertOne({ entityType: "expense", entityId: expenseId, action: "receipt_deleted", actor: adminIdentity(request) ?? "admin", changes: { filename: receiptFile?.filename }, createdAt: new Date() });
    return json({ ok: true });
  }

  if (request.method !== "POST") return fail("Method not allowed.", 405);
  const form = await request.formData();
  const upload = form.get("receipt");
  if (!isUpload(upload) || upload.size === 0) return fail("Choose a PDF or image receipt.");
  if (upload.size > expenseReceiptLimit) return fail("Expense receipts must be smaller than 15 MB.");
  if (!expenseReceiptTypes.has(upload.type)) return fail("Only PDF, JPG, PNG, WEBP, and GIF receipts are supported.");
  try {
    if (ObjectId.isValid(fileId)) {
      try { await bucket.delete(new ObjectId(fileId)); } catch { /* Replace the metadata even if an old binary is missing. */ }
    }
    const uploadedId = await new Promise<ObjectId>((resolve, reject) => {
      const stream = bucket.openUploadStream(upload.name.slice(0, 180) || "expense-receipt", {
        metadata: { contentType: upload.type, expenseId },
      });
      stream.once("finish", () => resolve(stream.id as ObjectId));
      stream.once("error", reject);
      upload.arrayBuffer().then((buffer) => stream.end(Buffer.from(buffer))).catch(reject);
    });
    const nextReceiptFile = {
      id: String(uploadedId),
      filename: upload.name.slice(0, 180) || "expense-receipt",
      contentType: upload.type,
      size: upload.size,
      uploadedAt: new Date(),
    };
    await database.collection("expenses").updateOne({ _id: new ObjectId(expenseId) }, { $set: { receiptFile: nextReceiptFile, updatedAt: new Date() } });
    await database.collection("audit_logs").insertOne({ entityType: "expense", entityId: expenseId, action: "receipt_uploaded", actor: adminIdentity(request) ?? "admin", changes: nextReceiptFile, createdAt: new Date() });
    return json(nextReceiptFile);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not upload the expense receipt.");
  }
}

function tripDocument(input: JsonRecord, current?: JsonRecord) {
  const tripName = String(input.tripName ?? current?.tripName ?? "").trim().slice(0, 120);
  const purpose = String(input.purpose ?? current?.purpose ?? "").trim().slice(0, 240);
  const location = String(input.location ?? current?.location ?? "").trim().slice(0, 160);
  const startDate = new Date(String(input.startDate ?? current?.startDate ?? ""));
  const endDateValue = String(input.endDate ?? current?.endDate ?? "").trim();
  const endDate = endDateValue ? new Date(endDateValue) : undefined;
  if (!tripName) throw new Error("Enter a trip name.");
  if (Number.isNaN(startDate.getTime())) throw new Error("Enter a valid trip start date.");
  if (endDate && Number.isNaN(endDate.getTime())) throw new Error("Enter a valid trip end date.");
  if (endDate && endDate < startDate) throw new Error("Trip end date cannot be before the start date.");
  return { tripName, purpose, location, startDate, ...(endDate ? { endDate } : {}), notes: String(input.notes ?? current?.notes ?? "").trim().slice(0, 500) };
}

function serializeTrip(trip: JsonRecord, summary: JsonRecord = {}) {
  const tripId = String(trip._id);
  return {
    ...trip,
    _id: tripId,
    tripId: `TRIP-${tripId.slice(-8).toUpperCase()}`,
    startDate: trip.startDate instanceof Date ? trip.startDate.toISOString() : trip.startDate,
    endDate: trip.endDate instanceof Date ? trip.endDate.toISOString() : trip.endDate,
    ...summary,
  };
}

async function adminBusinessTrips(request: Request, tripId?: string) {
  const database = await db();
  const collection = database.collection("business_trips");
  const purchaseInvoices = database.collection("purchase_invoices");
  if (tripId && !ObjectId.isValid(tripId)) return fail("Business trip not found.", 404);
  const actor = adminIdentity(request) ?? "admin";

  if (request.method === "GET") {
    if (tripId) {
      const trip = await collection.findOne({ _id: new ObjectId(tripId) }) as JsonRecord | null;
      if (!trip) return fail("Business trip not found.", 404);
      const [expenses, purchaseInvoices] = await Promise.all([
        database.collection("expenses").find({ tripId }).sort({ date: -1 }).toArray(),
        database.collection("purchase_invoices").find({ tripId }).sort({ invoiceDate: -1 }).toArray(),
      ]);
      const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
      const purchaseInvoiceTotal = purchaseInvoices.reduce((sum, invoice) => sum + Number(invoice.totalPayable ?? 0), 0);
      return json(serializeTrip(trip, {
        expenses: expenses.map((expense) => serializeExpense(expense)),
        expenseCount: expenses.length,
        totalExpense,
        expenseTotal: totalExpense,
        purchaseInvoices: purchaseInvoices.map((invoice) => ({ _id: String(invoice._id), vendorInvoiceNumber: invoice.vendorInvoiceNumber, invoiceDate: invoice.invoiceDate instanceof Date ? invoice.invoiceDate.toISOString() : invoice.invoiceDate, totalPayable: invoice.totalPayable, status: invoice.status })),
        purchaseInvoiceCount: purchaseInvoices.length,
        purchaseInvoiceTotal,
        totalTripCost: totalExpense + purchaseInvoiceTotal,
      }));
    }
    const trips = await collection.find({}).sort({ startDate: -1, createdAt: -1 }).limit(300).toArray();
    const [expenseSummaries, invoiceSummaries] = await Promise.all([
      database.collection("expenses").aggregate([{ $match: { tripId: { $exists: true, $ne: "" } } }, { $group: { _id: "$tripId", expenseCount: { $sum: 1 }, totalExpense: { $sum: { $ifNull: ["$amount", 0] } } } }]).toArray(),
      database.collection("purchase_invoices").aggregate([{ $match: { tripId: { $exists: true, $ne: "" } } }, { $group: { _id: "$tripId", purchaseInvoiceCount: { $sum: 1 }, purchaseInvoiceTotal: { $sum: { $ifNull: ["$totalPayable", 0] } } } }]).toArray(),
    ]);
    const expenseMap = new Map(expenseSummaries.map((summary) => [String(summary._id), summary]));
    const invoiceMap = new Map(invoiceSummaries.map((summary) => [String(summary._id), summary]));
    return json(trips.map((trip) => {
      const expenses = expenseMap.get(String(trip._id)) ?? { expenseCount: 0, totalExpense: 0 };
      const invoices = invoiceMap.get(String(trip._id)) ?? { purchaseInvoiceCount: 0, purchaseInvoiceTotal: 0 };
      return serializeTrip(trip, { ...expenses, ...invoices, expenseTotal: expenses.totalExpense, totalTripCost: Number(expenses.totalExpense ?? 0) + Number(invoices.purchaseInvoiceTotal ?? 0) });
    }));
  }

  if (request.method === "POST" || (tripId && (request.method === "PUT" || request.method === "PATCH"))) {
    const input = await body(request);
    const current = tripId ? await collection.findOne({ _id: new ObjectId(tripId) }) as JsonRecord | null : null;
    if (tripId && !current) return fail("Business trip not found.", 404);
    let document: JsonRecord;
    try {
      document = tripDocument(input, current ?? undefined);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Business trip details are invalid.");
    }
    const purchaseInvoiceIds = [...new Set((Array.isArray(input.purchaseInvoiceIds) ? input.purchaseInvoiceIds : []).map((id) => String(id).trim()).filter(Boolean))];
    if (purchaseInvoiceIds.some((id) => !ObjectId.isValid(id))) return fail("One or more purchase invoice references are invalid.");
    const linkedInvoices = purchaseInvoiceIds.length
      ? await purchaseInvoices.find({ _id: { $in: purchaseInvoiceIds.map((id) => new ObjectId(id)) } }).project({ _id: 1 }).toArray()
      : [];
    if (linkedInvoices.length !== purchaseInvoiceIds.length) return fail("One or more selected purchase invoices were not found.");
    async function syncPurchaseInvoices(targetTripId: string) {
      await purchaseInvoices.updateMany({ tripId: targetTripId }, { $unset: { tripId: "" } });
      if (purchaseInvoiceIds.length) {
        await purchaseInvoices.updateMany({ _id: { $in: purchaseInvoiceIds.map((id) => new ObjectId(id)) } }, { $set: { tripId: targetTripId, updatedAt: new Date(), updatedBy: actor } });
      }
    }
    const now = new Date();
    if (tripId) {
      const updated = await collection.findOneAndUpdate({ _id: new ObjectId(tripId) }, { $set: { ...document, ...auditUpdateFields(actor, now) } }, { returnDocument: "after" });
      if (!updated) return fail("Business trip not found.", 404);
      await syncPurchaseInvoices(tripId);
      await database.collection("audit_logs").insertOne({ entityType: "business_trip", entityId: tripId, action: "updated", actor, changes: document, createdAt: now });
      return json(serializeTrip(updated));
    }
    const created = { ...document, ...auditCreateFields(actor, now) };
    const result = await collection.insertOne(created);
    await syncPurchaseInvoices(String(result.insertedId));
    await database.collection("audit_logs").insertOne({ entityType: "business_trip", entityId: String(result.insertedId), action: "created", actor, changes: document, createdAt: now });
    return json(serializeTrip({ ...created, _id: result.insertedId }), { status: 201 });
  }

  if (tripId && request.method === "DELETE") {
    const deleted = await collection.findOneAndDelete({ _id: new ObjectId(tripId) });
    if (!deleted) return fail("Business trip not found.", 404);
    await database.collection("expenses").updateMany({ tripId }, { $unset: { tripId: "" }, $set: { updatedAt: new Date(), updatedBy: actor } });
    await database.collection("audit_logs").insertOne({ entityType: "business_trip", entityId: tripId, action: "deleted", actor, changes: { tripName: deleted.tripName }, createdAt: new Date() });
    return json({ ok: true });
  }

  return fail("Method not allowed.", 405);
}

function invoiceDate(value: unknown, fallback = new Date()) {
  const parsed = value ? new Date(String(value)) : fallback;
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function serializeInvoice(invoice: JsonRecord, vendor?: JsonRecord, lines: JsonRecord[] = []) {
  return {
    ...invoice,
    _id: invoice._id ? String(invoice._id) : undefined,
    vendor: vendor ? { _id: String(vendor._id), vendorCode: vendor.vendorCode, businessName: vendor.businessName } : undefined,
    lines: lines.map((line) => ({ ...line, _id: line._id ? String(line._id) : undefined })),
  };
}

async function adminPurchaseInvoices(request: Request, invoiceId?: string) {
  const database = await db();
  const invoices = database.collection("purchase_invoices");
  const lines = database.collection("purchase_invoice_lines");
  const actor = adminIdentity(request) ?? "admin";
  if (invoiceId && !ObjectId.isValid(invoiceId)) return fail("Purchase invoice not found.", 404);

  if (invoiceId && request.method === "DELETE") {
    const existing = await invoices.findOne({ _id: new ObjectId(invoiceId) }) as JsonRecord | null;
    if (!existing) return fail("Purchase invoice not found.", 404);
    const deletionPolicy = purchaseInvoiceDeletionPolicy(existing.status);
    if (!deletionPolicy.allowed) return fail(deletionPolicy.error, deletionPolicy.statusCode);
    const documentFile = existing.documentFile as JsonRecord | undefined;
    const fileId = String(documentFile?.id ?? "");
    if (fileId && ObjectId.isValid(fileId)) {
      try { await bucket.delete(new ObjectId(fileId)); } catch { /* Metadata deletion remains safe if the attachment is already gone. */ }
    }
    await lines.deleteMany({ purchaseInvoiceId: invoiceId });
    const result = await invoices.deleteOne({ _id: new ObjectId(invoiceId) });
    if (!result.deletedCount) return fail("Purchase invoice not found.", 404);
    await database.collection("audit_logs").insertOne({
      entityType: "purchase_invoice",
      entityId: invoiceId,
      action: "deleted",
      actor,
      changes: { vendorInvoiceNumber: existing.vendorInvoiceNumber, status: existing.status },
      createdAt: new Date(),
    });
    return json({ ok: true });
  }

  async function buildInvoice(input: JsonRecord, current?: JsonRecord) {
    const vendorId = String(input.vendorId ?? current?.vendorId ?? "").trim();
    if (!ObjectId.isValid(vendorId)) throw new Error("Choose a valid vendor.");
    const vendor = await database.collection("vendors").findOne({ _id: new ObjectId(vendorId) });
    if (!vendor) throw new Error("Choose an existing vendor.");
    const vendorInvoiceNumber = String(input.vendorInvoiceNumber ?? current?.vendorInvoiceNumber ?? "").trim().slice(0, 80);
    if (!vendorInvoiceNumber) throw new Error("Vendor invoice number is required.");
    const correctionOfInvoiceId = String(input.correctionOfInvoiceId ?? current?.correctionOfInvoiceId ?? "").trim();
    const correctionReason = String(input.correctionReason ?? current?.correctionReason ?? "").trim().slice(0, 500);
    let originalCorrectionInvoice: JsonRecord | null = null;
    if (correctionOfInvoiceId) {
      if (!ObjectId.isValid(correctionOfInvoiceId)) throw new Error("The original invoice reference is invalid.");
      originalCorrectionInvoice = await invoices.findOne({ _id: new ObjectId(correctionOfInvoiceId) }) as JsonRecord | null;
      if (!originalCorrectionInvoice || originalCorrectionInvoice.status !== "posted") throw new Error("A correction must reference an existing posted invoice.");
      if (!correctionReason) throw new Error("Add a reason for correcting the posted invoice.");
    }
    const tripId = String(input.tripId ?? current?.tripId ?? "").trim();
    if (tripId) {
      if (!ObjectId.isValid(tripId)) throw new Error("The business trip reference is invalid.");
      const trip = await database.collection("business_trips").findOne({ _id: new ObjectId(tripId) });
      if (!trip) throw new Error("Choose an existing business trip.");
    }
    const parsedInvoiceDate = invoiceDate(input.invoiceDate ?? current?.invoiceDate);
    if (!parsedInvoiceDate) throw new Error("Enter a valid invoice date.");
    const paymentMethod = ["prepaid", "cod", "credit", "bank_transfer"].includes(String(input.paymentMethod ?? current?.paymentMethod))
      ? String(input.paymentMethod ?? current?.paymentMethod) : "credit";
    const paymentStatus = ["paid", "pending", "partially_paid"].includes(String(input.paymentStatus ?? current?.paymentStatus))
      ? String(input.paymentStatus ?? current?.paymentStatus) : "pending";
    const taxType = ["igst", "cgst_sgst"].includes(String(input.taxType ?? current?.taxType)) ? String(input.taxType ?? current?.taxType) : undefined;
    const taxRate = Math.min(100, Math.max(0, Number(input.taxRate ?? current?.taxRate ?? 0)));
    if (!Number.isFinite(taxRate)) throw new Error("Enter a valid tax rate.");
    if (taxRate > 0 && !taxType) throw new Error("Choose a tax type when tax is applied.");
    const rawLines = Array.isArray(input.lines) ? input.lines as JsonRecord[] : [];
    if (!rawLines.length) throw new Error("Add at least one invoice line.");
    const lineDocuments: JsonRecord[] = [];
    for (const [index, rawLine] of rawLines.entries()) {
      const productId = String(rawLine.productId ?? "").trim();
      const product = await database.collection("products").findOne({ id: productId });
      if (!product) throw new Error(`Line ${index + 1}: choose an existing product.`);
      const productVariants = Array.isArray(product.variants) ? product.variants as JsonRecord[] : [];
      const variantId = String(rawLine.variantId ?? "").trim();
      const variant = variantId ? productVariants.find((entry) => String(entry.id ?? "") === variantId) : undefined;
      if (productVariants.length && !variant) throw new Error(`Line ${index + 1}: choose a valid product color.`);
      if (variantId && !variant) throw new Error(`Line ${index + 1}: choose a valid product color.`);
      const quantityPurchased = Math.trunc(Number(rawLine.quantityPurchased ?? rawLine.quantity ?? 0));
      const costPricePerUnit = Number(rawLine.costPricePerUnit ?? rawLine.costPrice ?? 0);
      if (!Number.isInteger(quantityPurchased) || quantityPurchased <= 0) throw new Error(`Line ${index + 1}: quantity must be a positive whole number.`);
      if (!Number.isFinite(costPricePerUnit) || costPricePerUnit < 0) throw new Error(`Line ${index + 1}: enter a valid cost price.`);
      lineDocuments.push({
        productId,
        variantId: variantId || undefined,
        vendorProductCode: String(rawLine.vendorProductCode ?? "").trim().slice(0, 80),
        itemName: String(rawLine.itemName ?? variant?.color ?? product.name ?? productId).trim().slice(0, 180),
        quantityPurchased,
        costPricePerUnit: Math.round(costPricePerUnit * 100) / 100,
        lineAmount: Math.round(quantityPurchased * costPricePerUnit * 100) / 100,
      });
    }
    const subtotal = Math.round(lineDocuments.reduce((sum, line) => sum + Number(line.lineAmount ?? 0), 0) * 100) / 100;
    const taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
    return {
      document: {
        vendorId,
        vendorInvoiceNumber,
        invoiceDate: parsedInvoiceDate,
        placeOfSupply: String(input.placeOfSupply ?? current?.placeOfSupply ?? "").trim().slice(0, 80),
        paymentMethod,
        paymentStatus,
        status: current?.status === "posted" ? "posted" : "draft",
        subtotal,
        taxType,
        taxRate,
        taxAmount,
        totalPayable: Math.round((subtotal + taxAmount) * 100) / 100,
        receivedDate: invoiceDate(input.receivedDate ?? current?.receivedDate, parsedInvoiceDate) ?? parsedInvoiceDate,
        tripId: tripId || undefined,
        notes: String(input.notes ?? current?.notes ?? "").trim().slice(0, 2000),
        documentFile: current?.documentFile ?? originalCorrectionInvoice?.documentFile,
        correctionOfInvoiceId: correctionOfInvoiceId || undefined,
        correctionReason: correctionReason || undefined,
      },
      lineDocuments,
      vendor,
    };
  }

  async function detail(id: string) {
    const invoice = await invoices.findOne({ _id: new ObjectId(id) }) as JsonRecord | null;
    if (!invoice) return null;
    const [vendor, invoiceLines] = await Promise.all([
      database.collection("vendors").findOne({ _id: new ObjectId(String(invoice.vendorId)) }),
      lines.find({ purchaseInvoiceId: id }).sort({ _id: 1 }).toArray(),
    ]);
    const productIds = [...new Set(invoiceLines.map((line) => String(line.productId ?? "")).filter(Boolean))];
    const products = await database.collection("products").find({ id: { $in: productIds } }).project({ id: 1, name: 1, variants: 1 }).toArray();
    const productMap = new Map(products.map((product) => [String(product.id), product]));
    const enrichedLines = invoiceLines.map((line) => {
      const product = productMap.get(String(line.productId ?? ""));
      const variant = Array.isArray(product?.variants) ? (product.variants as JsonRecord[]).find((entry) => String(entry.id ?? "") === String(line.variantId ?? "")) : undefined;
      return { ...line, productName: product?.name, variantColor: variant?.color };
    });
    return serializeInvoice(invoice, vendor ?? undefined, enrichedLines);
  }

  if (request.method === "POST" && !invoiceId) {
    const input = await body(request);
    try {
      const { document, lineDocuments, vendor } = await buildInvoice(input);
      const now = new Date();
      const inserted = await invoices.insertOne({ ...document, ...auditCreateFields(actor, now) });
      await lines.insertMany(lineDocuments.map((line) => ({ ...line, purchaseInvoiceId: String(inserted.insertedId), ...auditCreateFields(actor, now) })));
      await database.collection("audit_logs").insertOne({ entityType: "purchase_invoice", entityId: String(inserted.insertedId), action: "created", actor, changes: document, createdAt: now });
      return json(await detail(String(inserted.insertedId)), { status: 201 });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not create purchase invoice.");
    }
  }

  if (invoiceId && request.method === "PATCH") {
    const input = await body(request);
    const invoice = await invoices.findOne({ _id: new ObjectId(invoiceId) }) as JsonRecord | null;
    if (!invoice) return fail("Purchase invoice not found.", 404);
    if (input.action === "update_payment") {
      const paymentStatus = ["paid", "pending", "partially_paid"].includes(String(input.paymentStatus ?? invoice.paymentStatus))
        ? String(input.paymentStatus ?? invoice.paymentStatus) : "pending";
      const paymentMethod = ["prepaid", "cod", "credit", "bank_transfer"].includes(String(input.paymentMethod ?? invoice.paymentMethod))
        ? String(input.paymentMethod ?? invoice.paymentMethod) : "credit";
      const now = new Date();
      await invoices.updateOne(
        { _id: new ObjectId(invoiceId) },
        { $set: { paymentStatus, paymentMethod, ...auditUpdateFields(actor, now) } },
      );
      await database.collection("audit_logs").insertOne({
        entityType: "purchase_invoice",
        entityId: invoiceId,
        action: "payment_updated",
        actor,
        changes: { paymentStatus, paymentMethod },
        createdAt: now,
      });
      return json(await detail(invoiceId));
    }
    if (input.action !== "post") return fail("Unsupported purchase invoice action.");
    if (invoice.status !== "draft") return fail("Only draft invoices can be posted.");
    const invoiceLines = await lines.find({ purchaseInvoiceId: invoiceId }).toArray();
    if (!invoiceLines.length) return fail("Add invoice lines before posting.");
    const correctionOfInvoiceId = String(invoice.correctionOfInvoiceId ?? "");
    let originalCorrectionInvoice: JsonRecord | null = null;
    let originalCorrectionLines: JsonRecord[] = [];
    if (correctionOfInvoiceId) {
      originalCorrectionInvoice = await invoices.findOne({ _id: new ObjectId(correctionOfInvoiceId) }) as JsonRecord | null;
      if (!originalCorrectionInvoice || originalCorrectionInvoice.status !== "posted") return fail("The original invoice for this correction is not posted.", 409);
      const existingCorrection = await invoices.findOne({ correctionOfInvoiceId, status: "posted", _id: { $ne: new ObjectId(invoiceId) } });
      if (existingCorrection) return fail("This posted invoice already has a completed correction.", 409);
      originalCorrectionLines = await lines.find({ purchaseInvoiceId: correctionOfInvoiceId }).toArray();
      if (!originalCorrectionLines.length) return fail("The original invoice has no lines to reverse.", 409);
    }
    const session = (await getClient()).startSession();
    try {
      await session.withTransaction(async () => {
        if (correctionOfInvoiceId && originalCorrectionInvoice) {
          for (const originalLine of originalCorrectionLines) {
            const originalQuantity = Number(originalLine.quantityPurchased ?? 0);
            const originalVariantId = String(originalLine.variantId ?? "");
            const originalBatchId = String(originalLine.stockBatchId ?? "");
            if (!originalBatchId || !ObjectId.isValid(originalBatchId)) throw new Error(`Original line ${originalLine.itemName} has no reversible stock batch.`);
            const originalBatch = await database.collection("stock_batches").findOne({ _id: new ObjectId(originalBatchId) }, { session });
            if (!originalBatch) throw new Error(`Stock batch for ${originalLine.itemName} could not be found.`);
            if (Number(originalBatch.quantityRemaining ?? 0) < originalQuantity) throw new Error(`Cannot correct ${originalLine.itemName} because some of its stock has already been sold or consumed.`);
            const originalProduct = await database.collection("products").findOne({ id: String(originalLine.productId) }, { session });
            if (!originalProduct) throw new Error(`Product ${originalLine.productId} no longer exists.`);
            const originalVariants = Array.isArray(originalProduct.variants) ? originalProduct.variants as JsonRecord[] : [];
            const originalVariant = originalVariantId ? originalVariants.find((entry) => String(entry.id ?? "") === originalVariantId) : undefined;
            const previousStock = Number(originalVariant?.stock ?? originalProduct.stock ?? 0);
            const nextStock = previousStock - originalQuantity;
            if (nextStock < 0) throw new Error(`Cannot reverse ${originalLine.itemName} because current stock is lower than the original quantity.`);
            const reverseResult = await database.collection("products").updateOne(
              originalVariantId
                ? { id: String(originalLine.productId), variants: { $elemMatch: { id: originalVariantId, stock: previousStock } } }
                : { id: String(originalLine.productId), stock: previousStock },
              originalVariantId
                ? { $inc: { "variants.$.stock": -originalQuantity, stock: -originalQuantity }, $set: { updatedAt: new Date() } }
                : { $set: { stock: nextStock, updatedAt: new Date() } },
              { session },
            );
            if (!reverseResult.modifiedCount) throw new Error(`Could not reverse stock for ${originalLine.itemName}.`);
            await database.collection("stock_batches").updateOne(
              { _id: new ObjectId(originalBatchId) },
              { $set: { quantityRemaining: 0, status: "void", sourceCorrectionInvoiceId: invoiceId, ...auditUpdateFields(actor) } },
              { session },
            );
            await database.collection("inventory_movements").insertOne({
              productId: String(originalLine.productId),
              ...(originalVariantId ? { variantId: originalVariantId, variantColor: String(originalVariant?.color ?? "") } : {}),
              productName: String(originalProduct.name ?? originalLine.itemName),
              quantity: -originalQuantity,
              previousStock,
              nextStock,
              eventType: "purchase_correction",
              reason: `Reversed by correction ${String(invoice.vendorInvoiceNumber)}`,
              sourcePurchaseInvoiceId: correctionOfInvoiceId,
              sourceCorrectionInvoiceId: invoiceId,
              ...auditCreateFields(actor),
            }, { session });
          }
        }
        for (const line of invoiceLines) {
          const product = await database.collection("products").findOne({ id: String(line.productId) }, { session });
          if (!product) throw new Error(`Product ${line.productId} no longer exists.`);
          const quantity = Number(line.quantityPurchased ?? 0);
          const variantId = String(line.variantId ?? "");
          const productVariants = Array.isArray(product.variants) ? product.variants as JsonRecord[] : [];
          const variant = variantId ? productVariants.find((entry) => String(entry.id ?? "") === variantId) : undefined;
          if (productVariants.length && !variant) throw new Error(`Product color for ${line.itemName} no longer exists.`);
          const previousStock = Number(variant?.stock ?? product.stock ?? 0);
          const nextStock = previousStock + quantity;
          const stockBatch = {
            productId: String(line.productId),
            variantId: variantId || undefined,
            vendorId: String(invoice.vendorId),
            vendorProductCode: String(line.vendorProductCode ?? ""),
            sourceType: "purchase",
            sourcePurchaseInvoiceId: invoiceId,
            ...(correctionOfInvoiceId ? { sourceCorrectionInvoiceId: invoiceId } : {}),
            sourcePurchaseInvoiceLineId: String(line._id),
            sourceLabel: String(invoice.vendorInvoiceNumber),
            quantityReceived: quantity,
            quantityRemaining: quantity,
            costPricePerUnit: Number(line.costPricePerUnit ?? 0),
            receivedDate: invoice.receivedDate ?? invoice.invoiceDate,
            status: "in_stock",
            ...auditCreateFields(actor),
          };
          const batchResult = await database.collection("stock_batches").insertOne(stockBatch, { session });
          if (variantId) {
            const updated = await database.collection("products").updateOne(
              { id: String(line.productId), variants: { $elemMatch: { id: variantId } } },
              { $inc: { "variants.$.stock": quantity, stock: quantity }, $set: { updatedAt: new Date() } },
              { session },
            );
            if (!updated.modifiedCount) throw new Error(`Could not update stock for ${line.itemName}.`);
          } else {
            const updated = await database.collection("products").updateOne(
              { id: String(line.productId) },
              { $inc: { stock: quantity }, $set: { updatedAt: new Date() } },
              { session },
            );
            if (!updated.modifiedCount) throw new Error(`Could not update stock for ${line.itemName}.`);
          }
          await database.collection("inventory_movements").insertOne({
            productId: String(line.productId),
            ...(variantId ? { variantId, variantColor: String(variant?.color ?? "") } : {}),
            productName: String(product.name ?? line.itemName),
            quantity,
            previousStock,
            nextStock,
            eventType: "purchase",
            reason: `Purchase invoice ${String(invoice.vendorInvoiceNumber)}`,
            sourcePurchaseInvoiceId: invoiceId,
            sourcePurchaseInvoiceLineId: String(line._id),
            ...auditCreateFields(actor),
          }, { session });
          await lines.updateOne({ _id: line._id }, { $set: { stockBatchId: String(batchResult.insertedId), updatedAt: new Date() } }, { session });
        }
        await invoices.updateOne(
          { _id: new ObjectId(invoiceId), status: "draft" },
          { $set: { status: "posted", postedAt: new Date(), postedBy: actor, ...auditUpdateFields(actor) } },
          { session },
        );
        if (correctionOfInvoiceId) {
          await database.collection("audit_logs").insertOne({
            entityType: "purchase_invoice",
            entityId: correctionOfInvoiceId,
            action: "corrected",
            actor,
            changes: { correctionInvoiceId: invoiceId, correctionReason: invoice.correctionReason },
            createdAt: new Date(),
          }, { session });
        }
        await database.collection("audit_logs").insertOne({ entityType: "purchase_invoice", entityId: invoiceId, action: "posted", actor, createdAt: new Date() }, { session });
      });
      return json(await detail(invoiceId));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not post purchase invoice.");
    } finally {
      await session.endSession();
    }
  }

  if (invoiceId && request.method === "PUT") {
    const current = await invoices.findOne({ _id: new ObjectId(invoiceId) }) as JsonRecord | null;
    if (!current) return fail("Purchase invoice not found.", 404);
    if (current.status !== "draft") return fail("Posted invoices are locked. Use a correction workflow instead.");
    const input = await body(request);
    try {
      const { document } = await buildInvoice(input, current);
      const now = new Date();
      await invoices.updateOne({ _id: new ObjectId(invoiceId), status: "draft" }, { $set: { ...document, ...auditUpdateFields(actor, now) } });
      await lines.deleteMany({ purchaseInvoiceId: invoiceId });
      const { lineDocuments } = await buildInvoice(input, current);
      await lines.insertMany(lineDocuments.map((line) => ({ ...line, purchaseInvoiceId: invoiceId, ...auditCreateFields(actor, now) })));
      await database.collection("audit_logs").insertOne({ entityType: "purchase_invoice", entityId: invoiceId, action: "updated", actor, changes: document, createdAt: now });
      return json(await detail(invoiceId));
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not update purchase invoice.");
    }
  }

  if (invoiceId && request.method === "GET") {
    const result = await detail(invoiceId);
    return result ? json(result) : fail("Purchase invoice not found.", 404);
  }

  if (request.method !== "GET") return fail("Method not allowed.", 405);
  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim();
  const payment = url.searchParams.get("payment")?.trim();
  const search = url.searchParams.get("search")?.trim().toLocaleLowerCase() ?? "";
  const query: JsonRecord = {
    ...(status && status !== "all" ? { status } : {}),
    ...(payment && payment !== "all" ? { paymentStatus: payment } : {}),
  };
  const rows = await invoices.find(query).sort({ invoiceDate: -1, createdAt: -1 }).limit(500).toArray();
  const vendorIds = [...new Set(rows.map((row) => String(row.vendorId)))].filter(ObjectId.isValid);
  const vendorRows = await database.collection("vendors").find({ _id: { $in: vendorIds.map((id) => new ObjectId(id)) } }).toArray();
  const vendorMap = new Map(vendorRows.map((vendor) => [String(vendor._id), vendor]));
  const lineCounts = await lines.aggregate([{ $match: { purchaseInvoiceId: { $in: rows.map((row) => String(row._id)) } } }, { $group: { _id: "$purchaseInvoiceId", count: { $sum: 1 } } }]).toArray();
  const countMap = new Map(lineCounts.map((row) => [String(row._id), Number(row.count)]));
  const filtered = rows.map((row) => {
    const vendor = vendorMap.get(String(row.vendorId));
    const searchable = [row.vendorInvoiceNumber, vendor?.businessName, vendor?.vendorCode].filter(Boolean).join(" ").toLocaleLowerCase();
    return search && !searchable.includes(search) ? null : {
      ...serializeInvoice(row, vendor),
      lineCount: countMap.get(String(row._id)) ?? 0,
    };
  }).filter(Boolean);
  return json(filtered);
}

async function purchaseInvoiceDocument(request: Request, invoiceId: string) {
  if (!ObjectId.isValid(invoiceId)) return fail("Purchase invoice not found.", 404);
  const database = await db();
  const invoice = await database.collection("purchase_invoices").findOne({ _id: new ObjectId(invoiceId) }) as JsonRecord | null;
  if (!invoice) return fail("Purchase invoice not found.", 404);
  const documentFile = invoice.documentFile as JsonRecord | undefined;
  const fileId = String(documentFile?.id ?? "");
  if (!ObjectId.isValid(fileId)) return fail("This purchase invoice has no original document.", 404);
  const bucket = new GridFSBucket(database, { bucketName: purchaseInvoiceDocumentBucketName });

  if (request.method === "GET") {
    const file = await bucket.find({ _id: new ObjectId(fileId) }).next();
    if (!file) return fail("Purchase invoice document not found.", 404);
    const chunks: Buffer[] = [];
    const stream = bucket.openDownloadStream(new ObjectId(fileId));
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const filename = String(documentFile?.filename ?? file.filename ?? "purchase-invoice-document").replace(/["\r\n]/g, "_");
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(Buffer.concat(chunks), {
      headers: {
        "cache-control": "private, no-store",
        "content-type": String(documentFile?.contentType ?? file.metadata?.contentType ?? file.contentType ?? "application/octet-stream"),
        "content-disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  }

  if (request.method !== "POST") return fail("Method not allowed.", 405);
  if (invoice.status !== "draft") return fail("Posted invoices are locked. Upload a document on a correction draft instead.");
  const form = await request.formData();
  const upload = form.get("document");
  if (!isUpload(upload) || upload.size === 0) return fail("Choose a PDF or image invoice document.");
  if (upload.size > purchaseInvoiceDocumentLimit) return fail("Invoice documents must be smaller than 15 MB.");
  if (!purchaseInvoiceDocumentTypes.has(upload.type)) return fail("Only PDF, JPG, PNG, WEBP, and GIF invoice documents are supported.");

  try {
    const bucket = new GridFSBucket(database, { bucketName: purchaseInvoiceDocumentBucketName });
    const fileId = await new Promise<ObjectId>((resolve, reject) => {
      const stream = bucket.openUploadStream(upload.name.slice(0, 180) || "purchase-invoice-document", {
        metadata: { contentType: upload.type, invoiceId },
      });
      stream.once("finish", () => resolve(stream.id as ObjectId));
      stream.once("error", reject);
      upload.arrayBuffer().then((buffer) => stream.end(Buffer.from(buffer))).catch(reject);
    });
    const documentFile = {
      id: String(fileId),
      filename: upload.name.slice(0, 180) || "purchase-invoice-document",
      contentType: upload.type,
      size: upload.size,
      uploadedAt: new Date(),
    };
    await database.collection("purchase_invoices").updateOne(
      { _id: new ObjectId(invoiceId), status: "draft" },
      { $set: { documentFile, updatedAt: new Date() } },
    );
    await database.collection("audit_logs").insertOne({
      entityType: "purchase_invoice",
      entityId: invoiceId,
      action: "document_uploaded",
      actor: adminIdentity(request) ?? "admin",
      changes: documentFile,
      createdAt: new Date(),
    });
    return json(await (async () => {
      const refreshed = await database.collection("purchase_invoices").findOne({ _id: new ObjectId(invoiceId) }) as JsonRecord | null;
      if (!refreshed) return {};
      const vendor = await database.collection("vendors").findOne({ _id: new ObjectId(String(refreshed.vendorId)) });
      const invoiceLines = await database.collection("purchase_invoice_lines").find({ purchaseInvoiceId: invoiceId }).sort({ _id: 1 }).toArray();
      return serializeInvoice(refreshed, vendor ?? undefined, invoiceLines);
    })());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not upload the invoice document.");
  }
}

async function ordersHistory(request: Request) {
  const url = new URL(request.url);
  const query: JsonRecord = {};
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const payment = url.searchParams.get("payment");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (status && status !== "all") query.status = status;
  if (payment && payment !== "all") query.paymentStatus = payment === "paid" ? { $in: ["paid", "success", "completed"] } : payment;
  if (search) query.$or = [{ orderId: { $regex: search, $options: "i" } }, { customerName: { $regex: search, $options: "i" } }, { customerEmail: { $regex: search, $options: "i" } }, { customerPhone: { $regex: search, $options: "i" } }];
  if (from || to) query.createdAt = { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(`${to}T23:59:59.999Z`) } : {}) };
  const sort = url.searchParams.get("sort") === "oldest" ? { createdAt: 1 } : url.searchParams.get("sort") === "amount" ? { total: -1 } : { createdAt: -1 };
  const database = await db();
  const orderRows = await database.collection("orders").find(query).sort(sort).limit(500).toArray();
  const customerIds = orderRows.map((order) => order.customerId).filter(Boolean);
  const customerPhones = orderRows.map((order) => order.customerPhone).filter(Boolean);
  const customers = await database.collection("customers").find({
    $or: [
      ...(customerIds.length ? [{ _id: { $in: customerIds } }] : []),
      ...(customerPhones.length ? [{ phone: { $in: customerPhones } }] : []),
    ],
  }).toArray();
  const customersById = new Map(customers.map((customer) => [String(customer._id), customer]));
  const customersByPhone = new Map(customers.map((customer) => [String(customer.phone), customer]));
  const productIds = orderRows.flatMap((order) => Array.isArray(order.items) ? order.items.map((item: JsonRecord) => item.productId).filter(Boolean) : []);
  const catalogProducts = await database.collection("products").find({ id: { $in: [...new Set(productIds)] } }).toArray();
  const productsById = new Map(catalogProducts.map((product) => [String(product.id), product]));
  return json(orderRows.map((order) => {
    const customer = (order.customerId && customersById.get(String(order.customerId))) || customersByPhone.get(String(order.customerPhone));
    const normalizedItems = Array.isArray(order.items) ? order.items.map((item: JsonRecord) => {
      const product = productsById.get(String(item.productId));
      return {
        ...item,
        name: item.name || product?.name,
        image: item.image || product?.image,
        price: Number(item.price ?? 0) > 0 ? item.price : Number(product?.price ?? 0),
      };
    }) : [];
    const itemSubtotal = normalizedItems.reduce((sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 0), 0);
    const shipping = Number(order.shipping ?? 0);
    const total = Number(order.total ?? 0);
    const subtotal = Number(order.subtotal ?? 0) || itemSubtotal;
    const discount = Number(order.discount ?? 0) || Math.max(0, subtotal + shipping - total);
    return {
      ...order,
      customerName: order.customerName || customer?.name || "",
      customerEmail: order.customerEmail || customer?.email || "",
      customerPhone: order.customerPhone || customer?.phone || "",
      items: normalizedItems,
      subtotal,
      shipping,
      discount,
    };
  }));
}

async function adminOrders(request: Request, orderId?: string) {
  const database = await db();
  const collection = database.collection("orders");
  const actor = adminIdentity(request) ?? "admin";
  if (orderId && !ObjectId.isValid(orderId)) return fail("Order not found.", 404);

  if (orderId && request.method === "DELETE") {
    const existingOrder = await collection.findOne({ _id: new ObjectId(orderId) });
    if (!existingOrder) return fail("Order not found.", 404);
    if (existingOrder.inventoryAdjusted === true && Array.isArray(existingOrder.items)) {
      for (const item of existingOrder.items) {
        const productId = String(item?.productId ?? "");
        const quantity = Math.max(0, Math.trunc(Number(item?.quantity) || 0));
        if (!productId || !quantity) continue;
        const variantId = String(item?.variantId ?? "");
        const allocations = Array.isArray(item?.stockAllocations) ? item.stockAllocations as JsonRecord[] : [];
        const restoredQuantity = allocations.reduce((sum, allocation) => sum + Math.max(0, Math.trunc(Number(allocation.quantity) || 0)), 0);
        if (allocations.length && restoredQuantity !== quantity) return fail("This order has incomplete FIFO allocation data and cannot be deleted safely.", 409);
        for (const allocation of allocations) {
          const batchId = String(allocation.batchId ?? "");
          if (!ObjectId.isValid(batchId)) return fail("This order references an invalid stock batch.", 409);
          await database.collection("stock_batches").updateOne(
            { _id: new ObjectId(batchId) },
            { $inc: { quantityRemaining: Number(allocation.quantity) }, $set: { status: "in_stock", ...auditUpdateFields("admin") } },
          );
        }
        const before = await database.collection("products").findOne({ id: productId });
        if (!before) continue;
        const beforeVariant = variantId && Array.isArray(before.variants) ? (before.variants as JsonRecord[]).find((entry) => String(entry.id ?? "") === variantId) : undefined;
        const previousStock = Number(beforeVariant?.stock ?? before.stock ?? 0);
        const product = await database.collection("products").findOneAndUpdate(
          variantId
            ? { id: productId, variants: { $elemMatch: { id: variantId } } }
            : { id: productId },
          variantId
            ? { $inc: { "variants.$.stock": quantity, stock: quantity }, $set: { updatedAt: new Date() } }
            : { $inc: { stock: quantity }, $set: { updatedAt: new Date() } },
          { returnDocument: "after" },
        );
        if (product) {
          await database.collection("inventory_movements").insertOne({
            orderId: existingOrder.orderId,
            eventType: "order_deleted",
            productId,
            ...(variantId ? { variantId, variantColor: String(beforeVariant?.color ?? item.variantColor ?? "") } : {}),
            productName: product.name,
            quantity,
            previousStock,
            nextStock: Number(variantId ? (product.variants as JsonRecord[] | undefined)?.find((entry) => String(entry.id ?? "") === variantId)?.stock ?? 0 : product.stock ?? 0),
            stockAllocations: allocations,
            reason: "Order deleted; FIFO stock restored",
            createdAt: new Date(),
          });
        }
      }
    }
    const result = await collection.deleteOne({ _id: new ObjectId(orderId) });
    if (!result.deletedCount) return fail("Order not found.", 404);
    await database.collection("audit_logs").insertOne({ entityType: "order", entityId: orderId, action: "deleted", actor, changes: { orderId: existingOrder.orderId }, createdAt: new Date() });
    return json({ ok: true });
  }

  if (request.method === "POST" || (orderId && (request.method === "PUT" || request.method === "PATCH"))) {
    const input = await body(request);
    const existing = orderId ? await collection.findOne({ _id: new ObjectId(orderId) }) : null;
    if (orderId && !existing) return fail("Order not found.", 404);
    const source = existing ? { ...existing, ...input } : input;
    const status = String(source.status ?? "pending");
    const paymentStatus = String(source.paymentStatus ?? "demo");
    const allowedStatuses = ["pending", "approved", "processing", "shipped", "delivered", "cancelled", "rejected"];
    if (!allowedStatuses.includes(status)) return fail("Invalid order status.");
    if (!paymentStatus || paymentStatus.length > 40) return fail("Invalid payment status.");
    const items = Array.isArray(source.items) ? source.items.filter((item) => item && typeof item === "object").map((item) => {
      const row = item as JsonRecord;
      return {
        productId: String(row.productId ?? "").trim(),
        ...(String(row.variantId ?? "").trim() ? { variantId: String(row.variantId).trim() } : {}),
        ...(String(row.variantColor ?? "").trim() ? { variantColor: String(row.variantColor).trim() } : {}),
        name: String(row.name ?? "").trim(),
        image: String(row.image ?? "").trim(),
        quantity: Math.max(1, Math.trunc(Number(row.quantity) || 1)),
        price: Math.max(0, Number(row.price) || 0),
        ...(Array.isArray(row.stockAllocations) ? {
          stockAllocations: row.stockAllocations
            .filter((allocation) => allocation && typeof allocation === "object")
            .map((allocation) => ({
              batchId: String((allocation as JsonRecord).batchId ?? ""),
              quantity: Math.max(0, Math.trunc(Number((allocation as JsonRecord).quantity) || 0)),
            }))
            .filter((allocation) => allocation.batchId && allocation.quantity > 0),
        } : {}),
      };
    }).filter((item) => item.productId) : [];
    const now = new Date();
    const previousHistory = Array.isArray(existing?.statusHistory) ? existing.statusHistory : [];
    const statusHistory = previousHistory.length
      ? previousHistory
      : [{ status: String(existing?.status ?? status), changedAt: existing?.createdAt ?? now }];
    if (existing && String(existing.status ?? "pending") !== status) {
      statusHistory.push({ status, changedAt: now });
    }
    const document = {
      orderId: String(source.orderId ?? "").trim().slice(0, 80),
      customerName: String(source.customerName ?? "").trim().slice(0, 120),
      customerPhone: String(source.customerPhone ?? "").replace(/\D/g, "").slice(-10),
      customerEmail: String(source.customerEmail ?? "").trim().slice(0, 160),
      status,
      statusHistory,
      paymentStatus,
      paymentMethod: String(source.paymentMethod ?? "Demo").trim().slice(0, 60),
      ...(source.paymentDetails !== undefined ? { paymentDetails: String(source.paymentDetails).trim().slice(0, 200) } : {}),
      ...(source.transactionId !== undefined ? { transactionId: String(source.transactionId).trim().slice(0, 120) } : {}),
      ...(source.shippingAddress !== undefined ? { shippingAddress: source.shippingAddress } : {}),
      ...(source.address !== undefined ? { address: source.address } : {}),
      ...(source.inventoryAdjusted !== undefined ? { inventoryAdjusted: source.inventoryAdjusted === true } : {}),
      items,
      subtotal: Math.max(0, Number(source.subtotal) || 0),
      shipping: Math.max(0, Number(source.shipping) || 0),
      discount: Math.max(0, Number(source.discount) || 0),
      total: Math.max(0, Number(source.total) || 0),
      updatedAt: now,
    };
    if (document.customerEmail && !document.customerEmail.includes("@")) return fail("Enter a valid customer email.");
    if (orderId) {
      const updated = await collection.findOneAndUpdate({ _id: new ObjectId(orderId) }, { $set: document }, { returnDocument: "after" });
      return updated ? json(updated) : fail("Order not found.", 404);
    }
    const orderNumber = await database.collection("counters").findOneAndUpdate({ _id: "orders" }, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after" });
    const created = { ...document, orderId: document.orderId || `BawriBanno${String(Number(orderNumber?.value ?? 1)).padStart(2, "0")}`, createdAt: new Date() };
    const result = await collection.insertOne(created);
    return json({ ...created, _id: result.insertedId }, { status: 201 });
  }

  return ordersHistory(request);
}

async function updateOrder(request: Request, id: string) {
  if (!ObjectId.isValid(id)) return fail("Order not found.", 404);
  const input = await body(request);
  const status = String(input.status ?? "");
    const allowed = ["pending", "approved", "processing", "shipped", "delivered", "cancelled", "rejected"];
  if (!allowed.includes(status)) return fail("Invalid order status.");
  const database = await db();
  const existing = await database.collection("orders").findOne({ _id: new ObjectId(id) });
  if (!existing) return fail("Order not found.", 404);
  const now = new Date();
  const history = Array.isArray(existing.statusHistory) && existing.statusHistory.length
    ? existing.statusHistory
    : [{ status: String(existing.status ?? "pending"), changedAt: existing.createdAt ?? now }];
  if (String(existing.status ?? "pending") !== status) history.push({ status, changedAt: now });
  const result = await database.collection("orders").findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status, statusHistory: history, updatedAt: now } },
    { returnDocument: "after" },
  );
  if (result && String(existing.status ?? "pending") !== status) {
    await database.collection("audit_logs").insertOne({
      entityType: "order",
      entityId: id,
      action: "updated",
      actor: adminIdentity(request) ?? "admin",
      changes: { status: { from: String(existing.status ?? "pending"), to: status } },
      createdAt: now,
    });
  }
  return result ? json(result) : fail("Order not found.", 404);
}

async function customersHistory(request: Request, customerId?: string) {
  const database = await db();
  const collection = database.collection("customers");
  if (customerId && !ObjectId.isValid(customerId)) return fail("Customer not found.", 404);
  if (customerId && request.method === "DELETE") {
    const current = await collection.findOne({ _id: new ObjectId(customerId) });
    const result = await collection.deleteOne({ _id: new ObjectId(customerId) });
    if (!result.deletedCount) return fail("Customer not found.", 404);
    await database.collection("audit_logs").insertOne({ entityType: "customer", entityId: customerId, action: "deleted", actor: adminIdentity(request) ?? "admin", changes: { name: current?.name ?? "", phone: current?.phone ?? "" }, createdAt: new Date() });
    return json({ ok: true });
  }
  if (request.method === "POST" || (customerId && (request.method === "PUT" || request.method === "PATCH"))) {
    const input = await body(request);
    const phone = String(input.phone ?? "").replace(/\D/g, "").slice(-10);
    const name = String(input.name ?? "").trim().slice(0, 120);
    const email = String(input.email ?? "").trim().slice(0, 160);
    if (phone.length !== 10) return fail("Enter a valid 10-digit mobile number.");
    if (!name) return fail("Customer name is required.");
    if (!email.includes("@")) return fail("Enter a valid customer email.");
    const duplicate = await collection.findOne({ phone, ...(customerId ? { _id: { $ne: new ObjectId(customerId) } } : {}) });
    if (duplicate) return fail("A customer with this mobile number already exists.", 409);
    if (customerId) {
      const updated = await collection.findOneAndUpdate({ _id: new ObjectId(customerId) }, { $set: { name, email, phone, updatedAt: new Date() } }, { returnDocument: "after" });
      if (updated) await database.collection("audit_logs").insertOne({ entityType: "customer", entityId: customerId, action: "updated", actor: adminIdentity(request) ?? "admin", changes: { name, email, phone }, createdAt: new Date() });
      return updated ? json(updated) : fail("Customer not found.", 404);
    }
    const created = { name, email, phone, wishlist: [], addresses: [], createdAt: new Date(), updatedAt: new Date() };
    const result = await collection.insertOne(created);
    await database.collection("audit_logs").insertOne({ entityType: "customer", entityId: String(result.insertedId), action: "created", actor: adminIdentity(request) ?? "admin", changes: { name, email, phone }, createdAt: new Date() });
    return json({ ...created, _id: result.insertedId }, { status: 201 });
  }
  if (customerId) {
    const customer = await database.collection("customers").findOne({ _id: new ObjectId(customerId) });
    if (!customer) return fail("Customer not found.", 404);
    const orders = await database.collection("orders").find({
      $or: [
        { customerId: new ObjectId(customerId) },
        { customerId: String(customerId) },
        ...(customer.phone ? [{ customerPhone: customer.phone }] : []),
        ...(customer.email ? [{ customerEmail: customer.email }] : []),
      ],
    }).sort({ createdAt: -1 }).toArray();
    return json({ customer, orders });
  }
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const cityFilter = url.searchParams.get("city")?.trim().toLowerCase();
  const stateFilter = url.searchParams.get("state")?.trim().toLowerCase();
  const activityFilter = url.searchParams.get("activity")?.trim() || "all";
  const paidFilter = url.searchParams.get("paid")?.trim() || "all";
  const sortField = url.searchParams.get("sortField")?.trim() || "joined";
  const sortDirection = url.searchParams.get("sortDirection") === "oldest" ? "oldest" : "newest";
  const query = search ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { phone: { $regex: search, $options: "i" } }] } : {};
  const customers = await database.collection("customers").find(query).sort({ createdAt: -1 }).limit(500).toArray();
  const customerIds = customers.map((customer) => customer._id);
  const customerPhones = customers.map((customer) => customer.phone).filter(Boolean);
  const customerEmails = customers.map((customer) => customer.email).filter(Boolean);
  const orderMatch = [
    ...(customerIds.length ? [{ customerId: { $in: [...customerIds, ...customerIds.map(String)] } }] : []),
    ...(customerPhones.length ? [{ customerPhone: { $in: customerPhones } }] : []),
    ...(customerEmails.length ? [{ customerEmail: { $in: customerEmails } }] : []),
  ];
  const orders = orderMatch.length ? await database.collection("orders").find({ $or: orderMatch }).sort({ createdAt: -1 }).limit(5000).toArray() : [];
  const allOrders = await database.collection("orders").find({}).project({ total: 1 }).limit(5000).toArray();
  const summary = new Map<string, { orders: number; total: number; latestActivity?: Date; paid: boolean; city?: string; state?: string; latestOrderName?: string }>();
  const readAddress = (value: unknown) => {
    if (!value || typeof value !== "object") return {};
    const address = value as JsonRecord;
    return {
      city: String(address.city ?? "").trim(),
      state: String(address.state ?? "").trim(),
    };
  };
  const customerForOrder = (order: JsonRecord) => customers.find((customer) =>
    (order.customerId != null && (String(order.customerId) === String(customer._id) || String(order.customerId) === String(customer._id))) ||
    (customer.phone && String(order.customerPhone ?? "") === String(customer.phone)) ||
    (customer.email && String(order.customerEmail ?? "").toLowerCase() === String(customer.email).toLowerCase()),
  );
  for (const order of orders) {
    const customer = customerForOrder(order);
    if (!customer) continue;
    const key = String(customer._id);
    const current = summary.get(key) ?? { orders: 0, total: 0, paid: false };
    const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date(String(order.createdAt ?? ""));
    const address = readAddress(order.shippingAddress ?? order.address);
    current.orders += 1;
    current.total += Number(order.total ?? 0);
    current.paid ||= ["paid", "success", "completed"].includes(String(order.paymentStatus ?? "").toLowerCase());
    if (!current.latestActivity || (createdAt.getTime() && createdAt > current.latestActivity)) current.latestActivity = createdAt;
    if (!current.city && address.city) current.city = address.city;
    if (!current.state && address.state) current.state = address.state;
    if (!current.latestOrderName && order.customerName) current.latestOrderName = String(order.customerName);
    summary.set(key, current);
  }
  const now = Date.now();
  const activityCutoffs: Record<string, number> = { today: 1, "7-days": 7, "30-days": 30 };
  const rows = customers.map((customer) => {
    const stats = summary.get(String(customer._id)) ?? { orders: 0, total: 0, paid: false };
    const savedAddress = Array.isArray(customer.addresses) ? customer.addresses.map(readAddress).find((address) => address.city || address.state) : undefined;
    const lastLogin = customer.lastLogin instanceof Date ? customer.lastLogin : customer.lastLogin ? new Date(String(customer.lastLogin)) : undefined;
    const latestActivity = lastLogin && stats.latestActivity ? (lastLogin > stats.latestActivity ? lastLogin : stats.latestActivity) : lastLogin ?? stats.latestActivity;
    const city = stats.city || String(savedAddress?.city ?? customer.city ?? "");
    const state = stats.state || String(savedAddress?.state ?? customer.state ?? "");
    const wishlistCount = Array.isArray(customer.wishlist) ? customer.wishlist.length : 0;
    return {
      ...customer,
      name: customer.name || stats.latestOrderName || "",
      orderCount: stats.orders,
      orderTotal: stats.total,
      wishlistCount,
      verified: Boolean(customer.phone),
      paidUser: stats.paid,
      city,
      state,
      lastActivity: latestActivity,
    };
  }).filter((customer) => {
    const customerActivity = customer.lastActivity ? new Date(String(customer.lastActivity)).getTime() : 0;
    const activityDays = activityCutoffs[activityFilter];
    const activityMatches = activityFilter === "all" || (activityFilter === "never" ? !customerActivity : Boolean(customerActivity) && now - customerActivity <= activityDays * 24 * 60 * 60 * 1000);
    return (!cityFilter || String(customer.city).toLowerCase() === cityFilter)
      && (!stateFilter || String(customer.state).toLowerCase() === stateFilter)
      && activityMatches
      && (paidFilter === "all" || (paidFilter === "paid" ? customer.paidUser : !customer.paidUser));
  }).sort((a, b) => {
    const multiplier = sortDirection === "oldest" ? 1 : -1;
    const value = (field: string, row: typeof a) => field === "orders" ? Number(row.orderCount) : field === "spend" ? Number(row.orderTotal) : field === "activity" ? new Date(String(row.lastActivity ?? 0)).getTime() : new Date(String(row.createdAt ?? 0)).getTime();
    return (value(sortField, a) - value(sortField, b)) * multiplier;
  });
  const overall = allOrders.reduce((result, order) => ({ orders: result.orders + 1, revenue: result.revenue + Number(order.total ?? 0) }), { orders: 0, revenue: 0 });
  return json(rows.map((customer) => ({ ...customer, customerStats: overall })));
}

function isUpload(value: FormDataEntryValue): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "size" in value && "type" in value;
}

function reviewMediaUrl(id: string) {
  return `/api/review-media/${id}`;
}

function serializeReview(review: ReviewRecord) {
  return {
    ...review,
    _id: review._id ? String(review._id) : undefined,
    customerId: review.customerId ? String(review.customerId) : undefined,
    media: (Array.isArray(review.media) ? review.media : []).map((media) => ({ ...media, url: media.url || reviewMediaUrl(media.id) })),
  };
}

function publicReview(review: ReviewRecord) {
  const serialized = serializeReview(review);
  const { customerId: _customerId, ...safeReview } = serialized;
  return safeReview;
}

async function uploadReviewMedia(database: Db, file: File): Promise<ReviewMedia> {
  const category = reviewMediaTypes.get(file.type);
  if (!category) throw new Error("Only JPG, PNG, WEBP, GIF, MP4, WEBM, and MOV files are supported.");
  if (file.size > reviewMediaLimits[category]) {
    throw new Error(`${category === "image" ? "Images" : "Videos"} must be smaller than ${category === "image" ? "8 MB" : "20 MB"}.`);
  }
  const bucket = new GridFSBucket(database, { bucketName: reviewMediaBucketName });
  const fileId = await new Promise<ObjectId>((resolve, reject) => {
    const stream = bucket.openUploadStream(file.name.slice(0, 180) || "review-upload", {
      metadata: { contentType: file.type, category },
    });
    stream.once("finish", () => resolve(stream.id as ObjectId));
    stream.once("error", reject);
    file.arrayBuffer().then((buffer) => stream.end(Buffer.from(buffer))).catch(reject);
  });
  return {
    id: String(fileId),
    name: file.name.slice(0, 180) || "Review media",
    type: category,
    contentType: file.type,
    size: file.size,
    url: reviewMediaUrl(String(fileId)),
  };
}

async function deleteReviewMedia(database: Db, mediaIds: string[]) {
  const bucket = new GridFSBucket(database, { bucketName: reviewMediaBucketName });
  await Promise.all(mediaIds.filter(ObjectId.isValid).map(async (id) => {
    try {
      await bucket.delete(new ObjectId(id));
    } catch {
      // The review can still be removed when a file was already deleted.
    }
  }));
}

function reviewSummaryShape() {
  return { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
}

async function collectReviewSummaries(request: Request) {
  const url = new URL(request.url);
  const requestedIds = (url.searchParams.get("productIds") ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  const match = { status: "approved", ...(requestedIds.length ? { productId: { $in: requestedIds } } : {}) };
  const rows = await (await db()).collection("reviews").aggregate([
    { $match: match },
    {
      $group: {
        _id: "$productId",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
        one: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        two: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        three: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        four: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        five: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
      },
    },
  ]).toArray();
  const summaries: Record<string, ReturnType<typeof reviewSummaryShape>> = {};
  for (const row of rows) {
    summaries[String(row._id)] = {
      average: Math.round(Number(row.average ?? 0) * 10) / 10,
      count: Number(row.count ?? 0),
      distribution: { 1: Number(row.one ?? 0), 2: Number(row.two ?? 0), 3: Number(row.three ?? 0), 4: Number(row.four ?? 0), 5: Number(row.five ?? 0) },
    };
  }
  for (const id of requestedIds) summaries[id] ??= reviewSummaryShape();
  return summaries;
}

async function reviewSummaries(request: Request) {
  return json({ summaries: await collectReviewSummaries(request) });
}

async function createReview(request: Request) {
  const database = await db();
  const customer = await customerFromRequest(request);
  if (!customer) return fail("Please log in before writing a review.", 401);
  const form = await request.formData();
  const productId = String(form.get("productId") ?? "").trim();
  const product = await database.collection("products").findOne({ id: productId, published: { $ne: false } });
  if (!product && !sarees.some((item) => item.id === productId)) return fail("Product not found.", 404);
  const rating = Number(form.get("rating"));
  const title = String(form.get("title") ?? "").trim();
  const reviewBody = String(form.get("body") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("Choose a rating from 1 to 5.");
  if (!title || title.length > 120) return fail("Add a review title of 1–120 characters.");
  if (!reviewBody || reviewBody.length > 5000) return fail("Add review details of 1–5000 characters.");
  const files = form.getAll("media").filter(isUpload).filter((file) => file.size > 0);
  if (files.length > 5) return fail("You can attach up to 5 images or videos.");
  const media: ReviewMedia[] = [];
  try {
    for (const file of files) media.push(await uploadReviewMedia(database, file));
    const now = new Date();
    const review: ReviewRecord = {
      productId,
      customerId: customer._id,
      reviewerName: String(customer.name ?? "").trim() || "Bawari customer",
      rating,
      title,
      body: reviewBody,
      status: "pending",
      media,
      createdAt: now,
      updatedAt: now,
    };
    const result = await database.collection("reviews").insertOne(review);
    return json(publicReview({ ...review, _id: result.insertedId }), { status: 201 });
  } catch (error) {
    await deleteReviewMedia(database, media.map((item) => item.id));
    return fail(error instanceof Error ? error.message : "Could not upload your review media.");
  }
}

async function productReviews(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/reviews/summaries") return await reviewSummaries(request);
  if (request.method === "POST") return await createReview(request);
  if (request.method !== "GET") return fail("Method not allowed.", 405);
  const productId = url.searchParams.get("productId")?.trim();
  if (!productId) return fail("Product ID is required.");
  const database = await db();
  const reviews = await database.collection("reviews").find({ productId, status: "approved" }).sort({ createdAt: -1 }).limit(100).toArray();
  const summaries = await collectReviewSummaries(new Request(`${url.origin}/api/reviews/summaries?productIds=${encodeURIComponent(productId)}`));
  return json({ reviews: reviews.map((review) => publicReview(review as ReviewRecord)), summary: summaries[productId] ?? reviewSummaryShape() });
}

async function reviewMedia(request: Request, id: string) {
  if (!ObjectId.isValid(id)) return fail("Review media not found.", 404);
  const bucket = new GridFSBucket(await db(), { bucketName: reviewMediaBucketName });
  const file = await bucket.find({ _id: new ObjectId(id) }).next();
  if (!file) return fail("Review media not found.", 404);
  const chunks: Buffer[] = [];
  const stream = bucket.openDownloadStream(new ObjectId(id));
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return new Response(Buffer.concat(chunks), { headers: { "cache-control": "public, max-age=31536000, immutable", "content-type": String(file.metadata?.contentType ?? file.contentType ?? "application/octet-stream") } });
}

async function adminReviews(request: Request, reviewId?: string) {
  const database = await db();
  if (reviewId && !ObjectId.isValid(reviewId)) return fail("Review not found.", 404);
  const collection = database.collection("reviews");
  if (!reviewId && request.method === "POST") {
    const input = await body(request);
    const productId = String(input.productId ?? "").trim();
    const product = await database.collection("products").findOne({ id: productId });
    if (!product && !sarees.some((item) => item.id === productId)) return fail("Choose an existing product.");
    const rating = Number(input.rating);
    const status = String(input.status ?? "pending");
    const title = String(input.title ?? "").trim();
    const reviewBody = String(input.body ?? "").trim();
    const reviewerName = String(input.reviewerName ?? "Bawari customer").trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("Rating must be between 1 and 5.");
    if (!["pending", "approved", "rejected"].includes(status)) return fail("Invalid review status.");
    if (!title || title.length > 120 || !reviewBody || reviewBody.length > 5000 || !reviewerName || reviewerName.length > 80) return fail("Review text or reviewer name is invalid.");
    const now = new Date();
    const review = { productId, reviewerName, rating, title, body: reviewBody, status, media: [], createdAt: now, updatedAt: now };
    const result = await collection.insertOne(review);
    return json(serializeReview({ ...review, _id: result.insertedId } as ReviewRecord), { status: 201 });
  }
  if (reviewId && request.method === "DELETE") {
    const review = await collection.findOne({ _id: new ObjectId(reviewId) }) as ReviewRecord | null;
    if (!review) return fail("Review not found.", 404);
    await collection.deleteOne({ _id: new ObjectId(reviewId) });
    await deleteReviewMedia(database, (review.media ?? []).map((item) => item.id));
    return json({ ok: true });
  }
  if (reviewId && (request.method === "PATCH" || request.method === "PUT")) {
    const review = await collection.findOne({ _id: new ObjectId(reviewId) }) as ReviewRecord | null;
    if (!review) return fail("Review not found.", 404);
    const input = await body(request);
    const rating = Number(input.rating ?? review.rating);
    const status = String(input.status ?? review.status);
    const title = String(input.title ?? review.title).trim();
    const reviewBody = String(input.body ?? review.body).trim();
    const reviewerName = String(input.reviewerName ?? review.reviewerName).trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("Rating must be between 1 and 5.");
    if (!["pending", "approved", "rejected"].includes(status)) return fail("Invalid review status.");
    if (!title || title.length > 120 || !reviewBody || reviewBody.length > 5000 || !reviewerName || reviewerName.length > 80) return fail("Review text or reviewer name is invalid.");
    const currentMedia = Array.isArray(review.media) ? review.media : [];
    const nextMedia = Array.isArray(input.media) ? input.media.filter((item): item is JsonRecord => Boolean(item && typeof item === "object")).map((item) => ({
      id: String(item.id ?? ""),
      name: String(item.name ?? "Review media"),
      type: item.type === "video" ? "video" as const : "image" as const,
      contentType: String(item.contentType ?? "application/octet-stream"),
      size: Number(item.size ?? 0),
      url: reviewMediaUrl(String(item.id ?? "")),
    })).filter((item) => ObjectId.isValid(item.id)) : currentMedia;
    const removedMedia = currentMedia.filter((media) => !nextMedia.some((item) => item.id === media.id)).map((media) => media.id);
    await collection.updateOne({ _id: new ObjectId(reviewId) }, { $set: { rating, status, title, body: reviewBody, reviewerName, media: nextMedia, updatedAt: new Date() } });
    await deleteReviewMedia(database, removedMedia);
    return json(serializeReview({ ...review, rating, status: status as ReviewRecord["status"], title, body: reviewBody, reviewerName, media: nextMedia, updatedAt: new Date() }));
  }
  if (request.method !== "GET") return fail("Method not allowed.", 405);
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const rating = Number(url.searchParams.get("rating") ?? 0);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const products = await database.collection("products").find({}).project({ id: 1, name: 1 }).toArray();
  const productNames = new Map(products.map((product) => [String(product.id), String(product.name ?? product.id)]));
  const rows = await collection.find({ ...(status && status !== "all" ? { status } : {}), ...(rating >= 1 && rating <= 5 ? { rating } : {}) }).sort({ createdAt: -1 }).limit(500).toArray();
  return json(rows.map((review) => ({ ...serializeReview(review as ReviewRecord), productName: productNames.get(String(review.productId)) ?? String(review.productId) })).filter((review) => !search || [review.productName, review.reviewerName, review.title, review.body].some((value) => String(value ?? "").toLowerCase().includes(search))));
}

function cleanStoreSettings(input: JsonRecord) {
  const document = cleanDocument(input);
  const shippingCharges = Number(document.shippingCharges ?? businessSettingsDefaults.shippingCharges);
  const freeShippingThreshold = Number(document.freeShippingThreshold ?? businessSettingsDefaults.freeShippingThreshold);
  if (!Number.isFinite(shippingCharges) || shippingCharges < 0) throw new Error("Shipping charge must be a valid non-negative number.");
  if (!Number.isFinite(freeShippingThreshold) || freeShippingThreshold < 0) throw new Error("Free shipping threshold must be a valid non-negative number.");
  return {
    shippingCharges,
    freeShippingThreshold,
    businessState: String(document.businessState ?? businessSettingsDefaults.businessState).trim().slice(0, 80),
    businessStateCode: String(document.businessStateCode ?? businessSettingsDefaults.businessStateCode).trim().toUpperCase().slice(0, 10),
  };
}

async function storeSettings(request: Request) {
  const database = await db();
  const collection = database.collection("settings");
  const defaults = businessSettingsDefaults;
  const actor = adminIdentity(request) ?? "admin";
  if (request.method === "GET") {
    const current = await collection.findOne({ _id: "store" });
    return json({ ...(current ?? defaults), configured: Boolean(current) });
  }
  if (request.method === "POST") {
    const current = await collection.findOne({ _id: "store" });
    if (current) return fail("Store settings already exist. Edit the existing record.");
    const now = new Date();
    const input = cleanStoreSettings(await body(request));
    await collection.insertOne({ ...defaults, ...input, _id: "store", ...auditCreateFields(actor, now) });
    return json({ ...(await collection.findOne({ _id: "store" })), configured: true }, { status: 201 });
  }
  if (request.method === "PUT") {
    const input = cleanStoreSettings(await body(request));
    await collection.updateOne({ _id: "store" }, { $set: { ...input, ...auditUpdateFields(actor) }, $setOnInsert: { ...auditCreateFields(actor) } }, { upsert: true });
    return json({ ...(await collection.findOne({ _id: "store" })), configured: true });
  }
  if (request.method === "DELETE") {
    await collection.deleteOne({ _id: "store" });
    return json({ ...defaults, configured: false });
  }
  return fail("Method not allowed.", 405);
}

async function handleAuth(request: Request, path: string) {
  const database = await db();
  if (path === "/api/auth/send-otp" && request.method === "POST") {
    const input = await body(request);
    const phone = String(input.phone ?? "").replace(/\D/g, "").slice(-10);
    if (phone.length !== 10) return fail("Enter a valid 10-digit mobile number.");
    return json({ ok: true, demoOtp: "123456" });
  }
  if (path === "/api/auth/verify" && request.method === "POST") {
    const input = await body(request);
    const phone = String(input.phone ?? "").replace(/\D/g, "").slice(-10);
    if (phone.length !== 10 || input.otp !== "123456") return fail("Invalid mobile number or demo OTP.", 401);
    let customer = await database.collection("customers").findOne({ phone });
    if (!customer) {
      const result = await database.collection("customers").insertOne({ phone, name: "", email: "", createdAt: new Date(), updatedAt: new Date(), wishlist: [], addresses: [] });
      customer = await database.collection("customers").findOne({ _id: result.insertedId });
    }
    return json({ ok: true, customer }, { headers: { "set-cookie": `bb_customer=${customerToken(String(customer?._id))}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000` } });
  }
  if (path === "/api/auth/profile" && request.method === "PUT") {
    const customer = await customerFromRequest(request);
    if (!customer) return fail("Customer login required.", 401);
    const input = await body(request);
    const name = String(input.name ?? "").trim();
    const email = String(input.email ?? "").trim();
    if (!name || !email.includes("@")) return fail("Enter your name and a valid email.");
    await database.collection("customers").updateOne({ _id: customer._id }, { $set: { name, email, updatedAt: new Date() } });
    return json(await database.collection("customers").findOne({ _id: customer._id }));
  }
  if (path === "/api/auth/wishlist" && (request.method === "GET" || request.method === "POST")) {
    const customer = await customerFromRequest(request);
    if (!customer) return fail("Customer login required.", 401);
    if (request.method === "POST") {
      const input = await body(request);
      const productId = String(input.productId ?? "");
      if (!productId) return fail("Product ID is required.");
      const wishlist = Array.isArray(customer.wishlist) ? customer.wishlist.map(String) : [];
      const nextWishlist = wishlist.includes(productId) ? wishlist.filter((id) => id !== productId) : [...wishlist, productId];
      await database.collection("customers").updateOne({ _id: customer._id }, { $set: { wishlist: nextWishlist, updatedAt: new Date() } });
      return json({ wishlist: nextWishlist });
    }
    return json({ wishlist: Array.isArray(customer.wishlist) ? customer.wishlist : [] });
  }
  if (path === "/api/auth/me" && request.method === "GET") {
    const customer = await customerFromRequest(request);
    return customer ? json({ authenticated: true, customer }) : fail("Customer login required.", 401);
  }
  if (path === "/api/auth/orders" && request.method === "GET") {
    const customer = await customerFromRequest(request);
    if (!customer) return fail("Customer login required.", 401);
    const orders = await database.collection("orders").find({
      $or: [{ customerId: customer._id }, { customerId: String(customer._id) }, { customerPhone: customer.phone }, ...(customer.email ? [{ customerEmail: customer.email }] : [])],
    }).sort({ createdAt: -1 }).limit(100).toArray();
    return json({ orders });
  }
  if (path === "/api/auth/logout" && request.method === "POST") return json({ ok: true }, { headers: { "set-cookie": "bb_customer=; HttpOnly; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax" } });
  return fail("Not found.", 404);
}

async function seedCatalog() {
  const database = await db();
  const now = new Date();
  const categoryDocuments = [
    ...categories.map((category, order) => ({
      label: category.label,
      slug: category.id,
      description: `Explore our ${category.label.toLowerCase()} collection.`,
      image: categoryEdits.find((item) => item.id === category.id)?.image ?? categoryEdits[order % categoryEdits.length]?.image,
      order,
      published: true,
    })),
    ...categoryEdits.filter((item) => !categories.some((category) => category.id === item.id)).map((item, index) => ({
      label: item.title,
      slug: item.id,
      description: `Explore our ${item.title.toLowerCase()} collection.`,
      image: item.image,
      order: categories.length + index,
      published: true,
    })),
  ];
  await Promise.all([
    database.collection("heroes").bulkWrite([
      { updateOne: { filter: { order: 0 }, update: { $set: { title: "The Festive Edit", subtitle: "Six yards, woven with a lifetime of patience.", image: maroonHeroImage, alt: "Woman in a maroon silk saree beneath a carved palace arch", order: 0, published: true, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true } },
      { updateOne: { filter: { order: 1 }, update: { $set: { title: "Made by hand", subtitle: "Stories of craft, traced back to the loom.", image: tealHeroImage, alt: "Woman in a teal silk saree on a sunlit heritage terrace", order: 1, published: true, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true } },
      { updateOne: { filter: { order: 2 }, update: { $set: { title: "The art of the drape", subtitle: "Traditional techniques, thoughtfully preserved.", image: emeraldHeroImage, alt: "Woman in an emerald handloom saree inside a textile atelier", order: 2, published: true, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true } },
    ]),
    database.collection("categories").bulkWrite(categoryDocuments.map((category) => ({ updateOne: { filter: { slug: category.slug }, update: { $set: { ...category, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true } }))),
    database.collection("products").bulkWrite(sarees.map((product) => ({ updateOne: { filter: { id: product.id }, update: { $set: { ...product, published: true, updatedAt: now }, $setOnInsert: { stock: 10, createdAt: now } }, upsert: true } }))),
  ]);
  return { heroes: 3, categories: categoryDocuments.length, products: sarees.length };
}

async function adminPurchaseSuggestions(request: Request) {
  if (request.method !== "GET") return fail("Method not allowed.", 405);
  const database = await db();
  const [products, postedInvoices] = await Promise.all([
    database.collection("products").find({}).toArray(),
    database.collection("purchase_invoices").find({ status: "posted" }).sort({ invoiceDate: -1, createdAt: -1 }).limit(500).toArray(),
  ]);
  const invoiceIds = postedInvoices.map((invoice) => String(invoice._id));
  const invoiceById = new Map(postedInvoices.map((invoice) => [String(invoice._id), invoice]));
  const lines = invoiceIds.length
    ? await database.collection("purchase_invoice_lines").find({ purchaseInvoiceId: { $in: invoiceIds } }).sort({ createdAt: -1 }).toArray()
    : [];
  const latestLines = new Map<string, Record<string, unknown>>();
  const historyLines = new Map<string, Record<string, unknown>[]>();
  for (const line of lines) {
    const key = `${String(line.productId ?? "")}::${String(line.variantId ?? "")}`;
    if (!latestLines.has(key)) latestLines.set(key, line as Record<string, unknown>);
    historyLines.set(key, [...(historyLines.get(key) ?? []), line as Record<string, unknown>]);
  }
  const vendorIds = [...new Set([
    ...postedInvoices.map((invoice) => String(invoice.vendorId ?? "")),
    ...products.map((product) => String(product.primaryVendorId ?? "")),
  ].filter((id) => ObjectId.isValid(id)))];
  const vendors = vendorIds.length ? await database.collection("vendors").find({ _id: { $in: vendorIds.map((id) => new ObjectId(id)) } }).toArray() : [];
  const vendorsById = new Map(vendors.map((vendor) => [String(vendor._id), vendor]));
  const suggestionFor = (product: Record<string, unknown>, variant?: Record<string, unknown>) => {
    const productId = String(product.id ?? product._id);
    const variantId = String(variant?.id ?? "");
    const stock = Number(variant?.stock ?? product.stock ?? 0);
    const reorderLevel = Number(variant?.reorderLevel ?? product.reorderLevel ?? 3);
    if (stock > reorderLevel) return null;
    const line = latestLines.get(`${productId}::${variantId}`);
    const invoice = line ? invoiceById.get(String(line.purchaseInvoiceId ?? "")) : undefined;
    const vendorId = String(invoice?.vendorId ?? product.primaryVendorId ?? "");
    const vendor = vendorsById.get(vendorId);
    const priceHistory = (historyLines.get(`${productId}::${variantId}`) ?? []).slice(0, 8).map((historyLine) => {
      const historyInvoice = invoiceById.get(String(historyLine.purchaseInvoiceId ?? ""));
      return {
        costPricePerUnit: Number(historyLine.costPricePerUnit ?? 0),
        quantityPurchased: Number(historyLine.quantityPurchased ?? 0),
        invoiceNumber: String(historyInvoice?.vendorInvoiceNumber ?? ""),
        invoiceDate: historyInvoice?.invoiceDate instanceof Date ? historyInvoice.invoiceDate.toISOString() : historyInvoice?.invoiceDate ?? null,
      };
    });
    return {
      key: `${String(product._id)}-${variantId || "product"}`,
      productId,
      productName: String(product.name ?? productId),
      color: String(variant?.color ?? ""),
      variantId,
      stock,
      reorderLevel,
      suggestedQuantity: Math.max(reorderLevel - stock, 1),
      image: String(variant?.image ?? product.image ?? ""),
      out: stock === 0,
      vendorId: vendorId || undefined,
      vendorCode: vendor?.vendorCode ?? undefined,
      vendorName: vendor?.businessName ?? undefined,
      vendorProductCode: String(line?.vendorProductCode ?? product.primaryVendorProductCode ?? ""),
      itemName: String(line?.itemName ?? variant?.color ?? product.name ?? productId),
      lastCostPrice: line?.costPricePerUnit === undefined ? undefined : Number(line.costPricePerUnit),
      priceHistory,
    };
  };
  return products.flatMap((product) => {
    const variants = Array.isArray(product.variants) ? product.variants as Record<string, unknown>[] : [];
    return variants.length ? variants.map((variant) => suggestionFor(product as Record<string, unknown>, variant)).filter(Boolean) : [suggestionFor(product as Record<string, unknown>)];
  }).filter(Boolean);
}

async function adminProductFinancials(request: Request) {
  if (request.method !== "GET") return fail("Method not allowed.", 405);
  const productId = new URL(request.url).searchParams.get("productId")?.trim();
  if (!productId) return fail("Product ID is required.");
  const database = await db();
  const product = await database.collection("products").findOne({ id: productId });
  if (!product) return fail("Product not found.", 404);

  const batches = await database.collection("stock_batches")
    .find({ productId, quantityRemaining: { $gt: 0 } })
    .sort({ receivedDate: 1, createdAt: 1, _id: 1 })
    .toArray();
  const invoiceIds = [...new Set(batches
    .map((batch) => String(batch.sourcePurchaseInvoiceId ?? ""))
    .filter((id) => ObjectId.isValid(id)))];
  const vendorIds = [...new Set(batches
    .map((batch) => String(batch.vendorId ?? ""))
    .filter((id) => ObjectId.isValid(id)))];
  const [invoices, vendors] = await Promise.all([
    invoiceIds.length ? database.collection("purchase_invoices").find({ _id: { $in: invoiceIds.map((id) => new ObjectId(id)) } }).toArray() : [],
    vendorIds.length ? database.collection("vendors").find({ _id: { $in: vendorIds.map((id) => new ObjectId(id)) } }).toArray() : [],
  ]);
  const invoicesById = new Map(invoices.map((invoice) => [String(invoice._id), invoice]));
  const vendorsById = new Map(vendors.map((vendor) => [String(vendor._id), vendor]));
  const productPrice = Number(product.price ?? 0);
  const variants = Array.isArray(product.variants) ? product.variants as JsonRecord[] : [];
  const variantById = new Map(variants.map((variant) => [String(variant.id ?? ""), variant]));
  const money = (value: number) => Math.round(value * 100) / 100;
  const remainingBatches = batches.map((batch) => {
    const quantityReceived = Math.max(0, Number(batch.quantityReceived ?? 0));
    const quantityRemaining = Math.max(0, Number(batch.quantityRemaining ?? 0));
    const sourceType = String(batch.sourceType ?? "unknown");
    const rawCost = Number(batch.costPricePerUnit);
    const costKnown = sourceType === "purchase" && Number.isFinite(rawCost);
    const variant = variantById.get(String(batch.variantId ?? ""));
    const invoice = invoicesById.get(String(batch.sourcePurchaseInvoiceId ?? ""));
    const vendor = vendorsById.get(String(batch.vendorId ?? ""));
    return {
      id: String(batch._id),
      variantId: batch.variantId ? String(batch.variantId) : "",
      variantColor: variant?.color ? String(variant.color) : "",
      sourceType,
      sourceLabel: String(batch.sourceLabel ?? (sourceType === "opening_balance" ? "Opening balance" : "Stock batch")),
      invoiceNumber: invoice?.vendorInvoiceNumber ? String(invoice.vendorInvoiceNumber) : "",
      vendorName: vendor?.businessName ? String(vendor.businessName) : "",
      receivedDate: batch.receivedDate instanceof Date ? batch.receivedDate.toISOString() : batch.receivedDate ?? null,
      quantityReceived,
      quantityRemaining,
      quantitySold: Math.max(0, quantityReceived - quantityRemaining),
      costPricePerUnit: costKnown ? money(rawCost) : null,
      costKnown,
      remainingCostValue: costKnown ? money(quantityRemaining * rawCost) : null,
      sellingValue: money(quantityRemaining * productPrice),
      margin: costKnown ? money(quantityRemaining * (productPrice - rawCost)) : null,
      marginPercent: costKnown && productPrice > 0 ? money((productPrice - rawCost) / productPrice * 100) : null,
    };
  });
  const purchaseBackedBatches = remainingBatches.filter((batch) => batch.sourceType === "purchase");
  const unknownCostBatches = remainingBatches.filter((batch) => !batch.costKnown);
  const purchaseBackedQuantity = purchaseBackedBatches.reduce((sum, batch) => sum + batch.quantityRemaining, 0);
  const unknownCostQuantity = unknownCostBatches.reduce((sum, batch) => sum + batch.quantityRemaining, 0);
  const remainingQuantity = remainingBatches.reduce((sum, batch) => sum + batch.quantityRemaining, 0);
  const remainingInventoryAtPurchaseCost = purchaseBackedBatches.reduce((sum, batch) => sum + Number(batch.remainingCostValue ?? 0), 0);
  const inventoryAtSellingPrice = remainingBatches.reduce((sum, batch) => sum + batch.sellingValue, 0);
  const costedBatchSellingValue = purchaseBackedBatches.reduce((sum, batch) => sum + batch.sellingValue, 0);
  const costedBatchMargin = purchaseBackedBatches.reduce((sum, batch) => sum + Number(batch.margin ?? 0), 0);
  const catalogStock = variants.length
    ? variants.reduce((sum, variant) => sum + Number(variant.stock ?? 0), 0)
    : Number(product.stock ?? 0);
  return {
    productId,
    productName: String(product.name ?? productId),
    sellingPricePerUnit: productPrice,
    catalogStock,
    trackedStock: remainingQuantity,
    untrackedStock: Math.max(0, catalogStock - remainingQuantity),
    remainingQuantity,
    purchaseBackedQuantity,
    unknownCostQuantity,
    remainingInventoryAtPurchaseCost: money(remainingInventoryAtPurchaseCost),
    inventoryAtSellingPrice: money(inventoryAtSellingPrice),
    unknownCostSellingValue: money(unknownCostQuantity * productPrice),
    costedBatchSellingValue: money(costedBatchSellingValue),
    costedBatchMargin: money(costedBatchMargin),
    costedBatchMarginPercent: costedBatchSellingValue > 0 ? money(costedBatchMargin / costedBatchSellingValue * 100) : null,
    batches: remainingBatches,
  };
}

async function adminTeam(request: Request, userId?: string) {
  const context = adminContext(request);
  if (context?.role !== "owner") return fail("Only the owner can manage staff access.", 403);
  const database = await db();
  const users = database.collection("admin_users");
  if (request.method === "GET") {
    const records = await users.find({}).sort({ createdAt: -1 }).toArray();
    return json(records.map((record) => ({
      _id: String(record._id),
      email: String(record.email),
      role: "staff",
      active: record.active !== false,
      permissions: Array.isArray(record.permissions) ? record.permissions : [],
      createdAt: record.createdAt,
    })));
  }
  if (request.method === "POST") {
    const input = await body(request);
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter a valid staff email.");
    if (password.length < 8) return fail("Staff passwords must be at least 8 characters.");
    const permissions = [...new Set((Array.isArray(input.permissions) ? input.permissions : []).map(String).filter((permission): permission is AdminPermission => adminPermissions.includes(permission as AdminPermission)))];
    if (!permissions.length) return fail("Choose at least one staff permission.");
    if (email === String(process.env.ADMIN_EMAIL).toLowerCase()) return fail("The owner email cannot be added as staff.");
    const now = new Date();
    try {
      const result = await users.insertOne({ email, passwordHash: passwordHash(password), role: "staff", permissions, active: true, createdAt: now, updatedAt: now });
      await database.collection("audit_logs").insertOne({ entityType: "admin_user", entityId: String(result.insertedId), action: "created", actor: context.email, changes: { email, permissions }, createdAt: now });
      return json({ _id: String(result.insertedId), email, role: "staff", active: true, permissions, createdAt: now }, { status: 201 });
    } catch (error) {
      return fail(error instanceof Error && error.message.includes("duplicate") ? "A staff account with this email already exists." : "Could not create staff account.");
    }
  }
  if (!userId || !ObjectId.isValid(userId)) return fail("Staff account not found.", 404);
  const current = await users.findOne({ _id: new ObjectId(userId) });
  if (!current) return fail("Staff account not found.", 404);
  if (request.method === "PATCH") {
    const input = await body(request);
    const changes: JsonRecord = { updatedAt: new Date() };
    if (input.active !== undefined) changes.active = input.active === true;
    if (Array.isArray(input.permissions)) {
      changes.permissions = [...new Set(input.permissions.map(String).filter((permission): permission is AdminPermission => adminPermissions.includes(permission as AdminPermission)))];
      if (!(changes.permissions as string[]).length) return fail("Choose at least one staff permission.");
    }
    if (input.password !== undefined) {
      const password = String(input.password);
      if (password.length < 8) return fail("Staff passwords must be at least 8 characters.");
      changes.passwordHash = passwordHash(password);
    }
    await users.updateOne({ _id: new ObjectId(userId) }, { $set: changes });
    await database.collection("audit_logs").insertOne({ entityType: "admin_user", entityId: userId, action: "updated", actor: context.email, changes: { ...changes, passwordHash: undefined }, createdAt: new Date() });
    return json({ _id: userId, email: current.email, role: "staff", active: changes.active ?? current.active !== false, permissions: changes.permissions ?? current.permissions ?? [] });
  }
  if (request.method === "DELETE") {
    await users.deleteOne({ _id: new ObjectId(userId) });
    await database.collection("audit_logs").insertOne({ entityType: "admin_user", entityId: userId, action: "deleted", actor: context.email, changes: { email: current.email }, createdAt: new Date() });
    return json({ ok: true });
  }
  return fail("Method not allowed.", 405);
}

async function handleAdmin(request: Request, path: string) {
  if (path === "/api/admin/login" && request.method === "POST") {
    const input = await body(request);
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (email === String(process.env.ADMIN_EMAIL ?? "").trim().toLowerCase() && password === process.env.ADMIN_PASSWORD) {
      return json({ ok: true, role: "owner", permissions: adminPermissions }, { headers: { "set-cookie": `bb_admin=${sessionToken(email)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` } });
    }
    const staff = await (await db()).collection("admin_users").findOne({ email, active: { $ne: false } });
    if (!staff || !passwordMatches(password, String(staff.passwordHash ?? ""))) return fail("Invalid admin email or password.", 401);
    const permissions = (Array.isArray(staff.permissions) ? staff.permissions : []).filter((permission): permission is AdminPermission => adminPermissions.includes(permission as AdminPermission));
    return json({ ok: true, role: "staff", permissions }, { headers: { "set-cookie": `bb_admin=${sessionToken(email, "staff", permissions)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` } });
  }
  if (path === "/api/admin/logout" && request.method === "POST") {
    return json({ ok: true }, { headers: { "set-cookie": "bb_admin=; HttpOnly; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax" } });
  }
  if (!isAdmin(request)) return fail("Admin authentication required.", 401);
  const requiredPermission = adminPermissionForPath(path);
  if (requiredPermission && !hasAdminPermission(request, requiredPermission)) return fail("Your staff role does not have permission for this area.", 403);
  if (path === "/api/admin/me") {
    const context = adminContext(request);
    return json({ ok: true, role: context?.role ?? "owner", permissions: context?.permissions ?? [...adminPermissions] });
  }
  const teamMatch = path.match(/^\/api\/admin\/team(?:\/([^/]+))?$/);
  if (teamMatch) return await adminTeam(request, teamMatch[1]);
  if (path === "/api/admin/purchase-suggestions") return json(await adminPurchaseSuggestions(request));
  if (path === "/api/admin/product-financials") return json(await adminProductFinancials(request));
  if (path === "/api/admin/audit-logs") {
    if (request.method !== "GET") return fail("Method not allowed.", 405);
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType")?.trim();
    const action = url.searchParams.get("action")?.trim();
    const search = url.searchParams.get("search")?.trim().toLowerCase();
    const from = url.searchParams.get("from")?.trim();
    const to = url.searchParams.get("to")?.trim();
    const createdAt: JsonRecord = {};
    if (from && !Number.isNaN(Date.parse(`${from}T00:00:00.000Z`))) createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to && !Number.isNaN(Date.parse(`${to}T00:00:00.000Z`))) {
      const end = new Date(`${to}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      createdAt.$lt = end;
    }
    const query: JsonRecord = {
      ...(entityType && entityType !== "all" ? { entityType } : {}),
      ...(action && action !== "all" ? { action } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };
    const logs = await (await db()).collection("audit_logs").find(query).sort({ createdAt: -1 }).limit(500).toArray();
    const filtered = search
      ? logs.filter((log) => `${log.entityType ?? ""} ${log.entityId ?? ""} ${log.actor ?? ""} ${log.action ?? ""} ${JSON.stringify(log.changes ?? {})}`.toLowerCase().includes(search))
      : logs;
    return json(filtered.map((log) => ({
      ...log,
      _id: String(log._id),
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
    })));
  }
  if (path === "/api/admin/summary") {
    const database = await db();
    const [products, categories, heroes, lowStock, outOfStock] = await Promise.all([
      database.collection("products").countDocuments(),
      database.collection("categories").countDocuments(),
      database.collection("heroes").countDocuments(),
       database.collection("products").countDocuments({ $or: [{ stock: { $lte: 3 } }, { "variants.stock": { $lte: 3 } }] }),
       database.collection("products").countDocuments({ $or: [{ stock: { $lte: 0 } }, { "variants.stock": { $lte: 0 } }] }),
    ]);
    return json({ products, categories, heroes, lowStock, outOfStock });
  }
  if (path === "/api/admin/analytics" && request.method === "GET") {
    const database = await db();
    const [orders, products, customers, categories, purchaseInvoices, vendors, purchaseBatches, purchaseLines, costBatches, expenses] = await Promise.all([
      database.collection("orders").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
      database.collection("products").find({}).project({ id: 1, name: 1, stock: 1, reorderLevel: 1, variants: 1, category: 1 }).toArray(),
      database.collection("customers").countDocuments(),
      database.collection("categories").find({}).project({ slug: 1, label: 1, name: 1 }).toArray(),
      database.collection("purchase_invoices").find({}).project({ vendorId: 1, totalPayable: 1, status: 1, paymentStatus: 1, invoiceDate: 1, correctionOfInvoiceId: 1 }).toArray(),
      database.collection("vendors").find({}).project({ _id: 1, vendorCode: 1, businessName: 1 }).toArray(),
      database.collection("stock_batches").find({ sourceType: "purchase", quantityRemaining: { $gt: 0 } }).project({ productId: 1, quantityRemaining: 1, costPricePerUnit: 1 }).toArray(),
      database.collection("purchase_invoice_lines").find({}).project({ purchaseInvoiceId: 1, productId: 1, itemName: 1, quantityPurchased: 1, lineAmount: 1 }).toArray(),
      database.collection("stock_batches").find({}).project({ productId: 1, variantId: 1, costPricePerUnit: 1 }).toArray(),
      database.collection("expenses").find({}).project({ date: 1, category: 1, amount: 1 }).toArray(),
    ]);
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index), 1);
      return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString("en-IN", { month: "short" }), revenue: 0, orders: 0 };
    });
    const monthMap = new Map(months.map((month) => [month.key, month]));
    const status = { pending: 0, processing: 0, delivered: 0, cancelled: 0 };
    const categoryMap = new Map<string, number>();
    for (const order of orders) {
      const currentStatus = String(order.status ?? "pending");
      if (currentStatus in status) status[currentStatus as keyof typeof status] += 1;
      const date = new Date(order.createdAt ?? Date.now());
      const month = monthMap.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (month) { month.revenue += Number(order.total ?? 0); month.orders += 1; }
    }
    for (const product of products) categoryMap.set(String(product.category ?? "other"), (categoryMap.get(String(product.category ?? "other")) ?? 0) + 1);
    const categoryLabels = new Map(categories.map((category) => [String(category.slug ?? category._id), String(category.label ?? category.name ?? category.slug)]));
    const categoryBreakdown = [...categoryMap.entries()].map(([key, count]) => ({ label: categoryLabels.get(key) ?? key, count })).sort((a, b) => b.count - a.count);
    const postedInvoices = purchaseInvoices.filter((invoice) => invoice.status === "posted");
    const correctedOriginalIds = new Set(postedInvoices.map((invoice) => String(invoice.correctionOfInvoiceId ?? "")).filter(Boolean));
    const effectivePurchaseInvoices = postedInvoices.filter((invoice) => !correctedOriginalIds.has(String(invoice._id)));
    const effectivePurchaseInvoiceIds = new Set(effectivePurchaseInvoices.map((invoice) => String(invoice._id)));
    const vendorMap = new Map(vendors.map((vendor) => [String(vendor._id), vendor]));
    const vendorSpend = new Map<string, { vendorCode: string; vendorName: string; invoiceCount: number; total: number }>();
    const procurementMonths = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index), 1);
      return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString("en-IN", { month: "short" }), spend: 0, invoices: 0 };
    });
    const procurementMonthMap = new Map(procurementMonths.map((month) => [month.key, month]));
    for (const invoice of effectivePurchaseInvoices) {
      const vendor = vendorMap.get(String(invoice.vendorId));
      const vendorKey = String(invoice.vendorId ?? "unknown");
      const current = vendorSpend.get(vendorKey) ?? { vendorCode: String(vendor?.vendorCode ?? "—"), vendorName: String(vendor?.businessName ?? "Unknown vendor"), invoiceCount: 0, total: 0 };
      current.invoiceCount += 1;
      current.total += Number(invoice.totalPayable ?? 0);
      vendorSpend.set(vendorKey, current);
      const date = new Date(invoice.invoiceDate ?? Date.now());
      const month = procurementMonthMap.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (month) { month.spend += Number(invoice.totalPayable ?? 0); month.invoices += 1; }
    }
    const productNameMap = new Map(products.map((product) => [String(product.id), String(product.name ?? product.id)]));
    const purchaseProductMap = new Map<string, { productId: string; productName: string; quantity: number; spend: number }>();
    for (const line of purchaseLines) {
      if (!effectivePurchaseInvoiceIds.has(String(line.purchaseInvoiceId))) continue;
      const productId = String(line.productId ?? "");
      const current = purchaseProductMap.get(productId) ?? { productId, productName: productNameMap.get(productId) ?? String(line.itemName ?? productId), quantity: 0, spend: 0 };
      current.quantity += Number(line.quantityPurchased ?? 0);
      current.spend += Number(line.lineAmount ?? 0);
      purchaseProductMap.set(productId, current);
    }
    const purchaseBackedUnits = purchaseBatches.reduce((sum, batch) => sum + Number(batch.quantityRemaining ?? 0), 0);
    const purchaseBackedValue = purchaseBatches.reduce((sum, batch) => sum + Number(batch.quantityRemaining ?? 0) * Number(batch.costPricePerUnit ?? 0), 0);
    const postedSpend = effectivePurchaseInvoices.reduce((sum, invoice) => sum + Number(invoice.totalPayable ?? 0), 0);
    const unpaidInvoices = effectivePurchaseInvoices.filter((invoice) => invoice.paymentStatus !== "paid");
    const reorderAlertCount = products.reduce((count, product) => count + reorderAlerts(product).length, 0);
    const procurement = {
      invoiceCount: effectivePurchaseInvoices.length,
      draftCount: purchaseInvoices.filter((invoice) => invoice.status === "draft").length,
      postedSpend,
      unpaidAmount: unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.totalPayable ?? 0), 0),
      unpaidInvoiceCount: unpaidInvoices.length,
      purchaseBackedUnits,
      purchaseBackedValue,
      reorderAlertCount,
      months: procurementMonths,
      vendors: [...vendorSpend.values()].sort((a, b) => b.total - a.total).slice(0, 6),
      products: [...purchaseProductMap.values()].sort((a, b) => b.spend - a.spend).slice(0, 6),
    };
    const costBatchMap = new Map(costBatches.map((batch) => [String(batch._id), batch.costPricePerUnit]));
    const marginMonths = months.map((month) => ({ key: month.key, label: month.label, recognizedSales: 0, costedSales: 0, cogs: 0, grossProfit: 0, grossMarginPercent: 0 }));
    const marginMonthMap = new Map(marginMonths.map((month) => [month.key, month]));
    const productMargins = new Map<string, { productId: string; productName: string; units: number; costedUnits: number; recognizedSales: number; costedSales: number; cogs: number; grossProfit: number; grossMarginPercent: number }>();
    let recognizedSales = 0;
    let costedSales = 0;
    let cogs = 0;
    let soldUnits = 0;
    let costedUnits = 0;
    for (const order of orders) {
      if (["cancelled", "rejected"].includes(String(order.status ?? ""))) continue;
      const items = Array.isArray(order.items) ? order.items as JsonRecord[] : [];
      if (!items.length) continue;
      const itemSubtotal = items.reduce((sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 0), 0);
      const subtotal = Number(order.subtotal ?? 0) || itemSubtotal;
      const discount = Math.min(subtotal, Math.max(0, Number(order.discount ?? 0)));
      const revenueFactor = subtotal > 0 ? Math.max(0, subtotal - discount) / subtotal : 0;
      const orderDate = new Date(order.createdAt ?? Date.now());
      const month = marginMonthMap.get(`${orderDate.getFullYear()}-${orderDate.getMonth()}`);
      for (const item of items) {
        const quantity = Math.max(0, Math.trunc(Number(item.quantity ?? 0)));
        if (!quantity) continue;
        const itemRevenue = Number(item.price ?? 0) * quantity * revenueFactor;
        const allocations = Array.isArray(item.stockAllocations) ? item.stockAllocations as JsonRecord[] : [];
        let itemCost = 0;
        let itemCostedUnits = 0;
        for (const allocation of allocations) {
          const allocatedQuantity = Math.max(0, Math.trunc(Number(allocation.quantity ?? 0)));
          const allocationCost = allocation.costPricePerUnit !== undefined
            ? Number(allocation.costPricePerUnit)
            : costBatchMap.get(String(allocation.batchId ?? ""));
          if (!allocatedQuantity || allocationCost === undefined || !Number.isFinite(Number(allocationCost))) continue;
          itemCost += allocatedQuantity * Number(allocationCost);
          itemCostedUnits += allocatedQuantity;
        }
        itemCostedUnits = Math.min(quantity, itemCostedUnits);
        const itemCostedSales = quantity > 0 ? itemRevenue * itemCostedUnits / quantity : 0;
        const productId = String(item.productId ?? "unknown");
        const current = productMargins.get(productId) ?? {
          productId,
          productName: String(item.name ?? productNameMap.get(productId) ?? productId),
          units: 0,
          costedUnits: 0,
          recognizedSales: 0,
          costedSales: 0,
          cogs: 0,
          grossProfit: 0,
          grossMarginPercent: 0,
        };
        current.units += quantity;
        current.costedUnits += itemCostedUnits;
        current.recognizedSales += itemRevenue;
        current.costedSales += itemCostedSales;
        current.cogs += itemCost;
        productMargins.set(productId, current);
        recognizedSales += itemRevenue;
        costedSales += itemCostedSales;
        cogs += itemCost;
        soldUnits += quantity;
        costedUnits += itemCostedUnits;
        if (month) {
          month.recognizedSales += itemRevenue;
          month.costedSales += itemCostedSales;
          month.cogs += itemCost;
        }
      }
    }
    for (const month of marginMonths) {
      month.grossProfit = month.costedSales - month.cogs;
      month.grossMarginPercent = month.costedSales > 0 ? month.grossProfit / month.costedSales * 100 : 0;
    }
    const productMarginRows = [...productMargins.values()].map((product) => {
      product.grossProfit = product.costedSales - product.cogs;
      product.grossMarginPercent = product.costedSales > 0 ? product.grossProfit / product.costedSales * 100 : 0;
      return product;
    }).sort((a, b) => b.grossProfit - a.grossProfit);
    const grossProfit = costedSales - cogs;
    const margin = {
      recognizedSales,
      costedSales,
      cogs,
      grossProfit,
      grossMarginPercent: costedSales > 0 ? grossProfit / costedSales * 100 : 0,
      soldUnits,
      costedUnits,
      uncostedUnits: Math.max(0, soldUnits - costedUnits),
      uncostedSales: Math.max(0, recognizedSales - costedSales),
      months: marginMonths,
      products: productMarginRows.slice(0, 8),
    };
    const expenseMonths = months.map((month) => ({ key: month.key, label: month.label, total: 0 }));
    const expenseMonthMap = new Map(expenseMonths.map((month) => [month.key, month]));
    const expenseCategoryMap = new Map<string, number>();
    let totalOperatingExpenses = 0;
    let sixMonthOperatingExpenses = 0;
    for (const expense of expenses) {
      const amount = Math.max(0, Number(expense.amount ?? 0));
      if (!amount) continue;
      totalOperatingExpenses += amount;
      const category = String(expense.category ?? "Other").trim() || "Other";
      expenseCategoryMap.set(category, (expenseCategoryMap.get(category) ?? 0) + amount);
      const date = new Date(expense.date ?? Date.now());
      const month = expenseMonthMap.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (month) {
        month.total += amount;
        sixMonthOperatingExpenses += amount;
      }
    }
    const operatingExpenses = {
      total: totalOperatingExpenses,
      sixMonthTotal: sixMonthOperatingExpenses,
      expenseCount: expenses.length,
      months: expenseMonths,
      categories: [...expenseCategoryMap.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total).slice(0, 8),
    };
    return json({
      kpis: { revenue: orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0), orders: orders.length, customers, pending: status.pending },
      trend: months,
      status,
      recentOrders: orders.slice(0, 6),
       alerts: products.flatMap((product) => reorderAlerts(product)).sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0)).slice(0, 6),
      categoryBreakdown,
      procurement,
      margin,
      operatingExpenses,
    });
  }
  if (path === "/api/admin/seed" && request.method === "POST") return json(await seedCatalog());
  if (path === "/api/admin/inventory") return await inventoryCrud(request);
  const inventoryMatch = path.match(/^\/api\/admin\/inventory\/([^/]+)$/);
  if (inventoryMatch) return await inventoryCrud(request, inventoryMatch[1]);
  if (path === "/api/admin/orders") return await adminOrders(request);
  const orderMatch = path.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (orderMatch) return await adminOrders(request, orderMatch[1]);
  if (path === "/api/admin/expenses") return await adminExpenses(request);
  const expenseReceiptMatch = path.match(/^\/api\/admin\/expenses\/([^/]+)\/receipt$/);
  if (expenseReceiptMatch) return await expenseReceipt(request, expenseReceiptMatch[1]);
  const expenseMatch = path.match(/^\/api\/admin\/expenses\/([^/]+)$/);
  if (expenseMatch) return await adminExpenses(request, expenseMatch[1]);
  if (path === "/api/admin/business-trips") return await adminBusinessTrips(request);
  const businessTripMatch = path.match(/^\/api\/admin\/business-trips\/([^/]+)$/);
  if (businessTripMatch) return await adminBusinessTrips(request, businessTripMatch[1]);
  if (path === "/api/admin/vendors") return await adminVendors(request);
  const vendorMatch = path.match(/^\/api\/admin\/vendors\/([^/]+)$/);
  if (vendorMatch) return await adminVendors(request, vendorMatch[1]);
  if (path === "/api/admin/purchase-invoices") return await adminPurchaseInvoices(request);
  const purchaseInvoiceDocumentMatch = path.match(/^\/api\/admin\/purchase-invoices\/([^/]+)\/document$/);
  if (purchaseInvoiceDocumentMatch) return await purchaseInvoiceDocument(request, purchaseInvoiceDocumentMatch[1]);
  const purchaseInvoiceMatch = path.match(/^\/api\/admin\/purchase-invoices\/([^/]+)$/);
  if (purchaseInvoiceMatch) return await adminPurchaseInvoices(request, purchaseInvoiceMatch[1]);
  const customerMatch = path.match(/^\/api\/admin\/customers(?:\/([^/]+))?$/);
  if (customerMatch) return await customersHistory(request, customerMatch[1]);
  const reviewMatch = path.match(/^\/api\/admin\/reviews(?:\/([^/]+))?$/);
  if (reviewMatch) return await adminReviews(request, reviewMatch[1]);
  if (path === "/api/admin/settings") return await storeSettings(request);
  const reorderMatch = path.match(/^\/api\/admin\/(heroes|categories)\/reorder$/);
  if (reorderMatch && request.method === "PUT") return json(await reorder(reorderMatch[1] as "heroes" | "categories", await body(request)));
  const match = path.match(/^\/api\/admin\/(heroes|categories|products|announcements|coupons)(?:\/([^/]+))?$/);
  if (!match) return fail("Not found.", 404);
  const resource = match[1] as Resource;
  const id = match[2];
  if (request.method === "GET") return json(await list(resource));
  if (request.method === "DELETE" && id) return json({ ok: await remove(resource, id) });
  if (request.method === "POST" || request.method === "PUT") return json(await save(resource, id, await body(request)));
  return fail("Method not allowed.", 405);
}

export async function handleAdminApi(request: Request) {
  const url = new URL(request.url);
  try {
    if (url.pathname.startsWith("/api/auth/")) return await handleAuth(request, url.pathname);
    if (url.pathname === "/api/phonepe/callback" && request.method === "POST") return await handlePhonePeCallback(request);
    if (url.pathname === "/api/phonepe/status" && request.method === "GET") return await phonePePaymentStatus(request);
    if (url.pathname.startsWith("/api/review-media/")) return await reviewMedia(request, url.pathname.split("/").pop() ?? "");
    if (url.pathname === "/api/reviews" || url.pathname === "/api/reviews/summaries") return await productReviews(request);
    if ((url.pathname === "/api/phonepe/checkout" || url.pathname === "/api/inventory/purchase") && request.method === "POST") return await createPhonePeCheckout(request);
    if (url.pathname.startsWith("/api/admin/")) return await handleAdmin(request, url.pathname);
    if (url.pathname === "/api/catalog" && request.method === "GET") {
      const database = await db();
      const [heroes, categories, products] = await Promise.all([
        database.collection("heroes").find({ published: { $ne: false } }).sort({ order: 1 }).toArray(),
        database.collection("categories").find({ published: { $ne: false } }).sort({ order: 1 }).toArray(),
        database.collection("products").find({ published: { $ne: false } }).sort({ createdAt: -1 }).toArray(),
      ]);
      return json({
        heroes: heroes.map((record) => normalizeCatalogRecord(record as Record<string, unknown>)),
        categories: categories.map((record) => normalizeCatalogRecord(record as Record<string, unknown>)),
        products: products.map((record) => normalizeCatalogRecord(record as Record<string, unknown>)),
      });
    }
    if (url.pathname === "/api/coupons/validate" && request.method === "POST") return await validateCoupon(request);
    if (url.pathname === "/api/store-config" && request.method === "GET") {
      const database = await db();
      const [announcements, coupons, settings] = await Promise.all([
        database.collection("announcements").find({ active: true }).sort({ order: 1 }).toArray(),
        database.collection("coupons").find({ active: true, $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: new Date() } }] }).sort({ createdAt: -1 }).toArray(),
        database.collection("settings").findOne({ _id: "store" }),
      ]);
      return json({ announcements, coupons, settings });
    }
    return null;
  } catch (error) {
    console.error("Admin API error:", error instanceof Error ? error.message : error);
    return fail("The database request could not be completed.", 500);
  }
}