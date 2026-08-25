import { createHmac, timingSafeEqual } from "node:crypto";
import { MongoClient, type Db, ObjectId } from "mongodb";
import { categories, categoryEdits, sarees } from "@/data/sarees";
import heroImage from "@/assets/hero.jpg";
import storyImage from "@/assets/story.jpg";
import craftImage from "@/assets/craft.jpg";

type Resource = "heroes" | "categories" | "products" | "announcements" | "coupons";
type JsonRecord = Record<string, unknown>;

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
  if (path === "/api/auth/logout" && request.method === "POST") return json({ ok: true }, { headers: { "set-cookie": "bb_customer=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" } });
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
    return json({ ok: true }, { headers: { "set-cookie": "bb_admin=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" } });
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