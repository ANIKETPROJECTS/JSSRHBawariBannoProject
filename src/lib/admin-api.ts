import { createHmac, timingSafeEqual } from "node:crypto";
import { GridFSBucket, MongoClient, type Db, ObjectId } from "mongodb";
import { categories, categoryEdits, sarees } from "@/data/sarees";
import { productColors } from "@/data/colors";
import heroImage from "@/assets/hero.jpg";
import storyImage from "@/assets/story.jpg";
import craftImage from "@/assets/craft.jpg";

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
  ]);
  return database;
}

function secret(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function sessionToken(email: string) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString("base64url");
  const signature = createHmac("sha256", secret("SESSION_SECRET")).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function isAdmin(request: Request) {
  const cookie = request.headers.get("cookie")?.match(/bb_admin=([^;]+)/)?.[1];
  if (!cookie) return false;
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", secret("SESSION_SECRET")).update(payload).digest("base64url");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email?: string; exp?: number };
    return data.email === process.env.ADMIN_EMAIL && typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
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
    const color = String(row.color ?? "").trim();
    const rawImages = Array.isArray(row.images) ? row.images.map(String).map((image) => image.trim()).filter(Boolean) : [];
    const image = String(row.image ?? rawImages[0] ?? "").trim();
    const images = [image, ...rawImages.filter((item) => item !== image)].filter(Boolean).slice(0, 5);
    const stock = Number(row.stock ?? 0);
    if (!color) throw new Error(`Color variant ${index + 1} needs a color name.`);
    if (colors.has(color.toLowerCase())) throw new Error(`Each color variant must be unique. "${color}" is repeated.`);
    if (!productColors.some((option) => option.key === color)) throw new Error(`Choose a color from the approved color palette for variant ${index + 1}.`);
    if (!image) throw new Error(`Color variant "${color}" needs a cover image.`);
    if (rawImages.filter((item) => item !== image).length > 4) throw new Error(`Color variant "${color}" can have no more than four extra images.`);
    if (!Number.isInteger(stock) || stock < 0) throw new Error(`Color variant "${color}" needs a valid stock quantity.`);
    colors.add(color.toLowerCase());
    const baseId = productSlug(row.id || color) || `${productId}-variant-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (ids.has(id)) id = `${baseId}-${suffix++}`;
    ids.add(id);
    return { id, color, stock, image, images };
  });
}

async function list(resource: Resource) {
  const collection = (await db()).collection(resource);
  return collection.find({}).sort({ order: 1, createdAt: -1 }).toArray();
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
    const coverImage = String(document.image ?? "").trim();
    const extraImages = Array.isArray(document.images) ? document.images.map(String).map((image) => image.trim()).filter(Boolean) : [];
    const images = [coverImage, ...extraImages.filter((image) => image !== coverImage)].filter(Boolean).slice(0, 5);
    if (!coverImage && !variants.length) throw new Error("A cover image is required when the product has no color variants.");
    if (extraImages.length > 4) throw new Error("Add no more than four extra product images.");
    document.variants = variants;
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

async function recordPurchase(request: Request) {
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
  const events = [];
  for (const { product, productId, variantId, quantity } of selectedProducts) {
    const result = await database.collection("products").findOneAndUpdate(
      variantId
        ? { id: productId, variants: { $elemMatch: { id: variantId, stock: { $gte: quantity } } } }
        : { id: productId, stock: { $gte: quantity } },
      variantId
        ? { $inc: { "variants.$.stock": -quantity, stock: -quantity }, $set: { updatedAt: new Date() } }
        : { $inc: { stock: -quantity }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) return fail(`${String(product.name ?? productId)} sold out while checking out.`, 409);
    const updatedVariant = variantId && Array.isArray(result.variants)
      ? (result.variants as JsonRecord[]).find((entry) => String(entry.id ?? "") === variantId)
      : undefined;
    events.push({
      orderId,
      eventType: "purchase",
      productId,
      ...(variantId ? { variantId, variantColor: String(updatedVariant?.color ?? "") } : {}),
      productName: product.name,
      quantity: -quantity,
      previousStock: Number(product.stock ?? 0),
      nextStock: Number(updatedVariant?.stock ?? result.stock ?? 0),
      createdAt: new Date(),
    });
  }
  if (events.length) await database.collection("inventory_movements").insertMany(events);
  const createdAt = new Date();
  await database.collection("orders").insertOne({
    orderId,
    customerId: customer?._id,
    customerName: customer?.name || undefined,
    customerEmail: customer?.email || undefined,
    customerPhone: customer?.phone || undefined,
    status: "pending",
    statusHistory: [{ status: "pending", changedAt: createdAt }],
    paymentStatus: "demo",
    inventoryAdjusted: true,
    items: orderItems,
    subtotal,
    shipping,
    discount,
    total,
    ...(couponCode ? { couponCode } : {}),
    createdAt,
    updatedAt: createdAt,
  });
  return json({ ok: true, orderId });
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
  const orderIds = [...new Set(movements.map((movement) => movement.orderId).filter(Boolean))];
  const orders = await database.collection("orders").find({ orderId: { $in: orderIds } }).toArray();
  const customerIds = orders.map((order) => order.customerId).filter(Boolean);
  const customers = await database.collection("customers").find({ _id: { $in: customerIds } }).toArray();
  const ordersById = new Map(orders.map((order) => [String(order.orderId), order]));
  const customersById = new Map(customers.map((customer) => [String(customer._id), customer]));
  return json(movements.map((movement) => {
    const order = ordersById.get(String(movement.orderId));
    const customer = order?.customerId ? customersById.get(String(order.customerId)) : undefined;
    return {
      ...movement,
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
  if (orderId && !ObjectId.isValid(orderId)) return fail("Order not found.", 404);

  if (orderId && request.method === "DELETE") {
    const existingOrder = await collection.findOne({ _id: new ObjectId(orderId) });
    if (!existingOrder) return fail("Order not found.", 404);
    if (existingOrder.inventoryAdjusted === true && Array.isArray(existingOrder.items)) {
      for (const item of existingOrder.items) {
        const productId = String(item?.productId ?? "");
        const quantity = Math.max(0, Math.trunc(Number(item?.quantity) || 0));
        if (!productId || !quantity) continue;
        const product = await database.collection("products").findOneAndUpdate(
          { id: productId },
          { $inc: { stock: quantity }, $set: { updatedAt: new Date() } },
          { returnDocument: "after" },
        );
        if (product) {
          await database.collection("inventory_movements").insertOne({
            orderId: existingOrder.orderId,
            eventType: "order_deleted",
            productId,
            productName: product.name,
            quantity,
            previousStock: Number(product.stock ?? 0) - quantity,
            nextStock: Number(product.stock ?? 0),
            reason: "Order deleted; reserved stock restored",
            createdAt: new Date(),
          });
        }
      }
    }
    const result = await collection.deleteOne({ _id: new ObjectId(orderId) });
    if (!result.deletedCount) return fail("Order not found.", 404);
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
        name: String(row.name ?? "").trim(),
        image: String(row.image ?? "").trim(),
        quantity: Math.max(1, Math.trunc(Number(row.quantity) || 1)),
        price: Math.max(0, Number(row.price) || 0),
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
  return result ? json(result) : fail("Order not found.", 404);
}

async function customersHistory(request: Request, customerId?: string) {
  const database = await db();
  const collection = database.collection("customers");
  if (customerId && !ObjectId.isValid(customerId)) return fail("Customer not found.", 404);
  if (customerId && request.method === "DELETE") {
    const result = await collection.deleteOne({ _id: new ObjectId(customerId) });
    if (!result.deletedCount) return fail("Customer not found.", 404);
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
      return updated ? json(updated) : fail("Customer not found.", 404);
    }
    const created = { name, email, phone, wishlist: [], addresses: [], createdAt: new Date(), updatedAt: new Date() };
    const result = await collection.insertOne(created);
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

async function storeSettings(request: Request) {
  const database = await db();
  const collection = database.collection("settings");
  const defaults = { _id: "store", shippingCharges: 250, freeShippingThreshold: 15000 };
  if (request.method === "GET") {
    const current = await collection.findOne({ _id: "store" });
    return json({ ...(current ?? defaults), configured: Boolean(current) });
  }
  if (request.method === "POST") {
    const current = await collection.findOne({ _id: "store" });
    if (current) return fail("Store settings already exist. Edit the existing record.");
    const input = cleanDocument(await body(request));
    await collection.insertOne({ ...defaults, ...input, _id: "store", updatedAt: new Date() });
    return json({ ...(await collection.findOne({ _id: "store" })), configured: true }, { status: 201 });
  }
  if (request.method === "PUT") {
    const input = cleanDocument(await body(request));
    await collection.updateOne({ _id: "store" }, { $set: { ...input, updatedAt: new Date() } }, { upsert: true });
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
      { updateOne: { filter: { order: 0 }, update: { $set: { title: "The Festive Edit", subtitle: "Six yards, woven with a lifetime of patience.", image: heroImage, alt: "Woman in a maroon Kanjivaram silk saree in a heritage courtyard", order: 0, published: true, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true } },
      { updateOne: { filter: { order: 1 }, update: { $set: { title: "Made by hand", subtitle: "Stories of craft, traced back to the loom.", image: storyImage, alt: "Handwoven saree craftsmanship and textile details", order: 1, published: true, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true } },
      { updateOne: { filter: { order: 2 }, update: { $set: { title: "The art of the drape", subtitle: "Traditional techniques, thoughtfully preserved.", image: craftImage, alt: "Artisan hands working with traditional saree weaving techniques", order: 2, published: true, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true } },
    ]),
    database.collection("categories").bulkWrite(categoryDocuments.map((category) => ({ updateOne: { filter: { slug: category.slug }, update: { $set: { ...category, updatedAt: now }, $setOnInsert: { createdAt: now } }, upsert: true } }))),
    database.collection("products").bulkWrite(sarees.map((product) => ({ updateOne: { filter: { id: product.id }, update: { $set: { ...product, published: true, updatedAt: now }, $setOnInsert: { stock: 10, createdAt: now } }, upsert: true } }))),
  ]);
  return { heroes: 3, categories: categoryDocuments.length, products: sarees.length };
}

async function handleAdmin(request: Request, path: string) {
  if (path === "/api/admin/login" && request.method === "POST") {
    const input = await body(request);
    if (input.email !== process.env.ADMIN_EMAIL || input.password !== process.env.ADMIN_PASSWORD) return fail("Invalid admin email or password.", 401);
    return json({ ok: true }, { headers: { "set-cookie": `bb_admin=${sessionToken(String(input.email))}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800` } });
  }
  if (path === "/api/admin/logout" && request.method === "POST") {
    return json({ ok: true }, { headers: { "set-cookie": "bb_admin=; HttpOnly; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax" } });
  }
  if (!isAdmin(request)) return fail("Admin authentication required.", 401);
  if (path === "/api/admin/me") return json({ ok: true });
  if (path === "/api/admin/summary") {
    const database = await db();
    const [products, categories, heroes, lowStock, outOfStock] = await Promise.all([
      database.collection("products").countDocuments(),
      database.collection("categories").countDocuments(),
      database.collection("heroes").countDocuments(),
      database.collection("products").countDocuments({ stock: { $gt: 0, $lte: 5 } }),
      database.collection("products").countDocuments({ stock: { $lte: 0 } }),
    ]);
    return json({ products, categories, heroes, lowStock, outOfStock });
  }
  if (path === "/api/admin/analytics" && request.method === "GET") {
    const database = await db();
    const [orders, products, customers, categories] = await Promise.all([
      database.collection("orders").find({}).sort({ createdAt: -1 }).limit(500).toArray(),
      database.collection("products").find({}).project({ id: 1, name: 1, stock: 1, category: 1 }).toArray(),
      database.collection("customers").countDocuments(),
      database.collection("categories").find({}).project({ slug: 1, label: 1, name: 1 }).toArray(),
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
    return json({
      kpis: { revenue: orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0), orders: orders.length, customers, pending: status.pending },
      trend: months,
      status,
      recentOrders: orders.slice(0, 6),
      alerts: products.filter((product) => Number(product.stock ?? 0) <= 5).sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0)).slice(0, 6),
      categoryBreakdown,
    });
  }
  if (path === "/api/admin/seed" && request.method === "POST") return json(await seedCatalog());
  if (path === "/api/admin/inventory") return await inventoryCrud(request);
  const inventoryMatch = path.match(/^\/api\/admin\/inventory\/([^/]+)$/);
  if (inventoryMatch) return await inventoryCrud(request, inventoryMatch[1]);
  if (path === "/api/admin/orders") return await adminOrders(request);
  const orderMatch = path.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (orderMatch) return await adminOrders(request, orderMatch[1]);
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
    if (url.pathname.startsWith("/api/review-media/")) return await reviewMedia(request, url.pathname.split("/").pop() ?? "");
    if (url.pathname === "/api/reviews" || url.pathname === "/api/reviews/summaries") return await productReviews(request);
    if (url.pathname === "/api/inventory/purchase" && request.method === "POST") return await recordPurchase(request);
    if (url.pathname.startsWith("/api/admin/")) return await handleAdmin(request, url.pathname);
    if (url.pathname === "/api/catalog" && request.method === "GET") {
      const database = await db();
      const [heroes, categories, products] = await Promise.all([
        database.collection("heroes").find({ published: { $ne: false } }).sort({ order: 1 }).toArray(),
        database.collection("categories").find({ published: { $ne: false } }).sort({ order: 1 }).toArray(),
        database.collection("products").find({ published: { $ne: false } }).sort({ createdAt: -1 }).toArray(),
      ]);
      return json({ heroes, categories, products });
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