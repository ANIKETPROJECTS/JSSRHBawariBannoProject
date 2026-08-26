import { createHmac, timingSafeEqual } from "node:crypto";
import { GridFSBucket, MongoClient, type Db, ObjectId } from "mongodb";
import { categories, categoryEdits, sarees } from "@/data/sarees";
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

async function list(resource: Resource) {
  const collection = (await db()).collection(resource);
  return collection.find({}).sort({ order: 1, createdAt: -1 }).toArray();
}

async function save(resource: Resource, id: string | undefined, input: JsonRecord) {
  const database = await db();
  const collection = database.collection(resource);
  const document = { ...cleanDocument(input), updatedAt: new Date() };
  if (id && ObjectId.isValid(id)) {
    const previous = await collection.findOne({ _id: new ObjectId(id) });
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: document });
    if (resource === "products" && previous && typeof previous.stock === "number" && typeof document.stock === "number" && previous.stock !== document.stock) {
      await database.collection("inventory_movements").insertOne({
        productId: id,
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

async function remove(resource: Resource, id: string) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await db()).collection(resource).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
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
  const events = [];
  const orderItems = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as JsonRecord;
    const productId = typeof row.productId === "string" ? row.productId : "";
    const quantity = Math.max(1, Math.floor(Number(row.quantity) || 0));
    if (!productId || !quantity) continue;
    const product = await database.collection("products").findOne({ id: productId });
    if (!product || Number(product.stock ?? 0) < quantity) return fail(`${String(product?.name ?? productId)} is not available in that quantity.`, 409);
    const result = await database.collection("products").findOneAndUpdate(
      { id: productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!result) return fail(`${String(product.name ?? productId)} sold out while checking out.`, 409);
    events.push({
      orderId,
      eventType: "purchase",
      productId,
      productName: product.name,
      quantity: -quantity,
      previousStock: Number(product.stock ?? 0),
      nextStock: Number(result.stock ?? 0),
      createdAt: new Date(),
    });
    orderItems.push({
      productId,
      name: product.name,
      image: product.image,
      quantity,
      price: Number(product.price ?? 0),
    });
  }
  if (events.length) await database.collection("inventory_movements").insertMany(events);
  await database.collection("orders").insertOne({
    orderId,
    customerId: customer?._id,
    customerName: customer?.name || undefined,
    customerEmail: customer?.email || undefined,
    customerPhone: customer?.phone || undefined,
    status: "pending",
    paymentStatus: "demo",
    items: orderItems,
    total: Number(input.total ?? 0),
    createdAt: new Date(),
    updatedAt: new Date(),
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

async function ordersHistory(request: Request) {
  const url = new URL(request.url);
  const query: JsonRecord = {};
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const payment = url.searchParams.get("payment");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (status && status !== "all") query.status = status;
  if (payment && payment !== "all") query.paymentStatus = payment;
  if (search) query.$or = [{ orderId: { $regex: search, $options: "i" } }, { customerName: { $regex: search, $options: "i" } }, { customerEmail: { $regex: search, $options: "i" } }];
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

async function updateOrder(request: Request, id: string) {
  if (!ObjectId.isValid(id)) return fail("Order not found.", 404);
  const input = await body(request);
  const status = String(input.status ?? "");
  const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) return fail("Invalid order status.");
  const database = await db();
  const result = await database.collection("orders").findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? json(result) : fail("Order not found.", 404);
}

async function customersHistory(request: Request, customerId?: string) {
  const database = await db();
  if (customerId) {
    if (!ObjectId.isValid(customerId)) return fail("Customer not found.", 404);
    const customer = await database.collection("customers").findOne({ _id: new ObjectId(customerId) });
    if (!customer) return fail("Customer not found.", 404);
    const orders = await database.collection("orders").find({ customerId: new ObjectId(customerId) }).sort({ createdAt: -1 }).toArray();
    return json({ customer, orders });
  }
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim();
  const query = search ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { phone: { $regex: search, $options: "i" } }] } : {};
  const customers = await database.collection("customers").find(query).sort({ createdAt: -1 }).limit(500).toArray();
  const customerIds = customers.map((customer) => customer._id);
  const orderCounts = await database.collection("orders").aggregate([
    { $match: { customerId: { $in: customerIds } } },
    { $group: { _id: "$customerId", orders: { $sum: 1 }, total: { $sum: "$total" } } },
  ]).toArray();
  const summary = new Map(orderCounts.map((item) => [String(item._id), item]));
  return json(customers.map((customer) => ({ ...customer, orderCount: Number(summary.get(String(customer._id))?.orders ?? 0), orderTotal: Number(summary.get(String(customer._id))?.total ?? 0) })));
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

async function reviewSummaries(request: Request) {
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
  return json({ summaries });
}

async function createReview(request: Request) {
  const database = await db();
  const customer = await customerFromRequest(request);
  if (!customer) return fail("Please log in before writing a review.", 401);
  const form = await request.formData();
  const productId = String(form.get("productId") ?? "").trim();
  const product = await database.collection("products").findOne({ id: productId, published: { $ne: false } });
  if (!product) return fail("Product not found.", 404);
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
  return json({ reviews: reviews.map((review) => publicReview(review as ReviewRecord)), summary: (await reviewSummaries(new Request(`${url.origin}/api/reviews/summaries?productIds=${encodeURIComponent(productId)}`))).body });
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
  if (request.method === "GET") return json((await collection.findOne({ _id: "store" })) ?? { _id: "store", shippingCharges: 250, freeShippingThreshold: 15000 });
  if (request.method === "PUT") {
    const input = cleanDocument(await body(request));
    await collection.updateOne({ _id: "store" }, { $set: { ...input, updatedAt: new Date() } }, { upsert: true });
    return json(await collection.findOne({ _id: "store" }));
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
  if (path === "/api/admin/inventory" && request.method === "GET") return await inventoryHistory(request);
  if (path === "/api/admin/orders" && request.method === "GET") return await ordersHistory(request);
  const orderMatch = path.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (orderMatch && (request.method === "PUT" || request.method === "PATCH")) return await updateOrder(request, orderMatch[1]);
  const customerMatch = path.match(/^\/api\/admin\/customers(?:\/([^/]+))?$/);
  if (customerMatch && request.method === "GET") return await customersHistory(request, customerMatch[1]);
  if (path === "/api/admin/settings") return await storeSettings(request);
  const match = path.match(/^\/api\/admin\/(heroes|categories|products)(?:\/([^/]+))?$/);
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
    if (url.pathname === "/api/store-config" && request.method === "GET") {
      const database = await db();
      const [announcements, coupons, settings] = await Promise.all([
        database.collection("announcements").find({ active: true }).sort({ order: 1 }).toArray(),
        database.collection("coupons").find({ active: true }).sort({ createdAt: -1 }).toArray(),
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