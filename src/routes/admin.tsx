import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Boxes, CheckCircle2, ChevronRight, Copy, CreditCard, Eye, GripVertical, Heart, Image, LayoutDashboard, LogOut, Mail, MapPin, Megaphone, Menu, Package, Phone, Plus, Save, Search, Settings, ShoppingCart, SlidersHorizontal, Star, Tags, Trash2, UserCheck, Users, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { getProductColor, productColors } from "@/data/colors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Panel | Bawari Banno" }] }),
  component: AdminPage,
});

type Tab = "dashboard" | "products" | "inventory" | "orders" | "customers" | "reviews" | "categories" | "heroes" | "announcements" | "coupons" | "settings";
type RecordItem = Record<string, unknown> & { _id?: string };
type ProductVariantForm = { id?: string; color: string; stock: number | string; image: string; extraImages: string };

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products & stock", icon: Package },
  { id: "inventory", label: "Inventory history", icon: BarChart3 },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "customers", label: "Customers", icon: Users },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "categories", label: "Categories", icon: Tags },
  { id: "heroes", label: "Hero slides", icon: Image },
  { id: "announcements", label: "Announcement bar", icon: Megaphone },
  { id: "coupons", label: "Coupons", icon: Tags },
  { id: "settings", label: "Settings", icon: Settings },
];

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? "Something went wrong.");
  return result;
}

function AdminPage() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    api("/api/admin/me", { signal: controller.signal })
      .then(() => { if (active) setAuthenticated(true); })
      .catch(() => { if (active) setAuthenticated(false); })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  async function signOut() {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } finally {
      setAuthenticated(false);
      navigate({ to: "/admin" });
    }
  }

  if (authenticated === null) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading admin panel…</div>;
  if (!authenticated) return <Login onSuccess={() => setAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#2d2520]">
      <aside className={`fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-[#ded5c9] bg-white py-7 transition-all lg:flex ${sidebarOpen ? "w-64 px-5" : "pointer-events-none w-0 -translate-x-full px-0 opacity-0"}`}>
        <div className="flex items-center justify-between"><Link to="/" className="font-display text-3xl text-primary">Bawari Banno</Link><button type="button" onClick={() => setSidebarOpen(false)} className="text-muted-foreground transition-colors hover:text-primary" aria-label="Close side panel" title="Close side panel"><X className="size-4" /></button></div>
        <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Admin studio</p>
        <nav className="mt-12 min-h-0 flex-1 space-y-1 overflow-y-auto pb-5 pr-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors ${tab === id ? "bg-primary text-white" : "text-muted-foreground hover:bg-[#f4efe8]"}`}>
              <Icon className="size-4 shrink-0" /> {label}
            </button>
          ))}
        </nav>
        <div className="mt-4 shrink-0 border-t border-[#ded5c9] pt-5">
        <button type="button" onClick={() => void signOut()} className="flex items-center gap-3 px-3 text-sm text-muted-foreground hover:text-primary">
          <LogOut className="size-4 shrink-0" /> Sign out
        </button>
        </div>
      </aside>
      <main className={`transition-all ${sidebarOpen ? "lg:ml-64" : "lg:ml-0"}`}>
        <header className="flex items-center justify-between border-b border-[#ded5c9] bg-white px-5 py-5 md:px-10">
          <div className="flex items-center gap-3"><button type="button" onClick={() => setSidebarOpen((current) => !current)} className="text-muted-foreground hover:text-primary" aria-label={sidebarOpen ? "Close side panel" : "Open side panel"} title={sidebarOpen ? "Close side panel" : "Open side panel"}>{sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button><div><p className="text-[10px] uppercase tracking-[0.22em] text-gold">Bawari Banno</p><h1 className="mt-1 font-display text-3xl text-primary">{tabs.find((item) => item.id === tab)?.label}</h1></div></div>
          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">View storefront <ChevronRight className="size-3" /></Link>
        </header>
        <div className="border-b border-[#ded5c9] bg-white px-5 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">{tabs.map(({ id, label }) => <button key={id} type="button" onClick={() => setTab(id)} className={`whitespace-nowrap px-3 py-2 text-xs ${tab === id ? "bg-primary text-white" : "bg-[#f4efe8] text-muted-foreground"}`}>{label}</button>)}</div>
        </div>
        <div className="mx-auto max-w-7xl p-5 md:p-10">
          {tab === "dashboard" ? <Dashboard /> : tab === "inventory" ? <InventoryCrudPage /> : tab === "orders" ? <OrdersPage /> : tab === "customers" ? <CustomerManagementPage /> : tab === "settings" ? <SettingsCrudPage /> : tab === "announcements" ? <AnnouncementCrudPage /> : tab === "coupons" ? <CouponManager /> : tab === "reviews" ? <ReviewCrudPage /> : <ResourceManager resource={tab} />}
        </div>
      </main>
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); try { await api("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }); onSuccess(); } catch (error) { toast.error(error instanceof Error ? error.message : "Login failed."); } finally { setBusy(false); } }
  return <div className="flex min-h-screen items-center justify-center bg-[#f7f4ef] p-5"><form onSubmit={submit} className="w-full max-w-md border border-[#ded5c9] bg-white p-8 shadow-sm"><Link to="/" className="font-display text-3xl text-primary">Bawari Banno</Link><p className="mt-2 text-sm text-muted-foreground">Sign in to manage your store.</p><label className="mt-8 block text-xs uppercase tracking-[0.15em] text-muted-foreground">Admin email<input required autoComplete="username" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full border border-border px-3 py-3 text-sm outline-none focus:border-gold" /></label><label className="mt-5 block text-xs uppercase tracking-[0.15em] text-muted-foreground">Password<input required autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full border border-border px-3 py-3 text-sm outline-none focus:border-gold" /></label><button disabled={busy} className="mt-7 w-full bg-primary px-4 py-3 text-xs uppercase tracking-[0.18em] text-white disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button></form></div>;
}

function Dashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  useEffect(() => {
    const refresh = () => api("/api/admin/analytics").then(setAnalytics).catch((error) => toast.error(error.message));
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);
  const cards = analytics ? [{ label: "Revenue", value: `₹${Number(analytics.kpis.revenue).toLocaleString("en-IN")}`, icon: BarChart3 }, { label: "Orders", value: analytics.kpis.orders, icon: ShoppingCart }, { label: "Customers", value: analytics.kpis.customers, icon: Users }, { label: "Pending orders", value: analytics.kpis.pending, icon: Boxes }] : [];
  async function seed() { try { const result = await api("/api/admin/seed", { method: "POST" }); toast.success(`Imported ${result.products} products, ${result.categories} categories, and ${result.heroes} hero slides.`); const next = await api("/api/admin/analytics"); setAnalytics(next); } catch (error) { toast.error(error instanceof Error ? error.message : "Import failed."); } }
  if (!analytics) return <div className="border border-[#ded5c9] bg-white p-8 text-sm text-muted-foreground">Loading analytics…</div>;
  const maxRevenue = Math.max(...analytics.trend.map((month: any) => month.revenue), 1);
  const maxCategory = Math.max(...analytics.categoryBreakdown.map((item: any) => item.count), 1);
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="border border-[#ded5c9] bg-white p-5"><Icon className="size-5 text-gold" /><p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl text-primary">{value}</p><p className="mt-2 text-xs text-muted-foreground">All-time store data</p></div>)}</div><div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><section className="border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Performance</p><h2 className="mt-1 font-display text-2xl text-primary">Revenue trend</h2></div><span className="text-xs text-muted-foreground">Last 6 months</span></div><div className="mt-8 flex h-48 items-end gap-3 border-b border-l border-border px-3 pb-0 pt-4">{analytics.trend.map((month: any) => <div key={month.key} className="flex h-full flex-1 flex-col justify-end gap-2"><div className="group relative min-h-1 bg-primary/80 transition-all hover:bg-primary" style={{ height: `${Math.max((month.revenue / maxRevenue) * 100, month.revenue ? 8 : 2)}%` }}><span className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-[10px] text-white group-hover:block">₹{Number(month.revenue).toLocaleString("en-IN")}</span></div><span className="text-center text-[10px] text-muted-foreground">{month.label}</span></div>)}</div><div className="mt-4 flex gap-5 text-xs text-muted-foreground"><span>Orders per month: {analytics.trend.reduce((sum: number, month: any) => sum + month.orders, 0)}</span><span>Revenue: ₹{Number(analytics.kpis.revenue).toLocaleString("en-IN")}</span></div></section><section className="border border-[#ded5c9] bg-white p-6"><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Order health</p><h2 className="mt-1 font-display text-2xl text-primary">Order status</h2><div className="mt-7 space-y-4">{Object.entries(analytics.status).map(([label, value]) => <div key={label}><div className="flex justify-between text-xs"><span className="capitalize text-muted-foreground">{label}</span><strong className="font-medium text-primary">{String(value)}</strong></div><div className="mt-2 h-2 bg-[#f4efe8]"><div className="h-full bg-primary" style={{ width: `${analytics.kpis.orders ? (Number(value) / analytics.kpis.orders) * 100 : 0}%` }} /></div></div>)}</div></section></div><div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><section className="border border-[#ded5c9] bg-white p-6"><div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Latest activity</p><h2 className="mt-1 font-display text-2xl text-primary">Recent orders</h2></div><button type="button" onClick={() => void seed()} className="text-xs text-primary hover:underline">Sync catalog</button></div><div className="mt-5 divide-y divide-border border-y border-border">{analytics.recentOrders.length === 0 ? <p className="py-8 text-sm text-muted-foreground">No orders yet. Completed demo checkouts will appear here.</p> : analytics.recentOrders.map((order: any) => <div key={order._id} className="flex items-center gap-4 py-4"><ShoppingCart className="size-4 text-gold" /><div className="min-w-0 flex-1"><p className="font-medium text-primary">{order.orderId}</p><p className="mt-1 text-xs text-muted-foreground">{order.customerName || "Guest checkout"} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "—"}</p></div><span className="text-sm font-medium">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</span><span className="bg-amber-50 px-2 py-1 text-[10px] capitalize text-amber-800">{order.status}</span></div>)}</div></section><div className="space-y-6"><section className="border border-[#ded5c9] bg-white p-6"><div className="flex justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Stock watch</p><h2 className="mt-1 font-display text-2xl text-primary">Inventory alerts</h2></div><span className="text-xs text-muted-foreground">{analytics.alerts.length} flagged</span></div><div className="mt-5 space-y-3">{analytics.alerts.length === 0 ? <p className="text-sm text-muted-foreground">All products have healthy stock.</p> : analytics.alerts.slice(0, 4).map((product: any) => <div key={product._id} className="flex items-center justify-between border-b border-border pb-3 text-sm"><span className="truncate pr-3">{product.name}</span><strong className={`shrink-0 font-medium ${Number(product.stock) === 0 ? "text-red-700" : "text-amber-700"}`}>{Number(product.stock) === 0 ? "Out of stock" : `${product.stock} left`}</strong></div>)}</div></section><section className="border border-[#ded5c9] bg-white p-6"><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Catalog mix</p><h2 className="mt-1 font-display text-2xl text-primary">Products by category</h2><div className="mt-5 space-y-3">{analytics.categoryBreakdown.slice(0, 5).map((item: any) => <div key={item.label}><div className="flex justify-between text-xs"><span className="text-muted-foreground">{item.label}</span><span>{item.count}</span></div><div className="mt-1 h-1.5 bg-[#f4efe8]"><div className="h-full bg-gold" style={{ width: `${(item.count / maxCategory) * 100}%` }} /></div></div>)}</div></section></div></div></>;
}

type InventoryEvent = {
  _id?: string;
  orderId?: string;
  eventType?: string;
  productId?: string;
  variantId?: string;
  variantColor?: string;
  productName?: string;
  quantity?: number;
  previousStock?: number;
  nextStock?: number;
  createdAt?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  orderStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  orderTotal?: number;
  itemPrice?: number;
};

function inventoryStatus(stock: number | null) {
  if (stock === null || !Number.isFinite(stock)) return { label: "Unavailable", className: "border-border bg-[#f7f4ef] text-muted-foreground" };
  if (stock <= 0) return { label: "Out of Stock", className: "border-red-200 bg-red-50 text-red-700" };
  if (stock <= 3) return { label: "Low Stock", className: "border-amber-200 bg-amber-50 text-amber-800" };
  return { label: "Normal Stock", className: "border-emerald-200 bg-emerald-50 text-emerald-800" };
}

function InventoryPage() {
  const [events, setEvents] = useState<InventoryEvent[]>([]);
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [productId, setProductId] = useState("");
  const [eventType, setEventType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<InventoryEvent | null>(null);
  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ eventType });
      if (productId) params.set("productId", productId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const [history, productRows] = await Promise.all([api(`/api/admin/inventory?${params}`), api("/api/admin/products")]);
      setEvents(history);
      setProducts(productRows);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load inventory history."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [productId, eventType, from, to]);
  const productsById = new Map(products.map((product) => [String(product.id ?? product._id), product]));
  return <div>
    <div className="border border-[#ded5c9] bg-white p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-xs text-muted-foreground">Product<select value={productId} onChange={(e) => setProductId(e.target.value)} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm"><option value="">All products</option>{products.map((product) => <option key={product.id as string} value={product.id as string}>{String(product.name ?? product.id)}</option>)}</select></label>
        <label className="text-xs text-muted-foreground">Event type<select value={eventType} onChange={(e) => setEventType(e.target.value)} className="mt-1 border border-border bg-white px-3 py-2.5 text-sm"><option value="all">All events</option><option value="purchase">Purchases</option><option value="manual">Manual adjustments</option></select></label>
        <label className="text-xs text-muted-foreground">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 border border-border px-3 py-2.5 text-sm" /></label>
        <label className="text-xs text-muted-foreground">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 border border-border px-3 py-2.5 text-sm" /></label>
        <button type="button" onClick={() => { setProductId(""); setEventType("all"); setFrom(""); setTo(""); }} className="border border-border px-3 py-2.5 text-xs text-muted-foreground">Clear filters</button>
      </div>
    </div>
    <div className="mt-5 overflow-x-auto border border-[#ded5c9] bg-white">
      <table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-border bg-[#fbf9f6] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><tr><th className="px-4 py-4">Date & time</th><th className="px-4 py-4">Product</th><th className="px-4 py-4">Event</th><th className="px-4 py-4">Change</th><th className="px-4 py-4">Stock after</th><th className="px-4 py-4">Current status</th><th className="px-4 py-4">Order</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading history…</td></tr> : events.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No inventory events match these filters.</td></tr> : events.map((event) => { const currentProduct = productsById.get(String(event.productId)); const currentStock = currentProduct ? Number(currentProduct.stock ?? 0) : null; const status = inventoryStatus(currentStock); return <tr key={event._id} onClick={() => setSelectedEvent(event)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedEvent(event); }} tabIndex={0} role="button" className="cursor-pointer border-b border-border last:border-0 hover:bg-[#fbf9f6] focus:bg-[#fbf9f6]"><td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{event.createdAt ? new Date(event.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td><td className="px-4 py-4 font-medium">{event.productName ?? event.productId}</td><td className="px-4 py-4 capitalize">{event.eventType ?? "adjustment"}</td><td className={`px-4 py-4 font-medium ${Number(event.quantity) < 0 ? "text-red-700" : "text-emerald-700"}`}>{Number(event.quantity) > 0 ? "+" : ""}{event.quantity}</td><td className="px-4 py-4">{event.nextStock ?? "—"}</td><td className="px-4 py-4"><div className="flex flex-col items-start gap-1"><span className={`inline-flex border px-2.5 py-1 text-[10px] uppercase tracking-[0.06em] ${status.className}`}>{status.label}</span>{currentStock !== null && <span className="text-xs text-muted-foreground">{currentStock} available now</span>}</div></td><td className="px-4 py-4 text-xs text-muted-foreground">{event.orderId ?? "—"}</td></tr>; })}</tbody></table>
    </div>
    {selectedEvent && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5" onClick={() => setSelectedEvent(null)}><div className="w-full max-w-lg border border-border bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b border-border pb-4"><div><p className="text-[10px] uppercase tracking-[0.16em] text-gold">Inventory event</p><h2 className="mt-1 font-display text-2xl text-primary">Purchase details</h2></div><button type="button" onClick={() => setSelectedEvent(null)} className="text-2xl leading-none text-muted-foreground hover:text-primary" aria-label="Close details">×</button></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><div><p className="text-eyebrow text-muted-foreground">Buyer</p><p className="mt-1 font-medium text-primary">{selectedEvent.buyerName || "Customer details unavailable"}</p><p className="mt-1 text-sm text-muted-foreground">{selectedEvent.buyerPhone ? `+91 ${selectedEvent.buyerPhone}` : "Phone unavailable"}</p><p className="mt-1 text-sm text-muted-foreground">{selectedEvent.buyerEmail || "Email unavailable"}</p></div><div><p className="text-eyebrow text-muted-foreground">Order</p><p className="mt-1 font-medium text-primary">{selectedEvent.orderId || "Manual adjustment"}</p><p className="mt-1 text-sm capitalize text-muted-foreground">{selectedEvent.orderStatus || "—"} · {selectedEvent.paymentStatus || "—"}</p><p className="mt-1 text-sm text-muted-foreground">{selectedEvent.paymentMethod || "Payment method unavailable"}</p></div><div><p className="text-eyebrow text-muted-foreground">Product purchased</p><p className="mt-1 font-medium text-primary">{selectedEvent.productName || selectedEvent.productId}</p><p className="mt-1 text-sm text-muted-foreground">Quantity: {Math.abs(Number(selectedEvent.quantity ?? 0))}</p><p className="mt-1 text-sm text-muted-foreground">{selectedEvent.itemPrice ? `Item price: ₹${Number(selectedEvent.itemPrice).toLocaleString("en-IN")}` : "Item price unavailable"}</p></div><div><p className="text-eyebrow text-muted-foreground">Stock movement</p><p className="mt-1 text-sm text-muted-foreground">Stock before: {selectedEvent.previousStock ?? "—"}</p><p className="mt-1 text-sm text-muted-foreground">Stock after: {selectedEvent.nextStock ?? "—"}</p><p className="mt-1 text-sm text-muted-foreground">Order total: {selectedEvent.orderTotal != null ? `₹${Number(selectedEvent.orderTotal).toLocaleString("en-IN")}` : "—"}</p></div></div><p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">Click outside this panel or close it to return to inventory history.</p></div></div>}
  </div>;
}

type OrderAddress = { name?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string; phone?: string };
type Order = { _id?: string; orderId?: string; status?: string; paymentStatus?: string; paymentMethod?: string; paymentDetails?: string; transactionId?: string; total?: number; subtotal?: number; shipping?: number; discount?: number; customerName?: string; customerPhone?: string; customerEmail?: string; shippingAddress?: OrderAddress | string; address?: OrderAddress | string; items?: { productId: string; variantId?: string; variantColor?: string; name?: string; image?: string; quantity: number; price?: number }[]; createdAt?: string; statusHistory?: { status: string; changedAt?: string }[] };

const orderStatuses = ["pending", "approved", "processing", "shipped", "delivered", "cancelled", "rejected"];
const paymentStatuses = ["pending", "paid", "failed", "demo", "refunded"];

function statusBadge(status: string | undefined) {
  const value = String(status ?? "pending").toLowerCase();
  if (value === "delivered" || value === "paid" || value === "success" || value === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "cancelled" || value === "rejected" || value === "failed" || value === "refunded") return "border-red-200 bg-red-50 text-red-800";
  if (value === "processing" || value === "shipped" || value === "approved") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function titleCase(value: string | undefined) {
  return String(value ?? "pending").replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function orderAddress(order: Order) {
  const raw = order.shippingAddress ?? order.address;
  if (!raw) return [];
  if (typeof raw === "string") return raw.split(/\n|,/).map((line) => line.trim()).filter(Boolean);
  return [raw.name, raw.line1, raw.line2, [raw.city, raw.state, raw.pincode].filter(Boolean).join(", "), raw.phone].filter(Boolean).map(String);
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [editing, setEditing] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [sort, setSort] = useState("newest");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  async function load(showLoading = true) {
    const version = ++requestVersion.current;
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams({ search, status, payment, sort, from, to });
      const nextOrders = await api(`/api/admin/orders?${params}`);
      if (version === requestVersion.current) setOrders(nextOrders);
    } catch (error) {
      if (version === requestVersion.current) toast.error(error instanceof Error ? error.message : "Could not load orders.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(false), 30000);
    return () => {
      window.clearInterval(timer);
      requestVersion.current += 1;
    };
  }, [search, status, payment, sort, from, to]);
  const revenue = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const paidOrders = orders.filter((order) => ["paid", "success", "completed"].includes(String(order.paymentStatus).toLowerCase()));
  function exportPaidOrders() {
    const rows = [["Order ID", "Customer", "Phone", "Email", "Items", "Amount", "Order status", "Payment", "Payment method", "Date"], ...paidOrders.map((order) => [order.orderId ?? "", order.customerName ?? "", order.customerPhone ?? "", order.customerEmail ?? "", String(order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0), String(order.total ?? 0), order.status ?? "", order.paymentStatus ?? "", order.paymentMethod ?? "", order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : ""])];
    const safeCell = (cell: string) => /^[=+\-@]/.test(cell) ? `'${cell}` : cell.replaceAll("\t", " ").replaceAll("\n", " ");
    const sheet = rows.map((row) => row.map((cell) => safeCell(String(cell))).join("\t")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([sheet], { type: "application/vnd.ms-excel;charset=utf-8" })); link.download = "bawari-banno-paid-orders.xls"; link.click(); URL.revokeObjectURL(link.href);
  }
  function clearFilters() { setSearch(""); setStatus("all"); setPayment("all"); setSort("newest"); setFrom(""); setTo(""); }
  async function updateOrder(order: Order, changes: Record<string, unknown>, message: string) {
    if (!order._id) return;
    try {
      const updated = await api(`/api/admin/orders/${order._id}`, { method: "PATCH", body: JSON.stringify(changes) });
      setOrders((current) => current.map((item) => item._id === order._id ? updated : item));
      setSelected((current) => current?._id === order._id ? updated : current);
      toast.success(message);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update order."); }
  }
  async function removeOrder(order: Order) {
    if (!order._id || !window.confirm("Delete this order? Checkout orders will have their reserved stock restored. This cannot be undone.")) return;
    try {
      await api(`/api/admin/orders/${order._id}`, { method: "DELETE" });
      setOrders((current) => current.filter((item) => item._id !== order._id));
      setSelected(null);
      toast.success("Order deleted.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete order."); }
  }
  async function copyValue(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); toast.success(`${label} copied.`); }
    catch { toast.error(`Could not copy ${label.toLowerCase()}.`); }
  }
  if (editing) return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to orders</button><OrderEditor initial={editing} onDone={() => { setEditing(null); void load(); }} /></div>;
  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-gold">Commerce operations</p><h2 className="mt-1 font-display text-3xl text-primary">Order management</h2><p className="mt-1 text-sm text-muted-foreground">Track, review, and move every customer order through fulfillment.</p></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => setEditing({ ...emptyOrder })} className="border border-primary px-4 py-3 text-xs uppercase tracking-[0.12em] text-primary hover:bg-primary hover:text-white"><Plus className="mr-2 inline size-4" /> Add order</button><button type="button" onClick={exportPaidOrders} className="bg-emerald-600 px-4 py-3 text-xs uppercase tracking-[0.12em] text-white hover:bg-emerald-700">↓ Export paid orders (Excel)</button></div></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Total orders" value={orders.length} icon={ShoppingCart} /><MetricCard label="Pending" value={orders.filter((order) => order.status === "pending").length} icon={BarChart3} /><MetricCard label="Processing" value={orders.filter((order) => order.status === "processing").length} icon={Package} /><MetricCard label="Revenue" value={`₹${revenue.toLocaleString("en-IN")}`} icon={BarChart3} /></div>
    <div className="mt-6 border border-[#ded5c9] bg-white p-5"><div className="mb-4 flex items-center justify-between"><p className="text-[10px] uppercase tracking-[0.16em] text-gold">Filter orders</p><p className="text-xs text-muted-foreground">{loading ? "Refreshing…" : `${orders.length} matching order${orders.length === 1 ? "" : "s"}`}</p></div><div className="grid gap-3 lg:grid-cols-[minmax(220px,1.5fr)_1fr_1fr_1fr]"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order #, customer, email…" className="border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /><select value={sort} onChange={(e) => setSort(e.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="amount">Highest amount</option></select><select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm"><option value="all">All order statuses</option>{orderStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select><select value={payment} onChange={(e) => setPayment(e.target.value)} className="border border-border bg-white text-sm"><option value="all">All payment statuses</option>{paymentStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></div><div className="mt-3 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-muted-foreground">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-border px-2 py-2 text-sm text-primary" /></label><label className="flex items-center gap-2 text-xs text-muted-foreground">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-border px-2 py-2 text-sm text-primary" /></label><button type="button" onClick={clearFilters} className="border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary">Clear filters</button></div></div>
    <div className="mt-5 overflow-x-auto border border-[#ded5c9] bg-white"><table className="w-full min-w-[1020px] text-left text-sm"><thead className="border-b border-border bg-[#fbf9f6] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><tr><th className="px-4 py-4">Order #</th><th className="px-4 py-4">Customer</th><th className="px-4 py-4">Items</th><th className="px-4 py-4">Amount</th><th className="px-4 py-4">Order status</th><th className="px-4 py-4">Payment</th><th className="px-4 py-4">Date</th><th className="px-4 py-4 text-right">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Loading orders…</td></tr> : orders.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No orders match these filters.</td></tr> : orders.map((order) => <tr key={order._id} className="border-b border-border last:border-0 hover:bg-[#fbf9f6]"><td className="px-4 py-4 font-medium text-primary">{order.orderId || "—"}</td><td className="px-4 py-4"><p className="font-medium">{order.customerName || "Guest checkout"}</p><p className="mt-1 text-xs text-muted-foreground">{order.customerPhone || order.customerEmail || "Contact unavailable"}</p></td><td className="px-4 py-4">{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</td><td className="px-4 py-4 font-medium">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</td><td className="px-4 py-4"><span className={`inline-flex border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${statusBadge(order.status)}`}>{titleCase(order.status)}</span></td><td className="px-4 py-4"><span className={`inline-flex border px-2.5 py-1 text-[10px] capitalize ${statusBadge(order.paymentStatus)}`}>{titleCase(order.paymentStatus)}</span></td><td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}</td><td className="px-4 py-4 text-right"><button type="button" onClick={() => setSelected(order)} className="inline-flex items-center gap-1.5 border border-primary px-3 py-1.5 text-xs text-primary hover:bg-primary hover:text-white"><Eye className="size-3.5" /> View</button></td></tr>)}</tbody></table></div>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => setSelected(null)}><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-border bg-white shadow-xl" onClick={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-white p-6 pb-5"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Order details</p><h2 className="mt-1 font-display text-2xl text-primary">#{selected.orderId || "Order"}</h2><div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className={`border px-2 py-1 ${statusBadge(selected.status)}`}>{titleCase(selected.status)}</span><span className={`border px-2 py-1 ${statusBadge(selected.paymentStatus)}`}>{titleCase(selected.paymentStatus)}</span><span>{selected.createdAt ? new Date(selected.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Date unavailable"}</span></div></div><button type="button" onClick={() => setSelected(null)} className="text-2xl leading-none text-muted-foreground hover:text-primary" aria-label="Close order details">×</button></div><div className="space-y-6 p-6"><div className="grid gap-4 sm:grid-cols-2"><div className="bg-[#f6f3ef] p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"><Users className="size-3.5" /> Customer</div><p className="mt-3 font-medium text-primary">{selected.customerName || "Guest checkout"}</p>{selected.customerEmail && <button type="button" onClick={() => void copyValue(selected.customerEmail ?? "", "Email")} className="mt-2 flex max-w-full items-center gap-2 text-left text-sm text-muted-foreground hover:text-primary"><Mail className="size-3.5 shrink-0" /><span className="truncate">{selected.customerEmail}</span><Copy className="size-3 shrink-0" /></button>}{selected.customerPhone && <button type="button" onClick={() => void copyValue(selected.customerPhone ?? "", "Phone")} className="mt-2 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><Phone className="size-3.5 shrink-0" />{selected.customerPhone}<Copy className="size-3 shrink-0" /></button>}</div><div className="bg-[#f6f3ef] p-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"><MapPin className="size-3.5" /> Shipping address</div>{orderAddress(selected).length ? <div className="mt-3 space-y-1 text-sm text-primary">{orderAddress(selected).map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Shipping address was not captured for this order.</p>}</div></div><div className="border-t border-border pt-5"><div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Payment details</p><CreditCard className="size-4 text-gold" /></div><div className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Status</p><p className="mt-1 font-medium text-primary">{titleCase(selected.paymentStatus)}</p></div><div><p className="text-xs text-muted-foreground">Method</p><p className="mt-1 font-medium text-primary">{selected.paymentMethod || "Not recorded"}</p></div><div><p className="text-xs text-muted-foreground">Transaction</p><p className="mt-1 break-all font-medium text-primary">{selected.transactionId || selected.paymentDetails || "Not available"}</p></div></div></div><div className="border-t border-border pt-5"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Order items ({selected.items?.length ?? 0})</p><div className="mt-3 divide-y divide-border border-y border-border">{selected.items?.length ? selected.items.map((item, index) => <div key={`${item.productId}-${index}`} className="flex items-center gap-3 py-3"><div className="size-14 shrink-0 overflow-hidden bg-[#f4efe8]">{item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-primary">{item.name || item.productId}</p><p className="mt-1 text-xs text-muted-foreground">Qty {item.quantity} · ₹{Number(item.price ?? 0).toLocaleString("en-IN")} each</p></div><p className="text-sm font-medium">₹{Number((item.price ?? 0) * item.quantity).toLocaleString("en-IN")}</p></div>) : <p className="py-5 text-sm text-muted-foreground">No item details are attached to this order.</p>}</div><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{Number(selected.subtotal ?? selected.total ?? 0).toLocaleString("en-IN")}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{Number(selected.shipping ?? 0) ? `₹${Number(selected.shipping).toLocaleString("en-IN")}` : "FREE"}</span></div>{Number(selected.discount ?? 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-₹{Number(selected.discount).toLocaleString("en-IN")}</span></div>}<div className="flex justify-between border-t border-border pt-3 text-base font-medium text-primary"><span>Total</span><span>₹{Number(selected.total ?? 0).toLocaleString("en-IN")}</span></div></div></div><div className="border-t border-border pt-5"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Order actions</p><div className="mt-3 flex flex-wrap gap-2">{selected.status === "pending" && <button type="button" onClick={() => void updateOrder(selected, { status: "approved" }, "Order approved.")} className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-xs text-white"><CheckCircle2 className="size-3.5" /> Approve order</button>}{selected.status === "approved" && <button type="button" onClick={() => void updateOrder(selected, { status: "processing" }, "Order moved to processing.")} className="bg-primary px-4 py-2.5 text-xs text-white">Start processing</button>}{selected.status === "processing" && <button type="button" onClick={() => void updateOrder(selected, { status: "shipped" }, "Order marked as shipped.")} className="bg-primary px-4 py-2.5 text-xs text-white">Mark shipped</button>}{selected.status === "shipped" && <button type="button" onClick={() => void updateOrder(selected, { status: "delivered" }, "Order marked as delivered.")} className="bg-primary px-4 py-2.5 text-xs text-white">Mark delivered</button>}{!["cancelled", "delivered"].includes(String(selected.status)) && <button type="button" onClick={() => void updateOrder(selected, { status: "cancelled" }, "Order cancelled.")} className="inline-flex items-center gap-2 border border-red-300 px-4 py-2.5 text-xs text-red-700 hover:bg-red-50"><XCircle className="size-3.5" /> Cancel order</button>}{!["paid", "success", "completed"].includes(String(selected.paymentStatus).toLowerCase()) && <button type="button" onClick={() => void updateOrder(selected, { paymentStatus: "paid" }, "Payment marked as paid.")} className="border border-emerald-300 px-4 py-2.5 text-xs text-emerald-700 hover:bg-emerald-50">Mark paid</button>}</div><div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-4"><select value={selected.status ?? "pending"} onChange={(event) => void updateOrder(selected, { status: event.target.value }, `Order marked ${titleCase(event.target.value)}.`)} className="border border-border bg-white px-3 py-2.5 text-xs capitalize text-primary"><option disabled>Change status…</option>{orderStatuses.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select><button type="button" onClick={() => { setEditing({ ...selected }); setSelected(null); }} className="border border-border px-4 py-2.5 text-xs text-primary hover:border-primary">Edit order</button><button type="button" onClick={() => void removeOrder(selected)} className="inline-flex items-center gap-2 border border-red-300 px-4 py-2.5 text-xs text-red-700 hover:bg-red-50"><Trash2 className="size-3.5" /> Delete order</button></div></div></div></div></div>}
  </div>;
}

type CustomerRecord = { _id?: string; name?: string; email?: string; phone?: string; createdAt?: string; updatedAt?: string; lastLogin?: string; lastActivity?: string; orderCount?: number; orderTotal?: number; wishlist?: string[]; wishlistCount?: number; verified?: boolean; paidUser?: boolean; city?: string; state?: string; customerStats?: { orders: number; revenue: number } };
type CustomerOrder = { orderId?: string; total?: number; status?: string; paymentStatus?: string; items?: { productId: string; quantity: number }[]; createdAt?: string };

function customerRelativeDate(value: string | undefined) {
  if (!value) return "—";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "—";
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  if (days === 0) {
    const hours = Math.max(1, Math.floor((Date.now() - timestamp) / 3600000));
    return `about ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function customerDate(value: string | undefined) {
  if (!value) return "—";
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";
}

function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selected, setSelected] = useState<{ customer: CustomerRecord; orders: CustomerOrder[] } | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try { setCustomers(await api(`/api/admin/customers?search=${encodeURIComponent(search)}`)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load customers."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [search]);
  async function openCustomer(id: string) {
    try { setSelected(await api(`/api/admin/customers/${id}`)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load customer."); }
  }
  if (selected) return <div><button type="button" onClick={() => setSelected(null)} className="mb-5 text-sm text-primary hover:underline">← Back to customers</button><div className="grid gap-5 lg:grid-cols-[280px_1fr]"><section className="border border-[#ded5c9] bg-white p-6"><div className="flex size-14 items-center justify-center rounded-full bg-primary text-xl text-white">{(selected.customer.name || "BB").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><h2 className="mt-4 font-display text-2xl text-primary">{selected.customer.name || "Unnamed customer"}</h2><p className="mt-2 text-sm text-muted-foreground">{selected.customer.email || "Email not added"}</p><p className="mt-1 text-sm text-muted-foreground">+91 {selected.customer.phone}</p><div className="mt-6 border-t border-border pt-5 text-xs text-muted-foreground">Registered<br /><strong className="font-medium text-primary">{selected.customer.createdAt ? new Date(selected.customer.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}</strong></div></section><section className="border border-[#ded5c9] bg-white p-6"><div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Purchase history</p><h2 className="mt-1 font-display text-3xl text-primary">Customer orders</h2></div><p className="text-sm text-muted-foreground">{selected.orders.length} order{selected.orders.length === 1 ? "" : "s"}</p></div>{selected.orders.length === 0 ? <p className="mt-8 border-t border-border pt-8 text-sm text-muted-foreground">No purchases yet. Orders made while this customer is signed in will appear here.</p> : <div className="mt-5 divide-y divide-border border-y border-border">{selected.orders.map((order) => <div key={order.orderId} className="flex flex-wrap items-center gap-4 py-4"><div className="min-w-32 flex-1"><p className="font-medium text-primary">{order.orderId}</p><p className="mt-1 text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}</p></div><p className="text-sm">{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} item(s)</p><p className="text-sm font-medium">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</p><span className="bg-amber-50 px-2 py-1 text-xs capitalize text-amber-800">{order.status}</span></div>)}</div>}</section></div></div>;
  return <div><div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Registered customers" value={customers.length} icon={Users} /><MetricCard label="Customers with orders" value={customers.filter((customer) => Number(customer.orderCount) > 0).length} icon={ShoppingCart} /><MetricCard label="Customer sales" value={`₹${customers.reduce((sum, customer) => sum + Number(customer.orderTotal ?? 0), 0).toLocaleString("en-IN")}`} icon={BarChart3} /></div><div className="mt-6 border border-[#ded5c9] bg-white p-5"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, or mobile…" className="w-full border border-border px-3 py-3 text-sm outline-none focus:border-gold" /></div><div className="mt-5 overflow-x-auto border border-[#ded5c9] bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-border bg-[#fbf9f6] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><tr><th className="px-4 py-4">Customer</th><th className="px-4 py-4">Mobile</th><th className="px-4 py-4">Orders</th><th className="px-4 py-4">Total spent</th><th className="px-4 py-4">Joined</th><th className="px-4 py-4"></th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading customers…</td></tr> : customers.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No registered customers yet.</td></tr> : customers.map((customer) => <tr key={customer._id} className="border-b border-border last:border-0"><td className="px-4 py-4"><p className="font-medium text-primary">{customer.name || "Unnamed customer"}</p><p className="mt-1 text-xs text-muted-foreground">{customer.email || "Email not added"}</p></td><td className="px-4 py-4 text-muted-foreground">+91 {customer.phone}</td><td className="px-4 py-4">{customer.orderCount ?? 0}</td><td className="px-4 py-4">₹{Number(customer.orderTotal ?? 0).toLocaleString("en-IN")}</td><td className="px-4 py-4 text-xs text-muted-foreground">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString("en-IN") : "—"}</td><td className="px-4 py-4"><button type="button" onClick={() => customer._id && void openCustomer(customer._id)} className="text-xs text-primary hover:underline">View details</button></td></tr>)}</tbody></table></div></div>;
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Package }) {
  return <div className="flex min-h-[104px] items-center gap-4 border border-[#ded5c9] bg-white px-4 py-4"><Icon className="size-5 shrink-0 text-gold" /><div><p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl text-primary">{value}</p></div></div>;
}

function ComingSoonPage({ tab }: { tab: "customers" | "reviews" }) {
  const details = { customers: ["Customer management", "Customer profiles and order history will appear here when customer accounts are connected."], reviews: ["Product reviews", "Moderate and publish customer reviews here once reviews are enabled on the storefront."] }[tab];
  return <div className="border border-[#ded5c9] bg-white p-8"><Settings className="size-6 text-gold" /><h2 className="mt-5 font-display text-3xl text-primary">{details[0]}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{details[1]}</p><span className="mt-6 inline-block bg-[#f4efe8] px-3 py-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Ready for the next commerce phase</span></div>;
}

type AdminReview = {
  _id?: string;
  productId: string;
  productName?: string;
  reviewerName?: string;
  rating: number;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  media?: { id: string; name: string; type: "image" | "video"; contentType: string; size: number; url: string }[];
  createdAt?: string;
  updatedAt?: string;
};

function AdminStars({ value }: { value: number }) {
  return <span className="tracking-[0.1em] text-gold" aria-label={`${value} out of 5 stars`}>{"★".repeat(Math.max(0, Math.min(5, value)))}{"☆".repeat(Math.max(0, 5 - Math.min(5, value)))}</span>;
}

function ReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [editing, setEditing] = useState<AdminReview | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [rating, setRating] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, status, rating });
      setReviews(await api(`/api/admin/reviews?${params}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [search, status, rating]);

  async function updateReview(review: AdminReview, changes: Partial<AdminReview>) {
    if (!review._id) return;
    try {
      const updated = await api(`/api/admin/reviews/${review._id}`, { method: "PATCH", body: JSON.stringify({ ...review, ...changes }) });
      setReviews((current) => current.map((item) => item._id === review._id ? updated : item));
      setEditing((current) => current?._id === review._id ? updated : current);
      toast.success("Review updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update review.");
    }
  }

  async function saveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing?._id) return;
    setBusy(true);
    try {
      const updated = await api(`/api/admin/reviews/${editing._id}`, { method: "PATCH", body: JSON.stringify(editing) });
      setReviews((current) => current.map((item) => item._id === editing._id ? updated : item));
      setEditing(null);
      toast.success("Review saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save review.");
    } finally {
      setBusy(false);
    }
  }

  async function removeReview(review: AdminReview) {
    if (!review._id || !window.confirm("Delete this review and its uploaded media? This cannot be undone.")) return;
    try {
      await api(`/api/admin/reviews/${review._id}`, { method: "DELETE" });
      setReviews((current) => current.filter((item) => item._id !== review._id));
      if (editing?._id === review._id) setEditing(null);
      toast.success("Review deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete review.");
    }
  }

  function removeMedia(mediaId: string) {
    setEditing((current) => current ? { ...current, media: (current.media ?? []).filter((media) => media.id !== mediaId) } : current);
  }

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{reviews.length} review{reviews.length === 1 ? "" : "s"}</p><h2 className="mt-1 font-display text-3xl text-primary">Product reviews</h2><p className="mt-2 text-sm text-muted-foreground">Moderate customer feedback before it appears on the storefront.</p></div><div className="flex gap-3 text-xs"><span className="border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">{reviews.filter((review) => review.status === "pending").length} pending</span><span className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">{reviews.filter((review) => review.status === "approved").length} approved</span></div></div>
    <div className="mt-6 border border-[#ded5c9] bg-white p-5"><div className="grid gap-3 md:grid-cols-[1fr_180px_150px_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, reviewer, title…" className="border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><select value={rating} onChange={(event) => setRating(event.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm"><option value="all">All ratings</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select><button type="button" onClick={() => { setSearch(""); setStatus("all"); setRating("all"); }} className="border border-border px-3 py-2.5 text-xs text-muted-foreground">Clear filters</button></div></div>
    <div className="mt-5 overflow-x-auto border border-[#ded5c9] bg-white"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b border-border bg-[#fbf9f6] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><tr><th className="px-4 py-4">Review</th><th className="px-4 py-4">Product</th><th className="px-4 py-4">Rating</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Date</th><th className="px-4 py-4">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Loading reviews…</td></tr> : reviews.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No reviews match these filters.</td></tr> : reviews.map((review) => <tr key={review._id} className="border-b border-border last:border-0"><td className="max-w-[300px] px-4 py-4"><p className="truncate font-medium text-primary">{review.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{review.reviewerName || "Bawari customer"} · {review.body}</p>{review.media?.length ? <p className="mt-1 text-[11px] text-gold">{review.media.length} media attachment{review.media.length === 1 ? "" : "s"}</p> : null}</td><td className="max-w-[220px] truncate px-4 py-4 text-muted-foreground">{review.productName || review.productId}</td><td className="px-4 py-4"><AdminStars value={review.rating} /><span className="ml-2 text-xs text-muted-foreground">{review.rating}/5</span></td><td className="px-4 py-4"><select value={review.status} onChange={(event) => void updateReview(review, { status: event.target.value as AdminReview["status"] })} className={`border px-2 py-1.5 text-xs capitalize outline-none ${review.status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : review.status === "rejected" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></td><td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}</td><td className="px-4 py-4"><div className="flex gap-3"><button type="button" onClick={() => setEditing({ ...review, media: [...(review.media ?? [])] })} className="text-xs text-primary hover:underline">Edit</button><button type="button" onClick={() => void removeReview(review)} className="text-xs text-red-700 hover:underline">Delete</button></div></td></tr>)}</tbody></table></div>
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setEditing(null)}><form onSubmit={saveReview} onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-border bg-white p-6 shadow-xl"><div className="flex items-start justify-between gap-4 border-b border-border pb-5"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Review moderation</p><h3 className="mt-1 font-display text-2xl text-primary">Edit customer review</h3><p className="mt-1 text-xs text-muted-foreground">{editing.productName || editing.productId}</p></div><button type="button" onClick={() => setEditing(null)} className="text-xl text-muted-foreground" aria-label="Close">×</button></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Reviewer display name<input required maxLength={80} value={editing.reviewerName ?? ""} onChange={(event) => setEditing({ ...editing, reviewerName: event.target.value })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground">Rating<select value={editing.rating} onChange={(event) => setEditing({ ...editing, rating: Number(event.target.value) })} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold">{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label className="text-xs text-muted-foreground sm:col-span-2">Review title<input required maxLength={120} value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Review details<textarea required maxLength={5000} rows={6} value={editing.body} onChange={(event) => setEditing({ ...editing, body: event.target.value })} className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground">Moderation status<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as AdminReview["status"] })} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label></div>{editing.media?.length ? <div className="mt-6 border-t border-border pt-5"><p className="text-xs font-medium text-primary">Attached media</p><div className="mt-3 flex flex-wrap gap-3">{editing.media.map((media) => <div key={media.id} className="relative size-24 overflow-hidden border border-border bg-[#f4efe8]">{media.type === "video" ? <video src={media.url} controls className="h-full w-full object-cover" /> : <img src={media.url} alt={media.name} className="h-full w-full object-cover" />}<button type="button" onClick={() => removeMedia(media.id)} className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-white/90 text-red-700" aria-label={`Remove ${media.name}`}><Trash2 className="size-3" /></button></div>)}</div><p className="mt-2 text-[11px] text-muted-foreground">Removing an attachment deletes it from stored review media.</p></div> : <p className="mt-6 border-t border-border pt-5 text-xs text-muted-foreground">No media attached to this review.</p>}<div className="mt-6 flex justify-end gap-3 border-t border-border pt-5"><button type="button" onClick={() => setEditing(null)} className="border border-border px-4 py-3 text-xs text-muted-foreground">Cancel</button><button disabled={busy} className="bg-primary px-5 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving…" : "Save review"}</button></div></form></div>}
  </div>;
}

function AnnouncementsPage() {
  const [items, setItems] = useState<RecordItem[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    try { setItems(await api("/api/admin/announcements")); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load announcements."); }
  }
  useEffect(() => { void load(); }, []);
  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try { await api("/api/admin/announcements", { method: "POST", body: JSON.stringify({ message: message.trim(), order: items.length, active: true }) }); setMessage(""); await load(); toast.success("Announcement added."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not add announcement."); }
    finally { setBusy(false); }
  }
  async function toggle(item: RecordItem) {
    try { const { _id, ...payload } = item; await api(`/api/admin/announcements/${_id}`, { method: "PUT", body: JSON.stringify({ ...payload, active: item.active !== true }) }); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update announcement."); }
  }
  async function remove(item: RecordItem) {
    if (!item._id) return;
    try { await api(`/api/admin/announcements/${item._id}`, { method: "DELETE" }); await load(); toast.success("Announcement removed."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove announcement."); }
  }
  const preview = items.find((item) => item.active === true)?.message ?? "Welcome to Bawari Banno · Handpicked sarees for every beautiful occasion";
  return <div className="max-w-5xl">
    <div className="flex items-start gap-3"><div className="flex size-10 items-center justify-center bg-secondary text-primary"><Megaphone className="size-5" /></div><div><p className="text-[10px] uppercase tracking-[0.2em] text-gold">Storefront messaging</p><h2 className="mt-1 font-display text-3xl text-primary">Announcement Bar</h2><p className="mt-1 text-sm text-muted-foreground">Manage the scrolling text that appears at the top of your website.</p></div></div>
    <section className="mt-7 border border-[#ded5c9] bg-white p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Live preview</p><div className="mt-3 overflow-hidden bg-primary px-4 py-3 text-center text-xs tracking-wide text-white"><div className="whitespace-nowrap">{preview} &nbsp; · &nbsp; {preview}</div></div></section>
    <form onSubmit={add} className="mt-5 border border-[#ded5c9] bg-white p-5"><h3 className="font-medium text-primary">Add new announcement</h3><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Free shipping on orders above ₹999" className="min-w-0 flex-1 border border-border px-3 py-3 text-sm outline-none focus:border-gold" /><button disabled={busy} className="inline-flex items-center justify-center gap-2 bg-primary px-5 py-3 text-xs uppercase tracking-[0.12em] text-white disabled:opacity-50"><Plus className="size-4" /> Add</button></div></form>
    <section className="mt-5 border border-[#ded5c9] bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-medium text-primary">All announcements <span className="text-xs font-normal text-muted-foreground">({items.length})</span></h3><span className="text-xs text-muted-foreground">Drag order can be added later</span></div><div className="mt-4 divide-y divide-border border-y border-border">{items.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No announcements yet.</p> : items.map((item) => <div key={item._id} className="flex items-center gap-3 py-4"><span className="cursor-grab text-muted-foreground">⠿</span><p className={`min-w-0 flex-1 text-sm ${item.active === false ? "text-muted-foreground line-through" : "text-foreground"}`}>{String(item.message ?? "")}</p><button type="button" onClick={() => void toggle(item)} className="flex items-center gap-2 text-xs text-muted-foreground">{item.active === false ? "Inactive" : "Active"}<span className={`relative h-5 w-9 rounded-full ${item.active === false ? "bg-border" : "bg-primary"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${item.active === false ? "left-0.5" : "left-[18px]"}`} /></span></button><button type="button" onClick={() => void remove(item)} className="p-2 text-muted-foreground hover:text-red-700" aria-label="Delete announcement"><Trash2 className="size-4" /></button></div>)}</div></section>
  </div>;
}

function SettingsPage() {
  const [form, setForm] = useState({ shippingCharges: 250, freeShippingThreshold: 15000 });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/admin/settings").then((data) => setForm({ shippingCharges: Number(data.shippingCharges ?? 250), freeShippingThreshold: Number(data.freeShippingThreshold ?? 15000) })).catch((error) => toast.error(error.message)); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try { await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(form) }); toast.success("Store settings saved."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save settings."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} className="max-w-2xl border border-[#ded5c9] bg-white p-6">
    <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Store configuration</p>
    <h2 className="mt-2 font-display text-3xl text-primary">Shipping settings</h2>
    <p className="mt-2 text-sm text-muted-foreground">Control the demo shipping values shown to customers at checkout.</p>
    <label className="mt-7 block text-xs text-muted-foreground">Shipping charge (₹)<input type="number" min="0" value={form.shippingCharges} onChange={(e) => setForm({ ...form, shippingCharges: Number(e.target.value) })} className="mt-2 w-full border border-border px-3 py-3 text-sm outline-none focus:border-gold" /></label>
    <label className="mt-5 block text-xs text-muted-foreground">Free shipping threshold (₹)<input type="number" min="0" value={form.freeShippingThreshold} onChange={(e) => setForm({ ...form, freeShippingThreshold: Number(e.target.value) })} className="mt-2 w-full border border-border px-3 py-3 text-sm outline-none focus:border-gold" /></label>
    <div className="mt-6 bg-[#fbf4f7] p-4 text-sm leading-relaxed text-muted-foreground"><strong className="font-medium text-primary">Current configuration</strong><br />Shipping: ₹{form.shippingCharges.toLocaleString("en-IN")}<br />Free shipping on orders above: ₹{form.freeShippingThreshold.toLocaleString("en-IN")}</div>
    <button disabled={busy} className="mt-6 bg-primary px-5 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving…" : "Save settings"}</button>
  </form>;
}

const emptyByResource: Record<Exclude<Tab, "dashboard" | "inventory" | "settings" | "customers" | "reviews" | "coupons">, Record<string, unknown>> = {
  heroes: { title: "", subtitle: "", image: "", href: "/", order: 0, published: true },
  categories: { label: "", slug: "", description: "", image: "", order: 0, published: true },
  products: { id: "", name: "", fabric: "", price: 0, category: "silk", subcategory: "", image: "", images: [], variants: [], blouse: "", length: "", care: "", weight: "", countryOfOrigin: "India", description: "", productDetails: "", productSpecification: "", originalPrice: 0, discountType: "percentage", discountValue: "", stock: 0, published: true, featured: false, newArrival: false, trending: false, bestseller: false },
  announcements: { message: "", order: 0, active: true },
};

function reorderItems(items: RecordItem[], draggedId: string, targetId: string) {
  const next = [...items];
  const from = next.findIndex((item) => item._id === draggedId);
  const to = next.findIndex((item) => item._id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const [dragged] = next.splice(from, 1);
  next.splice(to, 0, dragged);
  return next;
}

function HeroSlidesManager() {
  const [items, setItems] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  async function refresh() {
    setLoading(true);
    try { setItems(await api("/api/admin/heroes")); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load hero slides."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function remove(item: RecordItem) {
    if (!item._id || !window.confirm(`Delete ${String(item.title ?? "this hero slide")}? This cannot be undone.`)) return;
    try { await api(`/api/admin/heroes/${item._id}`, { method: "DELETE" }); await refresh(); toast.success("Hero slide deleted."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete hero slide."); }
  }
  async function drop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const ordered = reorderItems(items, draggedId, targetId);
    setDraggedId(null);
    setDragOverId(null);
    setItems(ordered);
    setSavingOrder(true);
    try {
      await api("/api/admin/heroes/reorder", { method: "PUT", body: JSON.stringify({ ids: ordered.map((item) => item._id).filter(Boolean) }) });
      toast.success("Hero slide order saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save hero slide order.");
      await refresh();
    } finally { setSavingOrder(false); }
  }
  if (editing) return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to hero slides</button><div className="max-w-xl"><Editor resource="heroes" initial={editing} onDone={() => { setEditing(null); void refresh(); }} /></div></div>;
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{items.length} slides</p><h2 className="mt-1 font-display text-3xl text-primary">Hero slides</h2><p className="mt-2 text-sm text-muted-foreground">Drag the handle to set the homepage sequence.{savingOrder && " Saving order…"}</p></div><button type="button" onClick={() => setEditing({ ...emptyByResource.heroes, order: items.length })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add new</button></div><div className="mt-7 space-y-3">{loading ? <p className="text-sm text-muted-foreground">Loading…</p> : items.length === 0 ? <div className="border border-dashed border-[#cfc3b5] bg-white p-10 text-center text-sm text-muted-foreground">No hero slides yet.</div> : items.map((item, index) => <div key={item._id} draggable onDragStart={() => setDraggedId(item._id ?? null)} onDragOver={(event) => { event.preventDefault(); setDragOverId(item._id ?? null); }} onDragLeave={() => setDragOverId(null)} onDrop={(event) => { event.preventDefault(); void drop(item._id ?? ""); }} onDragEnd={() => { setDraggedId(null); setDragOverId(null); }} className={`flex items-center gap-4 border bg-white p-4 transition-colors ${dragOverId === item._id ? "border-gold bg-gold/5" : "border-[#ded5c9]"} ${draggedId === item._id ? "opacity-50" : ""}`}><button type="button" draggable aria-label={`Drag ${String(item.title ?? "hero slide")} to reorder`} className="cursor-grab text-muted-foreground active:cursor-grabbing"><GripVertical className="size-5" /></button><span className="w-5 text-center text-xs text-muted-foreground">{index + 1}</span>{typeof item.image === "string" && item.image ? <img src={item.image} alt="" className="h-16 w-28 shrink-0 object-cover" /> : <div className="h-16 w-28 shrink-0 bg-[#f0e9df]" />}<div className="min-w-0 flex-1"><p className="truncate font-medium text-primary">{String(item.title ?? "Untitled slide")}</p><p className="mt-1 truncate text-xs text-muted-foreground">{String(item.subtitle ?? (item.published === false ? "Draft" : "Published"))}</p></div><button type="button" onClick={() => setEditing({ ...item })} className="border border-border px-3 py-2 text-xs text-primary">Edit</button><button type="button" onClick={() => void remove(item)} className="p-2 text-muted-foreground hover:text-red-700" aria-label={`Delete ${String(item.title ?? "hero slide")}`}><Trash2 className="size-4" /></button></div>)}</div></div>;
}

type CouponRecord = RecordItem & { code?: string; label?: string; discountType?: "percentage" | "fixed"; discountValue?: number; minimumSubtotal?: number; maxDiscount?: number | null; expiresAt?: string | null; productScope?: "all" | "specific"; productIds?: string[]; active?: boolean };

const emptyCoupon: CouponRecord = { code: "", label: "", discountType: "percentage", discountValue: 10, minimumSubtotal: 0, maxDiscount: null, expiresAt: null, productScope: "all", productIds: [], active: true };

function CouponProductSelector({ products, categories, selectedIds, onToggle }: { products: RecordItem[]; categories: RecordItem[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const normalizedQuery = query.trim().toLowerCase();
  const parents = categories.filter((category) => !category.parentSlug);
  const selected = new Set(selectedIds);
  const matches = (product: RecordItem) => !normalizedQuery || [product.name, product.id, product.fabric].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery));
  const toggle = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const productCheckbox = (product: RecordItem) => {
    const id = String(product.id ?? "");
    if (!id || !matches(product)) return null;
    const checked = selected.has(id);
    return <label key={id} className={`flex cursor-pointer items-center gap-3 border p-2.5 ${checked ? "border-gold bg-gold/5" : "border-transparent bg-white"}`}><input type="checkbox" checked={checked} onChange={() => onToggle(id)} /><div className="size-10 shrink-0 overflow-hidden bg-[#f0e9df]">{product.image && <img src={String(product.image)} alt="" className="h-full w-full object-cover" />}</div><span className="min-w-0 truncate text-xs text-primary">{String(product.name ?? id)}</span></label>;
  };
  return <div className="mt-4 border border-border bg-[#fbf9f6]"><div className="border-b border-border p-3"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products by name or ID" className="w-full border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold" /></div><p className="mt-2 text-xs text-muted-foreground">{selectedIds.length} product{selectedIds.length === 1 ? "" : "s"} selected · Open a category, then a subcategory to choose products</p></div><div className="max-h-[30rem] overflow-y-auto p-3">{parents.map((parent) => { const parentSlug = String(parent.slug ?? ""); const children = categories.filter((category) => String(category.parentSlug ?? "") === parentSlug); const categoryProducts = products.filter((product) => String(product.category ?? "") === parentSlug); const categorySelected = categoryProducts.filter((product) => selected.has(String(product.id ?? ""))).length; const isCategoryOpen = expandedCategories.includes(parentSlug); const groups = [...children.map((child) => ({ key: `${parentSlug}:${String(child.slug ?? "")}`, label: String(child.label ?? child.slug), products: categoryProducts.filter((product) => String(product.subcategory ?? "") === String(child.slug ?? "")) })), ...(categoryProducts.some((product) => !children.some((child) => String(child.slug ?? "") === String(product.subcategory ?? ""))) ? [{ key: `${parentSlug}:other`, label: "Other products", products: categoryProducts.filter((product) => !children.some((child) => String(child.slug ?? "") === String(product.subcategory ?? ""))) } ] : [])]; const visibleGroups = groups.filter((group) => !normalizedQuery || group.products.some(matches)); if (!normalizedQuery && !categoryProducts.length && !children.length) return null; return <section key={parentSlug} className="border border-border bg-white"><button type="button" onClick={() => toggle(parentSlug, setExpandedCategories)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-[#fbf9f6]"><span className="text-lg leading-none text-primary">{isCategoryOpen ? "⌄" : "›"}</span><span className="min-w-0 flex-1 text-sm font-medium text-primary">{String(parent.label ?? parent.name ?? parentSlug)}</span><span className="text-xs text-muted-foreground">{categorySelected}/{categoryProducts.length} selected</span></button>{isCategoryOpen && <div className="space-y-2 border-t border-border bg-[#fbf9f6] p-3">{visibleGroups.length === 0 ? <p className="px-2 py-3 text-xs text-muted-foreground">No matching products in this category.</p> : visibleGroups.map((group) => { const groupProducts = group.products.filter(matches); const groupSelected = group.products.filter((product) => selected.has(String(product.id ?? ""))).length; const isGroupOpen = expandedGroups.includes(group.key); return <div key={group.key} className="border border-border bg-white"><button type="button" onClick={() => toggle(group.key, setExpandedGroups)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#fbf9f6]"><span className="text-base leading-none text-primary">{isGroupOpen ? "⌄" : "›"}</span><span className="min-w-0 flex-1 text-xs font-medium uppercase tracking-[0.08em] text-primary">{group.label}</span><span className="text-[10px] text-muted-foreground">{groupSelected}/{group.products.length}</span></button>{isGroupOpen && <div className="grid gap-2 border-t border-border bg-[#fbf9f6] p-2 sm:grid-cols-2">{groupProducts.length ? groupProducts.map(productCheckbox) : <p className="col-span-full px-2 py-2 text-xs text-muted-foreground">No matching products.</p>}</div>}</div>; })}</div>}</section>; })}{!parents.length && <p className="p-4 text-sm text-muted-foreground">Create categories before assigning specific products.</p>}</div></div>;
}

function CouponEditor({ initial, products, categories, onDone }: { initial: CouponRecord; products: RecordItem[]; categories: RecordItem[]; onDone: () => void }) {
  const [form, setForm] = useState<CouponRecord>({ ...emptyCoupon, ...initial, productIds: Array.isArray(initial.productIds) ? initial.productIds.map(String) : [] });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof CouponRecord, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  function toggleProduct(id: string) {
    const selected = new Set(form.productIds ?? []);
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    set("productIds", [...selected]);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { _id, createdAt, updatedAt, ...payload } = form;
      await api(`/api/admin/coupons${_id ? `/${_id}` : ""}`, { method: _id ? "PUT" : "POST", body: JSON.stringify(payload) });
      toast.success("Coupon saved."); onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save coupon."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="max-w-3xl border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Promotion rule</p><h2 className="mt-1 font-display text-3xl text-primary">{form._id ? "Edit coupon" : "Create coupon"}</h2><p className="mt-2 text-sm text-muted-foreground">Create a real coupon customers can apply at checkout.</p></div><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Coupon code<input required maxLength={40} value={form.code ?? ""} onChange={(event) => set("code", event.target.value.toUpperCase())} placeholder="FESTIVE15" className="mt-1 w-full border border-border px-3 py-2.5 text-sm uppercase" /></label><label className="text-xs text-muted-foreground">Customer-facing label<input maxLength={120} value={form.label ?? ""} onChange={(event) => set("label", event.target.value)} placeholder="15% off festive sarees" className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Discount type<select value={form.discountType ?? "percentage"} onChange={(event) => { const discountType = event.target.value as "percentage" | "fixed"; setForm((current) => ({ ...current, discountType, discountValue: discountType === "percentage" ? Math.min(100, Number(current.discountValue ?? 0)) : current.discountValue })); }} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm"><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (₹)</option></select></label><label className="text-xs text-muted-foreground">Discount value<input required type="number" min="0.01" step="0.01" max={form.discountType === "percentage" ? 100 : undefined} value={Number(form.discountValue ?? 0)} onChange={(event) => { const value = Number(event.target.value); set("discountValue", form.discountType === "percentage" ? Math.min(100, Math.max(0, value)) : value); }} onBlur={() => { if (form.discountType === "percentage") set("discountValue", Math.min(100, Math.max(0, Number(form.discountValue ?? 0)))); }} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" />{form.discountType === "percentage" && <span className="mt-1 block text-[10px] text-muted-foreground">Percentage must be between 0 and 100.</span>}</label><label className="text-xs text-muted-foreground">Minimum eligible subtotal (₹)<input type="number" min="0" value={Number(form.minimumSubtotal ?? 0)} onChange={(event) => set("minimumSubtotal", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Maximum discount (optional)<input type="number" min="0" value={form.maxDiscount == null ? "" : Number(form.maxDiscount)} onChange={(event) => set("maxDiscount", event.target.value === "" ? null : Number(event.target.value))} placeholder="No cap" className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Expiry date (optional)<input type="date" value={form.expiresAt ? String(form.expiresAt).slice(0, 10) : ""} onChange={(event) => set("expiresAt", event.target.value || null)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label></div><div className="mt-6 border-t border-border pt-5"><p className="text-xs text-muted-foreground">Products this coupon applies to</p><div className="mt-3 flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="radio" checked={form.productScope !== "specific"} onChange={() => set("productScope", "all")} /> All products</label><label className="flex items-center gap-2"><input type="radio" checked={form.productScope === "specific"} onChange={() => set("productScope", "specific")} /> Specific products</label></div>{form.productScope === "specific" && <CouponProductSelector products={products} categories={categories} selectedIds={form.productIds ?? []} onToggle={toggleProduct} />}</div><label className="mt-5 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active !== false} onChange={(event) => set("active", event.target.checked)} /> Active and available at checkout</label><button disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50"><Save className="size-4" /> {busy ? "Saving…" : "Save coupon"}</button></form>;
}

function CouponManager() {
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [categories, setCategories] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<CouponRecord | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try { const [couponRows, productRows, categoryRows] = await Promise.all([api("/api/admin/coupons"), api("/api/admin/products"), api("/api/admin/categories")]); setCoupons(couponRows); setProducts(productRows); setCategories(categoryRows); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load coupons."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function remove(coupon: CouponRecord) {
    if (!coupon._id || !window.confirm(`Delete coupon ${coupon.code ?? ""}? This cannot be undone.`)) return;
    try { await api(`/api/admin/coupons/${coupon._id}`, { method: "DELETE" }); await load(); toast.success("Coupon deleted."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete coupon."); }
  }
  async function toggle(coupon: CouponRecord) {
    if (!coupon._id) return;
    try { await api(`/api/admin/coupons/${coupon._id}`, { method: "PUT", body: JSON.stringify({ ...coupon, active: coupon.active === false }) }); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not update coupon."); }
  }
  if (editing) return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to coupons</button><CouponEditor initial={editing} products={products} categories={categories} onDone={() => { setEditing(null); void load(); }} /></div>;
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-gold">Store promotions</p><h2 className="mt-1 font-display text-3xl text-primary">Coupons</h2><p className="mt-2 text-sm text-muted-foreground">Create discounts and assign them to your full catalog or selected products.</p></div><button type="button" onClick={() => setEditing({ ...emptyCoupon })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Create coupon</button></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><MetricCard label="Total coupons" value={coupons.length} icon={Tags} /><MetricCard label="Active coupons" value={coupons.filter((coupon) => coupon.active !== false).length} icon={CheckCircle2} /><MetricCard label="Product catalog" value={products.length} icon={Package} /></div><div className="mt-6 grid gap-4 lg:grid-cols-2">{loading ? <p className="text-sm text-muted-foreground">Loading coupons…</p> : coupons.length === 0 ? <div className="border border-dashed border-[#cfc3b5] bg-white p-10 text-center text-sm text-muted-foreground lg:col-span-2">No coupons yet. Create your first promotion.</div> : coupons.map((coupon) => <article key={coupon._id} className="border border-[#ded5c9] bg-white p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-2xl text-primary">{coupon.code}</h3><span className={`border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${coupon.active === false ? "border-border bg-[#f7f4ef] text-muted-foreground" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{coupon.active === false ? "Inactive" : "Active"}</span></div><p className="mt-2 text-sm text-muted-foreground">{coupon.label || `${coupon.discountType === "fixed" ? "₹" : ""}${coupon.discountValue ?? 0}${coupon.discountType === "percentage" ? "% off" : " off"}`}</p></div><div className="flex gap-2"><button type="button" onClick={() => setEditing(coupon)} className="border border-border px-3 py-2 text-xs text-primary">Edit</button><button type="button" onClick={() => void remove(coupon)} className="p-2 text-muted-foreground hover:text-red-700" aria-label={`Delete ${coupon.code}`}><Trash2 className="size-4" /></button></div></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs"><div><p className="text-muted-foreground">Discount</p><p className="mt-1 font-medium text-primary">{coupon.discountType === "fixed" ? `₹${Number(coupon.discountValue ?? 0).toLocaleString("en-IN")}` : `${coupon.discountValue ?? 0}%`}</p></div><div><p className="text-muted-foreground">Minimum subtotal</p><p className="mt-1 font-medium text-primary">{Number(coupon.minimumSubtotal ?? 0) ? `₹${Number(coupon.minimumSubtotal).toLocaleString("en-IN")}` : "No minimum"}</p></div><div><p className="text-muted-foreground">Applies to</p><p className="mt-1 font-medium text-primary">{coupon.productScope === "specific" ? `${coupon.productIds?.length ?? 0} selected products` : "All products"}</p></div><div><p className="text-muted-foreground">Availability</p><button type="button" onClick={() => void toggle(coupon)} className="mt-1 font-medium text-primary hover:underline">{coupon.active === false ? "Activate coupon" : "Deactivate coupon"}</button></div></div></article>)}</div></div>;
}

function ResourceManager({ resource }: { resource: Exclude<Tab, "dashboard" | "inventory" | "settings" | "customers" | "reviews" | "coupons"> }) {
  const [items, setItems] = useState<RecordItem[]>([]); const [editing, setEditing] = useState<RecordItem | null>(null); const [loading, setLoading] = useState(true);
  async function refresh() { setLoading(true); try { setItems(await api(`/api/admin/${resource}`)); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load records."); } finally { setLoading(false); } }
  useEffect(() => {
    setEditing(null);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [resource]);
  async function remove(id: string) { if (!window.confirm("Delete this record? This cannot be undone.")) return; try { await api(`/api/admin/${resource}/${id}`, { method: "DELETE" }); toast.success("Deleted."); void refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Delete failed."); } }
  if (resource === "heroes") return <HeroSlidesManager />;
  if (resource === "categories") return <SortableCategoryPage />;
  if (resource === "products") return <ProductViewCrudPage />;
  if (editing && resource === "products") return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to products</button><div className="max-w-4xl"><ProductEditor initial={editing} onDone={() => { setEditing(null); void refresh(); }} /></div></div>;
  return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{items.length} records</p><h2 className="mt-1 font-display text-3xl text-primary">Manage {resource === "heroes" ? "hero slides" : resource}</h2></div><button type="button" onClick={() => setEditing({ ...emptyByResource[resource] })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add new</button></div><div className="mt-7 grid gap-4 xl:grid-cols-[1fr_380px]"><div className="space-y-3">{loading ? <p className="text-sm text-muted-foreground">Loading…</p> : items.map((item) => <div key={item._id} className="flex items-center justify-between gap-4 border border-[#ded5c9] bg-white p-4"><div className="flex min-w-0 items-center gap-4">{typeof item.image === "string" && item.image ? <img src={item.image} alt="" className="size-14 shrink-0 object-cover" /> : <div className="size-14 shrink-0 bg-[#f0e9df]" />}<div className="min-w-0"><p className="truncate font-medium">{String(item.name ?? item.title ?? item.label ?? item.slug ?? "Untitled")}</p><p className="mt-1 text-xs text-muted-foreground">{resource === "products" ? `₹${Number(item.price ?? 0).toLocaleString("en-IN")} · Stock ${Number(item.stock ?? 0)}` : item.published === false ? "Draft" : "Published"}</p></div></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => setEditing(item)} className="border border-border px-3 py-2 text-xs text-primary">Edit</button><button type="button" onClick={() => item._id && void remove(item._id)} className="p-2 text-muted-foreground hover:text-red-700" aria-label="Delete"><Trash2 className="size-4" /></button></div></div>)}</div>{editing && <Editor resource={resource} initial={editing} onDone={() => { setEditing(null); void refresh(); }} />}</div></>;
}

function CategoryManager() {
  const [categories, setCategories] = useState<RecordItem[]>([]);
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  async function load() {
    try { const [categoryItems, productItems] = await Promise.all([api("/api/admin/categories"), api("/api/admin/products")]); setCategories(categoryItems); setProducts(productItems); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load categories."); }
  }
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, []);
  const parents = categories.filter((category) => !category.parentSlug);
  function toggle(slug: string) { setExpanded((current) => current.includes(slug) ? current.filter((value) => value !== slug) : [...current, slug]); }
  function productsFor(slug: string) { return products.filter((product) => String(product.category ?? "") === slug); }
  async function remove(category: RecordItem) {
    if (!category._id || !window.confirm(`Delete ${String(category.label ?? category.slug ?? "this category")}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/categories/${category._id}`, { method: "DELETE" });
      await load();
      toast.success("Category deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete category.");
    }
  }
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{parents.length} main categories · {categories.length} total records</p><h2 className="mt-1 font-display text-3xl text-primary">Category management</h2><p className="mt-2 text-sm text-muted-foreground">Manage categories, subcategories, and the products inside each collection.</p></div><button type="button" onClick={() => setEditing({ ...emptyByResource.categories })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add category</button></div><div className="mt-7 space-y-3">{parents.map((category) => { const slug = String(category.slug ?? ""); const children = categories.filter((item) => String(item.parentSlug ?? "") === slug); const categoryProducts = productsFor(slug); const isOpen = expanded.includes(slug); return <section key={category._id ?? slug} className="border border-[#ded5c9] bg-white"><div className="flex flex-wrap items-center gap-4 p-4"><button type="button" onClick={() => toggle(slug)} className="flex size-8 items-center justify-center text-primary">{isOpen ? "⌄" : "›"}</button>{category.image ? <img src={String(category.image)} alt="" className="size-14 object-cover" /> : <div className="size-14 bg-[#f0e9df]" />}<div className="min-w-0 flex-1"><h3 className="font-medium text-primary">{String(category.label ?? category.name ?? slug)}</h3><p className="mt-1 text-xs text-muted-foreground">{children.length} subcategor{children.length === 1 ? "y" : "ies"} · {categoryProducts.length} product{categoryProducts.length === 1 ? "" : "s"}</p></div><button type="button" onClick={() => setEditing({ ...category })} className="border border-border px-3 py-2 text-xs text-primary">Edit</button><button type="button" onClick={() => setEditing({ label: "", slug: "", parentSlug: slug, description: "", image: "", order: children.length, published: true })} className="inline-flex items-center gap-1 border border-primary px-3 py-2 text-xs text-primary"><Plus className="size-3.5" /> Add subcategory</button></div>{isOpen && <div className="border-t border-border bg-[#fbf9f6] p-4"><div className="grid gap-3 lg:grid-cols-2">{children.map((child) => <div key={child._id} className="flex items-center gap-3 border border-border bg-white p-3"><div className="size-10 bg-[#f0e9df]" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-primary">{String(child.label ?? child.slug)}</p><p className="mt-1 text-xs text-muted-foreground">{productsFor(String(child.slug)).length} product{productsFor(String(child.slug)).length === 1 ? "" : "s"}</p></div><button type="button" onClick={() => setEditing({ ...child })} className="text-xs text-primary hover:underline">Edit</button></div>)}</div>{children.length === 0 && <p className="text-sm text-muted-foreground">No subcategories yet. Add one from this category row.</p>}<div className="mt-5 border-t border-border pt-4"><p className="text-[10px] uppercase tracking-[0.16em] text-gold">Products in {String(category.label ?? slug)}</p>{categoryProducts.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No products assigned to this category.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{categoryProducts.map((product) => <div key={product._id} className="flex items-center gap-3 border border-border bg-white p-2.5"><div className="size-10 overflow-hidden bg-[#f0e9df]">{product.image && <img src={String(product.image)} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0"><p className="truncate text-sm text-primary">{String(product.name ?? product.id)}</p><p className="text-xs text-muted-foreground">{String(product.subcategory ?? "No subcategory")} · ₹{Number(product.price ?? 0).toLocaleString("en-IN")}</p></div></div>)}</div>}</div></div>}</section>; })}</div>{editing && <div className="mt-6 max-w-xl"><Editor resource="categories" initial={editing} onDone={() => { setEditing(null); void load(); }} /></div>}</div>;
}

function SimpleCategoryManager() {
  const [categories, setCategories] = useState<RecordItem[]>([]);
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  async function load() { try { const [categoryItems, productItems] = await Promise.all([api("/api/admin/categories"), api("/api/admin/products")]); setCategories(categoryItems.filter((item: RecordItem) => !item.parentSlug)); setProducts(productItems); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load categories."); } }
  useEffect(() => { void load(); }, []);
  if (editing) return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to categories</button><div className="max-w-xl"><Editor resource="categories" initial={editing} onDone={() => { setEditing(null); void load(); }} /></div></div>;
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{categories.length} categories</p><h2 className="mt-1 font-display text-3xl text-primary">Category management</h2><p className="mt-2 text-sm text-muted-foreground">Manage your main collections and see the products assigned to each one.</p></div><button type="button" onClick={() => setEditing({ ...emptyByResource.categories })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add category</button></div><div className="mt-7 grid gap-4 md:grid-cols-2">{categories.map((category) => { const slug = String(category.slug ?? ""); const assigned = products.filter((product) => String(product.category ?? "") === slug); return <section key={category._id ?? slug} className="border border-[#ded5c9] bg-white p-5"><div className="flex items-center gap-4">{category.image ? <img src={String(category.image)} alt="" className="size-14 object-cover" /> : <div className="size-14 bg-[#f0e9df]" />}<div className="min-w-0 flex-1"><h3 className="font-medium text-primary">{String(category.label ?? slug)}</h3><p className="mt-1 text-xs text-muted-foreground">{assigned.length} product{assigned.length === 1 ? "" : "s"}</p></div><button type="button" onClick={() => setEditing({ ...category })} className="border border-border px-3 py-2 text-xs text-primary">Edit</button></div><div className="mt-4 border-t border-border pt-3">{assigned.length === 0 ? <p className="text-sm text-muted-foreground">No products in this category yet.</p> : <div className="space-y-2">{assigned.map((product) => <div key={product._id} className="flex items-center gap-3 bg-[#fbf9f6] p-2.5"><div className="size-10 overflow-hidden bg-[#f0e9df]">{product.image && <img src={String(product.image)} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-primary">{String(product.name ?? product.id)}</p><p className="text-xs text-muted-foreground">₹{Number(product.price ?? 0).toLocaleString("en-IN")} · Stock {Number(product.stock ?? 0)}</p></div></div>)}</div>}</div></section>; })}</div>{editing && <div className="mt-6 max-w-xl"><Editor resource="categories" initial={editing} onDone={() => { setEditing(null); void load(); }} /></div>}</div>;
}

function ProductManager() {
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [categories, setCategories] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  async function load() { try { const [productItems, categoryItems] = await Promise.all([api("/api/admin/products"), api("/api/admin/categories")]); setProducts(productItems); setCategories(categoryItems.filter((item: RecordItem) => !item.parentSlug)); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load products."); } }
  useEffect(() => { void load(); }, []);
  const categoryName = (slug: unknown) => String(categories.find((category) => String(category.slug) === String(slug))?.label ?? slug ?? "Unassigned");
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = products.filter((product) => {
      const productStock = Number(product.stock ?? 0);
      const searchable = [product.name, product.id, product.fabric, product.category, categoryName(product.category)].map((value) => String(value ?? "").toLowerCase()).join(" ");
      const matchesSearch = !query || searchable.includes(query);
      const matchesCategory = categoryFilter === "all" || String(product.category ?? "") === categoryFilter;
      const matchesStock = stockFilter === "all"
        || (stockFilter === "in-stock" && productStock > 0)
        || (stockFilter === "low-stock" && productStock > 0 && productStock <= 3)
        || (stockFilter === "out-of-stock" && productStock === 0);
      return matchesSearch && matchesCategory && matchesStock;
    });
    return matches.sort((a, b) => {
      if (sort === "name-asc" || sort === "name-desc") {
        const comparison = String(a.name ?? a.id ?? "").localeCompare(String(b.name ?? b.id ?? ""));
        return sort === "name-asc" ? comparison : -comparison;
      }
      if (sort === "price-low" || sort === "price-high") {
        const comparison = Number(a.price ?? 0) - Number(b.price ?? 0);
        return sort === "price-low" ? comparison : -comparison;
      }
      if (sort === "stock-low" || sort === "stock-high") {
        const comparison = Number(a.stock ?? 0) - Number(b.stock ?? 0);
        return sort === "stock-low" ? comparison : -comparison;
      }
      if (sort === "oldest" || sort === "newest") {
        const comparison = new Date(String(a.createdAt ?? 0)).getTime() - new Date(String(b.createdAt ?? 0)).getTime();
        return sort === "oldest" ? comparison : -comparison;
      }
      return 0;
    });
  }, [categoryFilter, categories, products, search, sort, stockFilter]);
  function clearFilters() {
    setSearch("");
    setCategoryFilter("all");
    setStockFilter("all");
    setSort("newest");
  }
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{filteredProducts.length === products.length ? `${products.length} products` : `Showing ${filteredProducts.length} of ${products.length} products`}</p><h2 className="mt-1 font-display text-3xl text-primary">Products & stock</h2></div><button type="button" onClick={() => setEditing({ ...emptyByResource.products })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add new</button></div>{editing ? <div className="mt-7 max-w-4xl"><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to products</button><SimpleProductEditor initial={editing} categories={categories} onDone={() => { setEditing(null); void load(); }} /></div> : <><div className="mt-7 border border-[#ded5c9] bg-white p-5"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-gold"><SlidersHorizontal className="size-3.5" /> Catalog filters</div><div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_190px_170px_190px_auto]"><label className="relative block"><span className="sr-only">Search products</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, fabric…" className="w-full border border-border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold" /></label><label><span className="sr-only">Filter by category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="all">All categories</option>{categories.map((category) => <option key={category._id} value={String(category.slug)}>{String(category.label ?? category.slug)}</option>)}</select></label><label><span className="sr-only">Filter by stock</span><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="all">All stock levels</option><option value="in-stock">In stock</option><option value="low-stock">Low stock (1–3)</option><option value="out-of-stock">Out of stock</option></select></label><label><span className="sr-only">Sort products</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="stock-low">Stock: low to high</option><option value="stock-high">Stock: high to low</option></select></label><button type="button" onClick={clearFilters} className="border border-border px-4 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">Clear</button></div></div><div className="mt-4 grid gap-3">{filteredProducts.length === 0 ? <div className="border border-dashed border-[#cfc3b5] bg-white p-10 text-center"><Search className="mx-auto size-5 text-gold" /><p className="mt-3 text-sm text-muted-foreground">No products match your search and filters.</p><button type="button" onClick={clearFilters} className="mt-3 text-xs text-primary hover:underline">Clear filters</button></div> : filteredProducts.map((product) => <div key={product._id} className="flex flex-wrap items-center gap-4 border border-[#ded5c9] bg-white p-4"><div className="size-16 shrink-0 overflow-hidden bg-[#f0e9df]">{product.image && <img src={String(product.image)} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-48 flex-1"><p className="font-medium text-primary">{String(product.name ?? product.id)}</p><p className="mt-1 text-xs text-muted-foreground">Category: <strong className="font-medium text-primary">{categoryName(product.category)}</strong></p><p className="mt-1 text-xs text-muted-foreground">₹{Number(product.price ?? 0).toLocaleString("en-IN")} · Stock {Number(product.stock ?? 0)}</p></div><span className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${Number(product.stock ?? 0) === 0 ? "border-red-200 bg-red-50 text-red-700" : Number(product.stock ?? 0) <= 3 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{Number(product.stock ?? 0) === 0 ? "Out of stock" : Number(product.stock ?? 0) <= 3 ? "Low stock" : "In stock"}</span><button type="button" onClick={() => setEditing({ ...product })} className="border border-border px-3 py-2 text-xs text-primary hover:border-primary">Edit</button></div>)}</div></>}</div>;
}

function LegacySimpleProductEditor({ initial, categories, onDone }: { initial: RecordItem; categories: RecordItem[]; onDone: () => void }) {
  const [form, setForm] = useState({ ...initial, imageGallery: Array.isArray(initial.images) ? initial.images.join("\n") : String(initial.image ?? "") });
  const [busy, setBusy] = useState(false);
  const parents = categories.filter((category) => !category.parentSlug);
  const subcategories = categories.filter((category) => String(category.parentSlug ?? "") === String(form.category ?? ""));
  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); try { const images = String(form.imageGallery ?? "").split(/\r?\n|,/).map((image) => image.trim()).filter(Boolean); const { _id, imageGallery, ...payload } = form; await api(`/api/admin/products${_id ? `/${_id}` : ""}`, { method: _id ? "PUT" : "POST", body: JSON.stringify({ ...payload, subcategory: String(form.subcategory ?? "").trim() || undefined, images, image: images[0] ?? "" }) }); toast.success("Product saved."); onDone(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save product."); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Catalog detail</p><h3 className="mt-1 font-display text-2xl text-primary">{form._id ? "Edit product" : "Add product"}</h3></div><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs text-muted-foreground sm:col-span-2">Product name<input required value={String(form.name ?? "")} onChange={(event) => set("name", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Product ID<input required value={String(form.id ?? "")} onChange={(event) => set("id", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Category<select required value={String(form.category ?? "")} onChange={(event) => { set("category", event.target.value); set("subcategory", ""); }} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm"><option value="">Choose a parent category</option>{parents.map((parent) => <option key={parent._id} value={String(parent.slug)}>{String(parent.label ?? parent.slug)}</option>)}</select><span className="mt-1 block text-[11px] text-muted-foreground">The product can be assigned directly to this parent.</span></label><label className="text-xs text-muted-foreground">Subcategory<select value={String(form.subcategory ?? "")} onChange={(event) => set("subcategory", event.target.value)} disabled={!form.category || subcategories.length === 0} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm disabled:bg-[#f4efe8]"><option value="">{!form.category ? "Choose category first" : subcategories.length ? "Directly in parent category" : "No subcategories for this category"}</option>{subcategories.map((subcategory) => <option key={subcategory._id} value={String(subcategory.slug)}>↳ {String(subcategory.label ?? subcategory.slug)}</option>)}</select><span className="mt-1 block text-[11px] text-muted-foreground">Optional child category from the selected parent.</span></label><label className="text-xs text-muted-foreground">Fabric<input value={String(form.fabric ?? "")} onChange={(event) => set("fabric", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Price (₹)<input required type="number" min="0" value={Number(form.price ?? 0)} onChange={(event) => set("price", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Stock quantity<input required type="number" min="0" value={Number(form.stock ?? 0)} onChange={(event) => set("stock", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Image URLs<textarea required value={String(form.imageGallery ?? "")} onChange={(event) => set("imageGallery", event.target.value)} rows={4} placeholder="One URL per line" className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Description<textarea required value={String(form.description ?? "")} onChange={(event) => set("description", event.target.value)} rows={5} className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label></div><div className="mt-6 flex gap-5 border-t border-border pt-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.published !== false} onChange={(event) => set("published", event.target.checked)} /> Published on storefront</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.featured === true} onChange={(event) => set("featured", event.target.checked)} /> Featured product</label></div><button disabled={busy} className="mt-6 w-full bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving product…" : "Save product"}</button></form>;
}

function LegacyProductEditor({ initial, categories, onDone }: { initial: RecordItem; categories: RecordItem[]; onDone: () => void }) {
  const [form, setForm] = useState(() => ({
    ...initial,
    coverImage: String(initial.image ?? ""),
    extraImages: Array.isArray(initial.images) ? initial.images.slice(1).map(String).join("\n") : "",
    productDetails: String(initial.productDetails ?? [`Fabric: ${initial.fabric ?? ""}`, `Category: ${initial.category ?? ""}`, `Length: ${initial.length ?? ""}`].join("\n")),
    productSpecification: String(initial.productSpecification ?? [`Blouse: ${initial.blouse ?? ""}`, `Care instructions: ${initial.care ?? ""}`].join("\n")),
  }));
  const [busy, setBusy] = useState(false);
  const parents = categories.filter((category) => !category.parentSlug);
  const subcategories = categories.filter((category) => String(category.parentSlug ?? "") === String(form.category ?? ""));
  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const coverImage = String(form.coverImage ?? "").trim();
    const extraImages = String(form.extraImages ?? "").split(/\r?\n|,/).map((image) => image.trim()).filter(Boolean);
    if (!coverImage) { toast.error("A cover image is required."); return; }
    if (extraImages.length > 4) { toast.error("Add no more than four extra images."); return; }
    setBusy(true);
    try {
      const images = [coverImage, ...extraImages.filter((image) => image !== coverImage)];
      const { _id, coverImage: _coverImage, extraImages: _extraImages, ...payload } = form;
      await api(`/api/admin/products${_id ? `/${_id}` : ""}`, { method: _id ? "PUT" : "POST", body: JSON.stringify({ ...payload, image: coverImage, images, subcategory: String(form.subcategory ?? "").trim() || undefined }) });
      toast.success("Product saved."); onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save product."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Catalog detail</p><h3 className="mt-1 font-display text-2xl text-primary">{form._id ? "Edit product" : "Add product"}</h3><p className="mt-2 text-sm text-muted-foreground">Everything entered here is saved to the live product record.</p></div><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs text-muted-foreground sm:col-span-2">Product name<input required value={String(form.name ?? "")} onChange={(event) => set("name", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Product ID<input required value={String(form.id ?? "")} onChange={(event) => set("id", event.target.value.trim().toLowerCase().replace(/\s+/g, "-"))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Fabric<input required value={String(form.fabric ?? "")} onChange={(event) => set("fabric", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Category<select required value={String(form.category ?? "")} onChange={(event) => { set("category", event.target.value); set("subcategory", ""); }} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm"><option value="">Choose a parent category</option>{parents.map((parent) => <option key={parent._id} value={String(parent.slug)}>{String(parent.label ?? parent.slug)}</option>)}</select></label><label className="text-xs text-muted-foreground">Subcategory<select value={String(form.subcategory ?? "")} onChange={(event) => set("subcategory", event.target.value)} disabled={!form.category || subcategories.length === 0} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm disabled:bg-[#f4efe8]"><option value="">{!form.category ? "Choose category first" : subcategories.length ? "Directly in parent category" : "No subcategories available"}</option>{subcategories.map((subcategory) => <option key={subcategory._id} value={String(subcategory.slug)}>↳ {String(subcategory.label ?? subcategory.slug)}</option>)}</select></label><label className="text-xs text-muted-foreground">Price (₹)<input required type="number" min="0" value={Number(form.price ?? 0)} onChange={(event) => set("price", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Stock quantity<input required type="number" min="0" value={Number(form.stock ?? 0)} onChange={(event) => set("stock", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><div className="sm:col-span-2 border-t border-border pt-5"><p className="text-xs font-medium text-primary">Product gallery</p><p className="mt-1 text-[11px] text-muted-foreground">The cover image is required. Add up to four extra images, one URL per line.</p><label className="mt-3 block text-xs text-muted-foreground">Cover image URL<input required value={String(form.coverImage ?? "")} onChange={(event) => set("coverImage", event.target.value)} placeholder="https://…/cover.jpg" className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="mt-3 block text-xs text-muted-foreground">Extra image URLs <span className="text-muted-foreground">(optional, maximum 4)</span><textarea value={String(form.extraImages ?? "")} onChange={(event) => set("extraImages", event.target.value)} rows={4} placeholder={"https://…/detail-1.jpg\nhttps://…/detail-2.jpg"} className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label></div><label className="text-xs text-muted-foreground sm:col-span-2">PRODUCT DETAILS<textarea required value={String(form.productDetails ?? "")} onChange={(event) => set("productDetails", event.target.value)} rows={4} placeholder="Fabric, occasion, drape, and other product details…" className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground sm:col-span-2">PRODUCT DESCRIPTION<textarea required value={String(form.description ?? "")} onChange={(event) => set("description", event.target.value)} rows={6} placeholder="Tell customers the story of this product…" className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground sm:col-span-2">PRODUCT SPECIFICATION<textarea required value={String(form.productSpecification ?? "")} onChange={(event) => set("productSpecification", event.target.value)} rows={4} placeholder="Weight, care instructions, country of origin, and measurements…" className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Blouse details<input value={String(form.blouse ?? "")} onChange={(event) => set("blouse", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Saree length<input value={String(form.length ?? "")} onChange={(event) => set("length", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Care instructions<input value={String(form.care ?? "")} onChange={(event) => set("care", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label></div><div className="mt-6 flex flex-wrap gap-5 border-t border-border pt-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.published !== false} onChange={(event) => set("published", event.target.checked)} /> Published on storefront</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.featured === true} onChange={(event) => set("featured", event.target.checked)} /> Featured product</label></div><button disabled={busy} className="mt-6 w-full bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving product…" : "Save product"}</button></form>;
}

function SimpleProductEditor({ initial, categories, onDone }: { initial: RecordItem; categories: RecordItem[]; onDone: () => void }) {
  const initialVariants: ProductVariantForm[] = Array.isArray(initial.variants)
    ? initial.variants.map((variant, index) => {
      const row = variant && typeof variant === "object" ? variant as Record<string, unknown> : {};
      const images = Array.isArray(row.images) ? row.images.map(String).filter(Boolean) : [];
      return {
        id: String(row.id ?? `${String(initial.id ?? "variant")}-${index + 1}`),
        color: String(row.color ?? ""),
        stock: Math.max(0, Math.trunc(Number(row.stock ?? 0))),
        image: String(row.image ?? images[0] ?? ""),
        extraImages: images.slice(1).join("\n"),
      };
    })
    : [];
  const [form, setForm] = useState<RecordItem>(() => ({
    ...initial,
    price: Number(initial.originalPrice ?? initial.price ?? 0),
    originalPrice: Number(initial.originalPrice ?? initial.price ?? 0),
    discountType: initial.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: initial.discountValue == null ? "" : Number(initial.discountValue),
    coverImage: String(initial.image ?? ""),
    extraImages: Array.isArray(initial.images) ? initial.images.slice(1).map(String).join("\n") : "",
    productDescription: String(initial.productDescription ?? initial.description ?? ""),
    fabric: String(initial.fabric ?? ""),
    length: String(initial.length ?? ""),
    weight: String(initial.weight ?? ""),
    care: String(initial.care ?? ""),
    countryOfOrigin: String(initial.countryOfOrigin ?? "India"),
    newArrival: initial.newArrival === true,
    trending: initial.trending === true,
    bestseller: initial.bestseller === true,
    variants: initialVariants,
  }));
  const [busy, setBusy] = useState(false);
  const [openColorIndex, setOpenColorIndex] = useState<number | null>(null);
  const parents = categories.filter((category) => !category.parentSlug);
  const subcategories = categories.filter((category) => String(category.parentSlug ?? "") === String(form.category ?? ""));
  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  const variants = Array.isArray(form.variants) ? form.variants as ProductVariantForm[] : [];
  const setVariant = (index: number, key: keyof ProductVariantForm, value: string | number) => setForm((current) => ({
    ...current,
    variants: (Array.isArray(current.variants) ? current.variants as ProductVariantForm[] : []).map((variant, itemIndex) => itemIndex === index ? { ...variant, [key]: value } : variant),
  }));
  const addVariant = () => setForm((current) => ({
    ...current,
    variants: [...(Array.isArray(current.variants) ? current.variants as ProductVariantForm[] : []), { color: "", stock: 0, image: "", extraImages: "" }],
  }));
  const removeVariant = (index: number) => setForm((current) => ({
    ...current,
    variants: (Array.isArray(current.variants) ? current.variants as ProductVariantForm[] : []).filter((_, itemIndex) => itemIndex !== index),
  }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const coverImage = String(form.coverImage ?? "").trim();
    const extraImages = String(form.extraImages ?? "").split(/\r?\n|,/).map((image) => image.trim()).filter(Boolean);
    const rawVariants = variants;
    const variantColors = new Set<string>();
    let normalizedVariants: { id?: string; color: string; stock: number; image: string; images: string[] }[] = [];
    try {
      normalizedVariants = rawVariants.map((variant, index) => {
        const color = String(variant.color ?? "").trim();
        const image = String(variant.image ?? "").trim();
        const variantImages = [image, ...String(variant.extraImages ?? "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).filter((item) => item !== image)];
        if (!color) throw new Error(`Add a color name for variant ${index + 1}.`);
        if (!productColors.some((option) => option.key === color)) throw new Error(`Choose a color from the approved palette for variant ${index + 1}.`);
        if (variantColors.has(color.toLowerCase())) throw new Error(`Each color variant must be unique. "${color}" is repeated.`);
        variantColors.add(color.toLowerCase());
        if (!image) throw new Error(`Add a cover image for the ${color} variant.`);
        if (variantImages.length > 5) throw new Error(`The ${color} variant can have no more than four extra images.`);
        const stock = Number(variant.stock);
        if (!Number.isInteger(stock) || stock < 0) throw new Error(`Enter a valid stock quantity for the ${color} variant.`);
        return { id: String(variant.id ?? "").trim() || undefined, color, stock, image, images: variantImages };
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enter valid color variant details.");
      return;
    }
    const originalPrice = Number(form.price ?? 0);
    const discountValue = form.discountValue === "" ? 0 : Number(form.discountValue ?? 0);
    if (!coverImage && !normalizedVariants.length) { toast.error("A cover image is required when the product has no color variants."); return; }
    if (extraImages.length > 4) { toast.error("Add no more than four extra images."); return; }
    if (!Number.isFinite(originalPrice) || originalPrice < 0) { toast.error("Enter a valid price."); return; }
    if (!Number.isFinite(discountValue) || discountValue < 0 || (form.discountType === "percentage" && discountValue > 100)) { toast.error("Enter a valid discount."); return; }
    if (form.discountType === "fixed" && discountValue > originalPrice) { toast.error("The fixed discount cannot be greater than the price."); return; }
    setBusy(true);
    try {
      const images = [coverImage, ...extraImages.filter((image) => image !== coverImage)];
      const { _id, coverImage: _coverImage, extraImages: _extraImages, ...payload } = form;
      await api(`/api/admin/products${_id ? `/${_id}` : ""}`, {
        method: _id ? "PUT" : "POST",
        body: JSON.stringify({
          ...payload,
          id: String(form.id ?? "").trim() || undefined,
          price: originalPrice,
          originalPrice,
          discountValue,
          image: coverImage,
          images,
           variants: normalizedVariants,
          description: String(form.productDescription ?? "").trim(),
          productDescription: String(form.productDescription ?? "").trim(),
          subcategory: String(form.subcategory ?? "").trim() || undefined,
          countryOfOrigin: String(form.countryOfOrigin ?? "").trim() || "India",
        }),
      });
      toast.success("Product saved."); onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save product."); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="border border-[#ded5c9] bg-white p-6">
      <div className="flex items-start justify-between">
        <div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Catalog detail</p><h3 className="mt-1 font-display text-2xl text-primary">{form._id ? "Edit product" : "Add product"}</h3><p className="mt-2 text-sm text-muted-foreground">Product ID is generated automatically from the product name.</p></div>
        <button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button>
      </div>
      <div className="mt-6 space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground sm:col-span-2">Product name<input required value={String(form.name ?? "")} onChange={(event) => set("name", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label>
          <label className="text-xs text-muted-foreground">Price (₹)<input required type="number" min="0" step="1" value={Number(form.price ?? 0)} onChange={(event) => set("price", event.target.value === "" ? "" : Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label>
          <div className="text-xs text-muted-foreground"><span>Discount (optional)</span><div className="mt-1 flex"><input type="number" min="0" step="1" value={form.discountValue === "" ? "" : Number(form.discountValue ?? 0)} onChange={(event) => set("discountValue", event.target.value === "" ? "" : Number(event.target.value))} placeholder="0" className="min-w-0 flex-1 border border-border px-3 py-2.5 text-sm" /><select value={String(form.discountType ?? "percentage")} onChange={(event) => set("discountType", event.target.value)} className="w-32 border-y border-r border-border bg-white px-2 py-2.5 text-sm"><option value="percentage">% off</option><option value="fixed">₹ off</option></select></div></div>
          {variants.length === 0 && <label className="text-xs text-muted-foreground">Stock quantity<input required type="number" min="0" step="1" value={Number(form.stock ?? 0)} onChange={(event) => set("stock", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label>}
        </section>
        {variants.length === 0 && <section className="border-t border-border pt-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Product gallery</p><p className="mt-1 text-[11px] text-muted-foreground">The cover image is required when no color variants are added. Add up to four extra images, one URL per line.</p>
          <label className="mt-3 block text-xs text-muted-foreground">Cover image URL<input required value={String(form.coverImage ?? "")} onChange={(event) => set("coverImage", event.target.value)} placeholder="https://…/cover.jpg" className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label>
          <label className="mt-3 block text-xs text-muted-foreground">Extra image URLs <span>(optional, maximum 4)</span><textarea value={String(form.extraImages ?? "")} onChange={(event) => set("extraImages", event.target.value)} rows={4} placeholder={"https://…/detail-1.jpg\nhttps://…/detail-2.jpg"} className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label>
        </section>}
        <section className="border-t border-border pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] uppercase tracking-[0.16em] text-gold">Color variants</p><p className="mt-1 text-[11px] text-muted-foreground">Each color has its own cover gallery and inventory stock. Product details and pricing stay shared.</p></div>
            <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 border border-primary px-3 py-2 text-xs text-primary"><Plus className="size-3.5" /> Add color variant</button>
          </div>
          {variants.length === 0 ? (
            <div className="mt-4 border border-dashed border-[#cfc3b5] bg-[#fbf9f6] p-4 text-sm text-muted-foreground">No color variants yet. This product will use the default gallery and stock above.</div>
          ) : (
            <div className="mt-4 space-y-4">
              {variants.map((variant, index) => (
                <article key={variant.id || index} className="border border-border bg-[#fbf9f6] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-medium text-primary">Color variant {index + 1}</h4>
                    <button type="button" onClick={() => removeVariant(index)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-700"><Trash2 className="size-3.5" /> Remove</button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="relative text-xs text-muted-foreground">
                      <span>Color name</span>
                      <button
                        type="button"
                        role="combobox"
                        aria-haspopup="listbox"
                        aria-expanded={openColorIndex === index}
                        onClick={() => setOpenColorIndex(openColorIndex === index ? null : index)}
                        className="mt-1 flex w-full items-center justify-between border border-border bg-white px-3 py-2.5 text-left text-sm text-foreground"
                      >
                        <span className="flex items-center gap-2">
                          {getProductColor(variant.color) ? (
                            <span className="size-4 rounded-full border border-black/10" style={{ backgroundColor: getProductColor(variant.color)?.hex }} />
                          ) : (
                            <span className="size-4 rounded-full border border-dashed border-muted-foreground" />
                          )}
                          {getProductColor(variant.color)?.label ?? "Choose a color"}
                        </span>
                        <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", openColorIndex === index && "rotate-90")} />
                      </button>
                      {openColorIndex === index && (
                        <div role="listbox" aria-label="Color options" className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto border border-border bg-white p-1 shadow-lg">
                          {productColors.map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              role="option"
                              aria-selected={variant.color === option.key}
                              onClick={() => {
                                setVariant(index, "color", option.key);
                                setOpenColorIndex(null);
                              }}
                              className={cn("flex w-full items-center gap-2 px-2 py-2 text-left text-sm hover:bg-[#f4efe8]", variant.color === option.key && "bg-[#f4efe8] text-primary")}
                            >
                              <span className="size-4 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: option.hex }} />
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <label className="text-xs text-muted-foreground">Variant stock<input required type="number" min="0" step="1" value={variant.stock === "" ? "" : Number(variant.stock)} onChange={(event) => setVariant(index, "stock", event.target.value === "" ? "" : Number(event.target.value))} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm" /></label>
                    <label className="text-xs text-muted-foreground sm:col-span-2">Variant cover image URL<input required value={variant.image} onChange={(event) => setVariant(index, "image", event.target.value)} placeholder="https://…/yellow-cover.jpg" className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm" /></label>
                    <label className="text-xs text-muted-foreground sm:col-span-2">Variant extra image URLs <span>(optional, maximum 4)</span><textarea value={variant.extraImages} onChange={(event) => setVariant(index, "extraImages", event.target.value)} rows={3} placeholder={"https://…/yellow-detail-1.jpg\nhttps://…/yellow-detail-2.jpg"} className="mt-1 w-full resize-y border border-border bg-white px-3 py-2.5 text-sm" /></label>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="border-t border-border pt-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold">PRODUCT DESCRIPTION</p>
          <label className="mt-3 block text-xs text-muted-foreground">Description<textarea required value={String(form.productDescription ?? "")} onChange={(event) => set("productDescription", event.target.value)} rows={5} placeholder="Describe the saree, its craft, colour, and occasion…" className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label>
        </section>
        <section className="border-t border-border pt-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold">PRODUCT DETAILS</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">Fabric<input required value={String(form.fabric ?? "")} onChange={(event) => set("fabric", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-muted-foreground">Category<select required value={String(form.category ?? "")} onChange={(event) => { set("category", event.target.value); set("subcategory", ""); }} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm"><option value="">Choose a parent category</option>{parents.map((parent) => <option key={parent._id} value={String(parent.slug)}>{String(parent.label ?? parent.slug)}</option>)}</select></label>
            <label className="text-xs text-muted-foreground">Subcategory<select value={String(form.subcategory ?? "")} onChange={(event) => set("subcategory", event.target.value)} disabled={!form.category || subcategories.length === 0} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm disabled:bg-[#f4efe8]"><option value="">{!form.category ? "Choose category first" : subcategories.length ? "Optional subcategory" : "No subcategories available"}</option>{subcategories.map((subcategory) => <option key={subcategory._id} value={String(subcategory.slug)}>↳ {String(subcategory.label ?? subcategory.slug)}</option>)}</select></label>
            <label className="text-xs text-muted-foreground">Length<input required value={String(form.length ?? "")} onChange={(event) => set("length", event.target.value)} placeholder="6.3 metres including blouse" className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label>
          </div>
        </section>
        <section className="border-t border-border pt-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold">PRODUCT SPECIFICATION</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">Weight<input required value={String(form.weight ?? "")} onChange={(event) => set("weight", event.target.value)} placeholder="Approx. 550 g" className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-muted-foreground">Care Instructions<input required value={String(form.care ?? "")} onChange={(event) => set("care", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label>
            <label className="text-xs text-muted-foreground">Country of Origin<input required value={String(form.countryOfOrigin ?? "India")} onChange={(event) => set("countryOfOrigin", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label>
          </div>
        </section>
        <section className="border-t border-border pt-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gold">COLLECTION PLACEMENT</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Choose the storefront sections where this product should appear.</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.newArrival === true} onChange={(event) => set("newArrival", event.target.checked)} /> New Arrival</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.trending === true} onChange={(event) => set("trending", event.target.checked)} /> Trending</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.bestseller === true} onChange={(event) => set("bestseller", event.target.checked)} /> Bestseller</label>
          </div>
        </section>
      </div>
      <div className="mt-6 flex flex-wrap gap-5 border-t border-border pt-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.published !== false} onChange={(event) => set("published", event.target.checked)} /> Published on storefront</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.featured === true} onChange={(event) => set("featured", event.target.checked)} /> Featured product</label></div>
      <button disabled={busy} className="mt-6 w-full bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving product…" : "Save product"}</button>
    </form>
  );
}

function ProductEditor({ initial, onDone }: { initial: RecordItem; onDone: () => void }) {
  const [categories, setCategories] = useState<RecordItem[]>([]);
  const [form, setForm] = useState<RecordItem>({ ...initial, images: Array.isArray(initial.images) ? initial.images : [String(initial.image ?? "")] });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/admin/categories").then(setCategories).catch(() => undefined); }, []);
  const parents = categories.filter((category) => !category.parentSlug);
  const subcategories = categories.filter((category) => String(category.parentSlug ?? "") === String(form.category ?? ""));
  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const images = String(form.imageGallery ?? "").split(/\r?\n|,/).map((image) => image.trim()).filter(Boolean);
      const { _id, imageGallery, ...payload } = form;
      await api(`/api/admin/products${_id ? `/${_id}` : ""}`, { method: _id ? "PUT" : "POST", body: JSON.stringify({ ...payload, images, image: images[0] ?? "" }) });
      toast.success("Product saved."); onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save product."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Catalog detail</p><h3 className="mt-1 font-display text-2xl text-primary">{form._id ? "Edit product" : "Add product"}</h3></div><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs text-muted-foreground sm:col-span-2">Product name<input required value={String(form.name ?? "")} onChange={(event) => set("name", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Product ID<input required value={String(form.id ?? "")} onChange={(event) => set("id", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Fabric<input value={String(form.fabric ?? "")} onChange={(event) => set("fabric", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Category<select required value={String(form.category ?? "")} onChange={(event) => { set("category", event.target.value); set("subcategory", ""); }} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm"><option value="">Choose a category</option>{parents.map((category) => <option key={category._id} value={String(category.slug)}>{String(category.label ?? category.slug)}</option>)}</select></label><label className="text-xs text-muted-foreground">Subcategory<select value={String(form.subcategory ?? "")} onChange={(event) => set("subcategory", event.target.value)} disabled={!form.category} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm disabled:bg-[#f4efe8]"><option value="">{form.category ? "Choose a subcategory" : "Choose category first"}</option>{subcategories.map((category) => <option key={category._id} value={String(category.slug)}>{String(category.label ?? category.slug)}</option>)}</select></label><label className="text-xs text-muted-foreground">Price (₹)<input required type="number" min="0" value={Number(form.price ?? 0)} onChange={(event) => set("price", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Stock quantity<input required type="number" min="0" value={Number(form.stock ?? 0)} onChange={(event) => set("stock", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Image URLs <span className="text-muted-foreground">(one per line or comma separated)</span><textarea required value={String(form.imageGallery ?? (Array.isArray(form.images) ? form.images.join("\n") : form.image ?? ""))} onChange={(event) => set("imageGallery", event.target.value)} rows={4} placeholder="https://example.com/main.jpg&#10;https://example.com/detail.jpg" className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Detailed description<textarea required value={String(form.description ?? "")} onChange={(event) => set("description", event.target.value)} rows={6} placeholder="Describe the weave, colour, craft, and occasion…" className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Blouse details<input value={String(form.blouse ?? "")} onChange={(event) => set("blouse", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Saree length<input value={String(form.length ?? "")} onChange={(event) => set("length", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Care instructions<input value={String(form.care ?? "")} onChange={(event) => set("care", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label></div><div className="mt-6 flex flex-wrap gap-5 border-t border-border pt-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.published !== false} onChange={(event) => set("published", event.target.checked)} /> Published on storefront</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.featured === true} onChange={(event) => set("featured", event.target.checked)} /> Featured product</label></div><button disabled={busy} className="mt-6 w-full bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving product…" : "Save product"}</button></form>;
}

function Editor({ resource, initial, onDone }: { resource: Exclude<Tab, "dashboard">; initial: RecordItem; onDone: () => void }) {
  if (resource === "products") return <ProductEditor initial={initial} onDone={onDone} />;
  const [form, setForm] = useState<RecordItem>(initial); const [busy, setBusy] = useState(false);
  const fields = resource === "heroes" ? [["title", "Title"], ["subtitle", "Subtitle"], ["image", "Image URL"], ["href", "Button link"], ["order", "Display order"]] : resource === "categories" ? [["label", "Name"], ["slug", "Slug"], ["description", "Description"], ["image", "Image URL"], ["order", "Display order"]] : [["id", "Product ID"], ["name", "Name"], ["fabric", "Fabric"], ["price", "Price (₹)"], ["category", "Category ID"], ["subcategory", "Subcategory"], ["image", "Image URL"], ["stock", "Stock quantity"], ["blouse", "Blouse"], ["length", "Length"], ["care", "Care"], ["description", "Description"]];
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); try { const { _id, ...payload } = form; await api(`/api/admin/${resource}${_id ? `/${_id}` : ""}`, { method: _id ? "PUT" : "POST", body: JSON.stringify(payload) }); toast.success("Saved."); onDone(); } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed."); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="border border-[#ded5c9] bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-display text-2xl text-primary">{form._id ? "Edit record" : "New record"}</h3><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><div className="mt-5 space-y-3">{fields.map(([key, label]) => <label key={key} className="block text-xs text-muted-foreground">{label}<input required={["title", "label", "name", "id", "slug", "message", "code"].includes(key)} type={["price", "stock", "order", "amount", "minimumSubtotal"].includes(key) ? "number" : "text"} value={String(form[key] ?? "")} onChange={(e) => setForm({ ...form, [key]: ["price", "stock", "order", "amount", "minimumSubtotal"].includes(key) ? Number(e.target.value) : e.target.value })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label>)}</div>{["heroes", "categories", "products"].includes(resource) ? <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published !== false} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published on storefront</label> : <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>}{resource === "products" && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured === true} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured product</label>}<button disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50"><Save className="size-4" /> {busy ? "Saving…" : "Save changes"}</button></form>;
}

function LegacyProductCrudEditor({ initial, onDone }: { initial: RecordItem; onDone: () => void }) {
  const existingImages = Array.isArray(initial.images) && initial.images.length ? initial.images.map(String) : [String(initial.image ?? "")];
  const [form, setForm] = useState({ ...initial, images: existingImages });
  const [busy, setBusy] = useState(false);
  const set = (key: string, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const updateImage = (index: number, value: string) => setForm((current) => ({ ...current, images: current.images.map((image: string, itemIndex: number) => itemIndex === index ? value : image) }));
  const addImage = () => setForm((current) => ({ ...current, images: [...current.images, ""] }));
  const removeImage = (index: number) => setForm((current) => ({ ...current, images: current.images.filter((_: string, itemIndex: number) => itemIndex !== index) }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const images = form.images.map((image: string) => image.trim()).filter(Boolean);
      const { _id, ...payload } = form;
      await api(`/api/admin/products${_id ? `/${_id}` : ""}`, { method: _id ? "PUT" : "POST", body: JSON.stringify({ ...payload, images, image: images[0] ?? "" }) });
      toast.success("Product saved."); onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save product."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="max-h-[calc(100vh-10rem)] overflow-y-auto border border-[#ded5c9] bg-white p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Catalog detail</p><h3 className="mt-1 font-display text-2xl text-primary">{form._id ? "Edit product" : "Add product"}</h3><p className="mt-1 text-xs text-muted-foreground">Build a complete product page with a gallery and detailed information.</p></div><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><section className="mt-6"><div className="flex items-center justify-between"><div><h4 className="font-medium text-primary">Product images</h4><p className="mt-1 text-xs text-muted-foreground">Add multiple image URLs. The first image becomes the main product image.</p></div><button type="button" onClick={addImage} className="inline-flex items-center gap-1 border border-primary px-3 py-2 text-xs text-primary"><Plus className="size-3.5" /> Add image</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{form.images.map((image: string, index: number) => <div key={index} className="border border-border p-3"><div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f4efe8]">{image ? <img src={image} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <span className="text-xs text-muted-foreground">Image preview</span>}</div><div className="mt-3 flex gap-2"><input required={index === 0} value={image} onChange={(event) => updateImage(index, event.target.value)} placeholder="https://image-url.com/saree.jpg" className="min-w-0 flex-1 border border-border px-2.5 py-2 text-xs outline-none focus:border-gold" />{form.images.length > 1 && <button type="button" onClick={() => removeImage(index)} className="p-2 text-muted-foreground hover:text-red-700" aria-label="Remove image"><Trash2 className="size-4" /></button>}</div><p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{index === 0 ? "Primary image" : `Gallery image ${index + 1}`}</p></div>)}</div></section><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-xs text-muted-foreground sm:col-span-2">Product name<input required value={String(form.name ?? "")} onChange={(event) => set("name", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground">Product ID<input required value={String(form.id ?? "")} onChange={(event) => set("id", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground">Fabric<input value={String(form.fabric ?? "")} onChange={(event) => set("fabric", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground">Price (₹)<input required type="number" min="0" value={Number(form.price ?? 0)} onChange={(event) => set("price", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground">Stock quantity<input required type="number" min="0" value={Number(form.stock ?? 0)} onChange={(event) => set("stock", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground">Category ID<input value={String(form.category ?? "")} onChange={(event) => set("category", event.target.value)} placeholder="silk, cotton, designer…" className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground">Subcategory<input value={String(form.subcategory ?? "")} onChange={(event) => set("subcategory", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Blouse details<input value={String(form.blouse ?? "")} onChange={(event) => set("blouse", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground">Saree length<input value={String(form.length ?? "")} onChange={(event) => set("length", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Care instructions<input value={String(form.care ?? "")} onChange={(event) => set("care", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Detailed description<textarea required value={String(form.description ?? "")} onChange={(event) => set("description", event.target.value)} rows={5} placeholder="Describe the weave, colour, craft, occasion, and what makes this saree special…" className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-gold" /></label></div><div className="mt-5 flex flex-wrap gap-5 border-t border-border pt-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.published !== false} onChange={(event) => set("published", event.target.checked)} /> Published on storefront</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.featured === true} onChange={(event) => set("featured", event.target.checked)} /> Featured product</label></div><button disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50"><Save className="size-4" /> {busy ? "Saving product…" : "Save product"}</button></form>;
}

function ProductCrudPage() {
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [categories, setCategories] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  async function load() {
    try {
      const [productItems, categoryItems] = await Promise.all([api("/api/admin/products"), api("/api/admin/categories")]);
      setProducts(productItems);
      setCategories(categoryItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load products.");
    }
  }
  useEffect(() => { void load(); }, []);

  const categoryOptions = useMemo(() => {
    const options = new Map<string, string>();
    categories.forEach((category) => {
      const slug = String(category.slug ?? "").trim();
      if (slug && !category.parentSlug) options.set(slug, String(category.label ?? category.name ?? slug));
    });
    products.forEach((product) => {
      const slug = String(product.category ?? "").trim();
      if (slug && !options.has(slug)) options.set(slug, slug);
    });
    return [...options.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, products]);
  const categoryName = (slug: unknown) => categoryOptions.find((category) => category.value === String(slug))?.label ?? String(slug ?? "Unassigned");
  const visible = products.filter((product) => {
    const query = search.trim().toLowerCase();
    const stock = Number(product.stock ?? 0);
    const searchable = [product.name, product.id, product.fabric, product.category, categoryName(product.category)].map((value) => String(value ?? "").toLowerCase()).join(" ");
    return (!query || searchable.includes(query))
      && (categoryFilter === "all" || String(product.category ?? "") === categoryFilter)
      && (stockFilter === "all" || (stockFilter === "in-stock" && stock > 0) || (stockFilter === "low-stock" && stock > 0 && stock <= 3) || (stockFilter === "out-of-stock" && stock === 0));
  });

  async function remove(product: RecordItem) {
    if (!product._id || !window.confirm(`Delete ${String(product.name ?? product.id ?? "this product")}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/products/${product._id}`, { method: "DELETE" });
      await load();
      toast.success("Product deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete product.");
    }
  }

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{visible.length === products.length ? `${products.length} products` : `Showing ${visible.length} of ${products.length} products`}</p><h2 className="mt-1 font-display text-3xl text-primary">Products & stock</h2><p className="mt-2 text-sm text-muted-foreground">Live product records from your catalog.</p></div><button type="button" onClick={() => setEditing({ ...emptyByResource.products })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add new</button></div>
    {editing ? <div className="mt-7 max-w-4xl"><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to products</button><SimpleProductEditor initial={editing} categories={categories.filter((category) => !category.parentSlug)} onDone={() => { setEditing(null); void load(); }} /></div> : <><div className="mt-7 border border-[#ded5c9] bg-white p-5"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-gold"><SlidersHorizontal className="size-3.5" /> Live catalog filters</div><div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_190px_190px_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, fabric…" className="border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="all">All existing categories</option>{categoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="all">All stock levels</option><option value="in-stock">In stock</option><option value="low-stock">Low stock (1–3)</option><option value="out-of-stock">Out of stock</option></select><button type="button" onClick={() => { setSearch(""); setCategoryFilter("all"); setStockFilter("all"); }} className="border border-border px-4 py-2.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">Clear</button></div></div><div className="mt-4 grid gap-3">{visible.length === 0 ? <div className="border border-dashed border-[#cfc3b5] bg-white p-10 text-center text-sm text-muted-foreground">No live products match these filters.</div> : visible.map((product) => <div key={product._id} className="flex flex-wrap items-center gap-4 border border-[#ded5c9] bg-white p-4"><div className="size-16 shrink-0 overflow-hidden bg-[#f0e9df]">{product.image && <img src={String(product.image)} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-48 flex-1"><p className="font-medium text-primary">{String(product.name ?? product.id)}</p><p className="mt-1 text-xs text-muted-foreground">Category: <strong className="font-medium text-primary">{categoryName(product.category)}</strong></p><p className="mt-1 text-xs text-muted-foreground">₹{Number(product.price ?? 0).toLocaleString("en-IN")} · Stock {Number(product.stock ?? 0)}</p></div><span className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${Number(product.stock ?? 0) === 0 ? "border-red-200 bg-red-50 text-red-700" : Number(product.stock ?? 0) <= 3 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{Number(product.stock ?? 0) === 0 ? "Out of stock" : Number(product.stock ?? 0) <= 3 ? "Low stock" : "In stock"}</span><button type="button" onClick={() => setEditing({ ...product })} className="border border-border px-3 py-2 text-xs text-primary hover:border-primary">Edit</button><button type="button" onClick={() => void remove(product)} className="p-2 text-muted-foreground hover:text-red-700" aria-label={`Delete ${String(product.name ?? product.id)}`}><Trash2 className="size-4" /></button></div>)}</div></>}</div>;
}

function CategoryCrudPage() {
  const [categories, setCategories] = useState<RecordItem[]>([]);
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  async function load() {
    try {
      const [categoryItems, productItems] = await Promise.all([api("/api/admin/categories"), api("/api/admin/products")]);
      setCategories(categoryItems);
      setProducts(productItems);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load categories."); }
  }
  useEffect(() => { void load(); }, []);
  async function remove(category: RecordItem) {
    if (!category._id || !window.confirm(`Delete ${String(category.label ?? category.slug ?? "this category")}? This cannot be undone.`)) return;
    try { await api(`/api/admin/categories/${category._id}`, { method: "DELETE" }); await load(); toast.success("Category deleted."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete category."); }
  }
  const parents = categories.filter((category) => !category.parentSlug);
  return <div>
    {editing ? <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to categories</button><div className="max-w-xl"><Editor resource="categories" initial={editing} onDone={() => { setEditing(null); void load(); }} /></div></div> : <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{parents.length} main categories · {categories.length} total records</p><h2 className="mt-1 font-display text-3xl text-primary">Category management</h2><p className="mt-2 text-sm text-muted-foreground">Live categories and subcategories from your catalog.</p></div><button type="button" onClick={() => setEditing({ ...emptyByResource.categories })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add category</button></div><div className="mt-7 space-y-3">{parents.map((category) => { const slug = String(category.slug ?? ""); const children = categories.filter((item) => String(item.parentSlug ?? "") === slug); const assigned = products.filter((product) => String(product.category ?? "") === slug); return <section key={category._id ?? slug} className="border border-[#ded5c9] bg-white p-4"><div className="flex flex-wrap items-center gap-4">{category.image ? <img src={String(category.image)} alt="" className="size-14 object-cover" /> : <div className="size-14 bg-[#f0e9df]" />}<div className="min-w-0 flex-1"><h3 className="font-medium text-primary">{String(category.label ?? slug)}</h3><p className="mt-1 text-xs text-muted-foreground">{children.length} subcategor{children.length === 1 ? "y" : "ies"} · {assigned.length} product{assigned.length === 1 ? "" : "s"}</p></div><button type="button" onClick={() => setEditing({ ...category })} className="border border-border px-3 py-2 text-xs text-primary">Edit</button><button type="button" onClick={() => setEditing({ label: "", slug: "", parentSlug: slug, description: "", image: "", order: children.length, published: true })} className="inline-flex items-center gap-1 border border-primary px-3 py-2 text-xs text-primary"><Plus className="size-3.5" /> Add subcategory</button><button type="button" onClick={() => void remove(category)} className="p-2 text-muted-foreground hover:text-red-700" aria-label={`Delete ${String(category.label ?? slug)}`}><Trash2 className="size-4" /></button></div>{children.length > 0 && <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">{children.map((child) => <div key={child._id} className="flex items-center gap-3 bg-[#fbf9f6] p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-primary">{String(child.label ?? child.slug)}</p><p className="mt-1 text-xs text-muted-foreground">{products.filter((product) => String(product.subcategory ?? "") === String(child.slug)).length} products</p></div><button type="button" onClick={() => setEditing({ ...child })} className="text-xs text-primary hover:underline">Edit</button><button type="button" onClick={() => void remove(child)} className="p-1.5 text-muted-foreground hover:text-red-700" aria-label={`Delete ${String(child.label ?? child.slug)}`}><Trash2 className="size-3.5" /></button></div>)}</div>}</section>; })}</div></>}</div>;
}

function ProductViewPanel({ product, categoryName, onClose }: { product: RecordItem; categoryName: (value: unknown) => string; onClose: () => void }) {
  const images = Array.isArray(product.images) && product.images.length ? product.images : [product.image];
  return <div className="border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between gap-4 border-b border-border pb-5"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Product details</p><h2 className="mt-1 font-display text-3xl text-primary">{String(product.name ?? product.id)}</h2><p className="mt-1 text-xs text-muted-foreground">{String(product.id ?? "No product ID")}</p></div><button type="button" onClick={onClose} className="text-sm text-primary hover:underline">← Back</button></div><div className="mt-6 grid gap-6 lg:grid-cols-[minmax(260px,380px)_1fr]"><div className="grid grid-cols-2 gap-3">{images.filter(Boolean).map((image, index) => <div key={`${String(image)}-${index}`} className="aspect-[3/4] overflow-hidden bg-[#f4efe8]"><img src={String(image)} alt={`${String(product.name ?? "Product")} image ${index + 1}`} className="h-full w-full object-cover" /></div>)}</div><div><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Price</p><p className="mt-1 text-lg font-medium text-primary">₹{Number(product.price ?? 0).toLocaleString("en-IN")}</p></div><div><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Stock</p><p className="mt-1 text-lg font-medium text-primary">{Number(product.stock ?? 0)}</p></div><div><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Category</p><p className="mt-1 text-sm text-primary">{categoryName(product.category)}</p></div><div><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Subcategory</p><p className="mt-1 text-sm text-primary">{String(product.subcategory ?? "—")}</p></div><div><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Fabric</p><p className="mt-1 text-sm text-primary">{String(product.fabric ?? "—")}</p></div><div><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Visibility</p><p className="mt-1 text-sm text-primary">{product.published === false ? "Draft" : "Published"}</p></div></div><div className="mt-6 border-t border-border pt-5"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Description</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{String(product.description ?? "No description added.")}</p></div></div></div></div>;
}

function ProductViewCrudPage() {
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [categories, setCategories] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [viewing, setViewing] = useState<RecordItem | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  async function load() { try { const [productItems, categoryItems] = await Promise.all([api("/api/admin/products"), api("/api/admin/categories")]); setProducts(productItems); setCategories(categoryItems); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load products."); } }
  useEffect(() => { void load(); }, []);
  const categoryParents = useMemo(() => categories.filter((category) => !category.parentSlug).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)), [categories]);
  const childrenFor = (parentSlug: string) => categories.filter((category) => String(category.parentSlug ?? "") === parentSlug).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const categoryOptions = useMemo(() => categoryParents.flatMap((parent) => {
    const parentSlug = String(parent.slug ?? "");
    const parentLabel = String(parent.label ?? parent.name ?? parentSlug);
    return [
      { value: `parent:${parentSlug}`, label: `${parentLabel} (all)` },
      ...childrenFor(parentSlug).map((child) => ({ value: `child:${String(child.slug ?? "")}`, label: `↳ ${String(child.label ?? child.name ?? child.slug)}` })),
    ];
  }), [categoryParents, categories]);
  const categoryBySlug = useMemo(() => new Map(categories.map((category) => [String(category.slug ?? ""), String(category.label ?? category.name ?? category.slug ?? "")])), [categories]);
  const categoryName = (value: unknown) => categoryBySlug.get(String(value ?? "")) ?? String(value ?? "Unassigned");
  const visible = products.filter((product) => { const query = search.trim().toLowerCase(); const stock = Number(product.stock ?? 0); const selectedCategory = categoryFilter.startsWith("parent:") ? String(product.category ?? "") === categoryFilter.slice(7) : categoryFilter.startsWith("child:") ? String(product.subcategory ?? "") === categoryFilter.slice(6) : true; return (!query || [product.name, product.id, product.fabric, product.category, product.subcategory, categoryName(product.category), categoryName(product.subcategory)].map((value) => String(value ?? "").toLowerCase()).join(" ").includes(query)) && selectedCategory && (stockFilter === "all" || (stockFilter === "in-stock" && stock > 0) || (stockFilter === "low-stock" && stock > 0 && stock <= 3) || (stockFilter === "out-of-stock" && stock === 0)); });
  async function remove(product: RecordItem) { if (!product._id || !window.confirm(`Delete ${String(product.name ?? product.id ?? "this product")}? This cannot be undone.`)) return; try { await api(`/api/admin/products/${product._id}`, { method: "DELETE" }); await load(); toast.success("Product deleted."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete product."); } }
  if (viewing) return <ProductViewPanel product={viewing} categoryName={categoryName} onClose={() => setViewing(null)} />;
  if (editing) return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to products</button><div className="max-w-4xl"><SimpleProductEditor initial={editing} categories={categories} onDone={() => { setEditing(null); void load(); }} /></div></div>;
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{visible.length === products.length ? `${products.length} products` : `Showing ${visible.length} of ${products.length} products`}</p><h2 className="mt-1 font-display text-3xl text-primary">Products & stock</h2><p className="mt-2 text-sm text-muted-foreground">Live product records from your catalog.</p></div><button type="button" onClick={() => setEditing({ ...emptyByResource.products })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add new</button></div><div className="mt-7 border border-[#ded5c9] bg-white p-5"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-gold"><SlidersHorizontal className="size-3.5" /> Live catalog filters</div><div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_190px_190px_auto]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, fabric…" className="border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="all">All existing categories</option>{categoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="all">All stock levels</option><option value="in-stock">In stock</option><option value="low-stock">Low stock (1–3)</option><option value="out-of-stock">Out of stock</option></select><button type="button" onClick={() => { setSearch(""); setCategoryFilter("all"); setStockFilter("all"); }} className="border border-border px-4 py-2.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">Clear</button></div></div><div className="mt-4 grid gap-3">{visible.length === 0 ? <div className="border border-dashed border-[#cfc3b5] bg-white p-10 text-center text-sm text-muted-foreground">No live products match these filters.</div> : visible.map((product) => <div key={product._id} className="flex flex-wrap items-center gap-4 border border-[#ded5c9] bg-white p-4"><button type="button" onClick={() => setViewing(product)} className="size-16 shrink-0 overflow-hidden bg-[#f0e9df]" aria-label={`View ${String(product.name ?? product.id)}`}><img src={String(product.image ?? "")} alt="" className="h-full w-full object-cover" /></button><div className="min-w-48 flex-1"><button type="button" onClick={() => setViewing(product)} className="text-left font-medium text-primary hover:underline">{String(product.name ?? product.id)}</button><p className="mt-1 text-xs text-muted-foreground">Category: <strong className="font-medium text-primary">{categoryName(product.category)}</strong></p><p className="mt-1 text-xs text-muted-foreground">₹{Number(product.price ?? 0).toLocaleString("en-IN")} · Stock {Number(product.stock ?? 0)}</p></div><span className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${Number(product.stock ?? 0) === 0 ? "border-red-200 bg-red-50 text-red-700" : Number(product.stock ?? 0) <= 3 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{Number(product.stock ?? 0) === 0 ? "Out of stock" : Number(product.stock ?? 0) <= 3 ? "Low stock" : "In stock"}</span><button type="button" onClick={() => setViewing(product)} className="border border-primary px-3 py-2 text-xs text-primary hover:bg-primary hover:text-white">View</button><button type="button" onClick={() => setEditing({ ...product })} className="border border-border px-3 py-2 text-xs text-primary hover:border-primary">Edit</button><button type="button" onClick={() => void remove(product)} className="p-2 text-muted-foreground hover:text-red-700" aria-label={`Delete ${String(product.name ?? product.id)}`}><Trash2 className="size-4" /></button></div>)}</div></div>;
}

function CategoryViewPanel({ category, categories, products, onClose }: { category: RecordItem; categories: RecordItem[]; products: RecordItem[]; onClose: () => void }) {
  const slug = String(category.slug ?? "");
  const children = categories.filter((item) => String(item.parentSlug ?? "") === slug);
  const assigned = products.filter((product) => String(product.category ?? "") === slug);
  return <div className="border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between gap-4 border-b border-border pb-5"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Category details</p><h2 className="mt-1 font-display text-3xl text-primary">{String(category.label ?? slug)}</h2><p className="mt-1 text-xs text-muted-foreground">{slug}</p></div><button type="button" onClick={onClose} className="text-sm text-primary hover:underline">← Back</button></div><div className="mt-6 grid gap-5 sm:grid-cols-3"><div className="bg-[#fbf9f6] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Status</p><p className="mt-2 text-sm text-primary">{category.published === false ? "Draft" : "Published"}</p></div><div className="bg-[#fbf9f6] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Subcategories</p><p className="mt-2 text-sm text-primary">{children.length}</p></div><div className="bg-[#fbf9f6] p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Assigned products</p><p className="mt-2 text-sm text-primary">{assigned.length}</p></div></div><div className="mt-6 border-t border-border pt-5"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Description</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{String(category.description ?? "No description added.")}</p></div>{children.length > 0 && <div className="mt-6 border-t border-border pt-5"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Subcategories</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{children.map((child) => <div key={child._id} className="border border-border bg-[#fbf9f6] p-3"><p className="font-medium text-primary">{String(child.label ?? child.slug)}</p><p className="mt-1 text-xs text-muted-foreground">{String(child.slug)}</p></div>)}</div></div>}{assigned.length > 0 && <div className="mt-6 border-t border-border pt-5"><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Products in this category</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{assigned.map((product) => <div key={product._id} className="flex items-center gap-3 border border-border p-3"><div className="size-10 overflow-hidden bg-[#f4efe8]"><img src={String(product.image ?? "")} alt="" className="h-full w-full object-cover" /></div><div className="min-w-0"><p className="truncate text-sm font-medium text-primary">{String(product.name ?? product.id)}</p><p className="mt-1 text-xs text-muted-foreground">Stock {Number(product.stock ?? 0)}</p></div></div>)}</div></div>}</div>;
}

function CategoryViewCrudPage() {
  const [categories, setCategories] = useState<RecordItem[]>([]);
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [viewing, setViewing] = useState<RecordItem | null>(null);
  async function load() { try { const [categoryItems, productItems] = await Promise.all([api("/api/admin/categories"), api("/api/admin/products")]); setCategories(categoryItems); setProducts(productItems); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load categories."); } }
  useEffect(() => { void load(); }, []);
  async function remove(category: RecordItem) { if (!category._id || !window.confirm(`Delete ${String(category.label ?? category.slug ?? "this category")}? This cannot be undone.`)) return; try { await api(`/api/admin/categories/${category._id}`, { method: "DELETE" }); await load(); toast.success("Category deleted."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete category."); } }
  if (viewing) return <CategoryViewPanel category={viewing} categories={categories} products={products} onClose={() => setViewing(null)} />;
  if (editing) return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to categories</button><div className="max-w-xl"><Editor resource="categories" initial={editing} onDone={() => { setEditing(null); void load(); }} /></div></div>;
  const parents = categories.filter((category) => !category.parentSlug);
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{parents.length} main categories · {categories.length} total records</p><h2 className="mt-1 font-display text-3xl text-primary">Category management</h2><p className="mt-2 text-sm text-muted-foreground">Live categories and subcategories from your catalog.</p></div><button type="button" onClick={() => setEditing({ ...emptyByResource.categories })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add category</button></div><div className="mt-7 space-y-3">{parents.map((category) => { const slug = String(category.slug ?? ""); const children = categories.filter((item) => String(item.parentSlug ?? "") === slug); const assigned = products.filter((product) => String(product.category ?? "") === slug); return <section key={category._id ?? slug} className="border border-[#ded5c9] bg-white p-4"><div className="flex flex-wrap items-center gap-4"><button type="button" onClick={() => setViewing(category)} className="size-14 shrink-0 overflow-hidden bg-[#f0e9df]" aria-label={`View ${String(category.label ?? slug)}`}>{category.image && <img src={String(category.image)} alt="" className="h-full w-full object-cover" />}</button><div className="min-w-0 flex-1"><button type="button" onClick={() => setViewing(category)} className="text-left font-medium text-primary hover:underline">{String(category.label ?? slug)}</button><p className="mt-1 text-xs text-muted-foreground">{children.length} subcategor{children.length === 1 ? "y" : "ies"} · {assigned.length} product{assigned.length === 1 ? "" : "s"}</p></div><button type="button" onClick={() => setViewing(category)} className="border border-primary px-3 py-2 text-xs text-primary hover:bg-primary hover:text-white">View</button><button type="button" onClick={() => setEditing({ ...category })} className="border border-border px-3 py-2 text-xs text-primary">Edit</button><button type="button" onClick={() => setEditing({ label: "", slug: "", parentSlug: slug, description: "", image: "", order: children.length, published: true })} className="inline-flex items-center gap-1 border border-primary px-3 py-2 text-xs text-primary"><Plus className="size-3.5" /> Add subcategory</button><button type="button" onClick={() => void remove(category)} className="p-2 text-muted-foreground hover:text-red-700" aria-label={`Delete ${String(category.label ?? slug)}`}><Trash2 className="size-4" /></button></div>{children.length > 0 && <div className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">{children.map((child) => <div key={child._id} className="flex items-center gap-3 bg-[#fbf9f6] p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-primary">{String(child.label ?? child.slug)}</p><p className="mt-1 text-xs text-muted-foreground">{products.filter((product) => String(product.subcategory ?? "") === String(child.slug)).length} products</p></div><button type="button" onClick={() => setViewing(child)} className="text-xs text-primary hover:underline">View</button><button type="button" onClick={() => setEditing({ ...child })} className="text-xs text-primary hover:underline">Edit</button><button type="button" onClick={() => void remove(child)} className="p-1.5 text-muted-foreground hover:text-red-700" aria-label={`Delete ${String(child.label ?? child.slug)}`}><Trash2 className="size-3.5" /></button></div>)}</div>}</section>; })}</div></div>;
}

function SortableCategoryPage() {
  const [categories, setCategories] = useState<RecordItem[]>([]);
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [viewing, setViewing] = useState<RecordItem | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  async function load() {
    try { const [categoryItems, productItems] = await Promise.all([api("/api/admin/categories"), api("/api/admin/products")]); setCategories(categoryItems); setProducts(productItems); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load categories."); }
  }
  useEffect(() => { void load(); }, []);
  const parents = useMemo(() => categories.filter((category) => !category.parentSlug).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)), [categories]);
  const childrenFor = (parentSlug: string) => categories.filter((category) => String(category.parentSlug ?? "") === parentSlug).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  function startDrag(id: string, group: string) { setDraggedId(id); setDraggedGroup(group); }
  async function drop(targetId: string, group: string) {
    if (!draggedId || draggedGroup !== group || draggedId === targetId) { setDraggedId(null); setDraggedGroup(null); setDragOverId(null); return; }
    const source = group === "__parents" ? parents : childrenFor(group);
    const ordered = reorderItems(source, draggedId, targetId);
    setDraggedId(null); setDraggedGroup(null); setDragOverId(null); setSavingOrder(true);
    try {
      const updated = await api("/api/admin/categories/reorder", { method: "PUT", body: JSON.stringify({ ids: ordered.map((item) => item._id).filter(Boolean) }) });
      setCategories(updated);
      toast.success("Category order saved.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save category order."); await load(); }
    finally { setSavingOrder(false); }
  }
  async function remove(category: RecordItem) {
    if (!category._id || !window.confirm(`Delete ${String(category.label ?? category.slug ?? "this category")}? This cannot be undone.`)) return;
    try { await api(`/api/admin/categories/${category._id}`, { method: "DELETE" }); await load(); toast.success("Category deleted."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete category."); }
  }
  if (viewing) return <CategoryViewPanel category={viewing} categories={categories} products={products} onClose={() => setViewing(null)} />;
  if (editing) return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to categories</button><div className="max-w-xl"><Editor resource="categories" initial={editing} onDone={() => { setEditing(null); void load(); }} /></div></div>;
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{parents.length} main categories · {categories.length} total records</p><h2 className="mt-1 font-display text-3xl text-primary">Category management</h2><p className="mt-2 text-sm text-muted-foreground">Drag the handle to set the storefront sequence.{savingOrder && " Saving order…"}</p></div><button type="button" onClick={() => setEditing({ ...emptyByResource.categories })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add category</button></div><div className="mt-7 space-y-3">{parents.map((category) => { const slug = String(category.slug ?? ""); const children = childrenFor(slug); const assigned = products.filter((product) => String(product.category ?? "") === slug || String(product.subcategory ?? "") === slug); return <section key={category._id ?? slug} draggable onDragStart={() => startDrag(category._id ?? "", "__parents")} onDragOver={(event) => { if (draggedGroup === "__parents") { event.preventDefault(); setDragOverId(category._id ?? null); } }} onDragLeave={() => setDragOverId(null)} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); void drop(category._id ?? "", "__parents"); }} onDragEnd={() => { setDraggedId(null); setDraggedGroup(null); setDragOverId(null); }} className={`border bg-white transition-colors ${dragOverId === category._id ? "border-gold bg-gold/5" : "border-[#ded5c9]"} ${draggedId === category._id ? "opacity-50" : ""}`}><div className="flex flex-wrap items-center gap-4 p-4"><button type="button" draggable aria-label={`Drag ${String(category.label ?? slug)} to reorder`} className="cursor-grab text-muted-foreground active:cursor-grabbing"><GripVertical className="size-5" /></button>{category.image ? <img src={String(category.image)} alt="" className="size-14 shrink-0 object-cover" /> : <div className="size-14 shrink-0 bg-[#f0e9df]" />}<div className="min-w-0 flex-1"><button type="button" onClick={() => setViewing(category)} className="text-left font-medium text-primary hover:underline">{String(category.label ?? slug)}</button><p className="mt-1 text-xs text-muted-foreground">{children.length} subcategor{children.length === 1 ? "y" : "ies"} · {assigned.length} product{assigned.length === 1 ? "" : "s"}</p></div><button type="button" onClick={() => setViewing(category)} className="border border-primary px-3 py-2 text-xs text-primary hover:bg-primary hover:text-white">View</button><button type="button" onClick={() => setEditing({ ...category })} className="border border-border px-3 py-2 text-xs text-primary">Edit</button><button type="button" onClick={() => setEditing({ label: "", slug: "", parentSlug: slug, description: "", image: "", order: children.length, published: true })} className="inline-flex items-center gap-1 border border-primary px-3 py-2 text-xs text-primary"><Plus className="size-3.5" /> Add subcategory</button><button type="button" onClick={() => void remove(category)} className="p-2 text-muted-foreground hover:text-red-700" aria-label={`Delete ${String(category.label ?? slug)}`}><Trash2 className="size-4" /></button></div>{children.length > 0 && <div className="border-t border-border bg-[#fbf9f6] p-4"><div className="grid gap-2 sm:grid-cols-2">{children.map((child) => <div key={child._id} draggable onDragStart={(event) => { event.stopPropagation(); startDrag(child._id ?? "", slug); }} onDragOver={(event) => { event.stopPropagation(); if (draggedGroup === slug) { event.preventDefault(); setDragOverId(child._id ?? null); } }} onDragLeave={() => setDragOverId(null)} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); void drop(child._id ?? "", slug); }} onDragEnd={() => { setDraggedId(null); setDraggedGroup(null); setDragOverId(null); }} className={`flex items-center gap-3 border bg-white p-3 transition-colors ${dragOverId === child._id ? "border-gold bg-gold/5" : "border-border"} ${draggedId === child._id ? "opacity-50" : ""}`}><button type="button" draggable aria-label={`Drag ${String(child.label ?? child.slug)} to reorder`} className="cursor-grab text-muted-foreground active:cursor-grabbing"><GripVertical className="size-4" /></button><div className="min-w-0 flex-1"><button type="button" onClick={() => setViewing(child)} className="truncate text-left text-sm font-medium text-primary hover:underline">{String(child.label ?? child.slug)}</button><p className="mt-1 text-xs text-muted-foreground">{products.filter((product) => String(product.subcategory ?? "") === String(child.slug)).length} products</p></div><button type="button" onClick={() => setEditing({ ...child })} className="text-xs text-primary hover:underline">Edit</button><button type="button" onClick={() => void remove(child)} className="p-1.5 text-muted-foreground hover:text-red-700" aria-label={`Delete ${String(child.label ?? child.slug)}`}><Trash2 className="size-3.5" /></button></div>)}</div></div>}</section>; })}</div></div>;
}

function AnnouncementCrudPage() {
  const [items, setItems] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  async function load() { try { setItems(await api("/api/admin/announcements")); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load announcements."); } }
  useEffect(() => { void load(); }, []);
  async function toggle(item: RecordItem) { try { const { _id, ...payload } = item; await api(`/api/admin/announcements/${_id}`, { method: "PUT", body: JSON.stringify({ ...payload, active: item.active !== true }) }); await load(); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update announcement."); } }
  async function remove(item: RecordItem) {
    if (!item._id || !window.confirm("Delete this announcement? This cannot be undone.")) return;
    try { await api(`/api/admin/announcements/${item._id}`, { method: "DELETE" }); await load(); toast.success("Announcement deleted."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete announcement."); }
  }
  const preview = items.find((item) => item.active === true)?.message ?? "Welcome to Bawari Banno";
  return <div className="max-w-5xl">
    {editing ? <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to announcements</button><Editor resource="announcements" initial={editing} onDone={() => { setEditing(null); void load(); }} /></div> : <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{items.length} records</p><h2 className="mt-1 font-display text-3xl text-primary">Announcement bar</h2><p className="mt-2 text-sm text-muted-foreground">Manage live storefront messages.</p></div><button type="button" onClick={() => setEditing({ ...emptyByResource.announcements })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add new</button></div><section className="mt-6 border border-[#ded5c9] bg-white p-5"><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Live preview</p><div className="mt-3 bg-primary px-4 py-3 text-center text-xs text-white">{String(preview)}</div></section><div className="mt-5 divide-y divide-border border border-[#ded5c9] bg-white">{items.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No announcements yet.</p> : items.map((item) => <div key={item._id} className="flex flex-wrap items-center gap-3 p-4"><p className={`min-w-48 flex-1 text-sm ${item.active === false ? "text-muted-foreground line-through" : "text-foreground"}`}>{String(item.message ?? "")}</p><button type="button" onClick={() => void toggle(item)} className="text-xs text-muted-foreground">{item.active === false ? "Inactive" : "Active"}</button><button type="button" onClick={() => setEditing({ ...item })} className="border border-border px-3 py-2 text-xs text-primary">Edit</button><button type="button" onClick={() => void remove(item)} className="p-2 text-muted-foreground hover:text-red-700" aria-label="Delete announcement"><Trash2 className="size-4" /></button></div>)}</div></>}</div>;
}

function SettingsCrudPage() {
  const [form, setForm] = useState({ shippingCharges: 250, freeShippingThreshold: 15000 });
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const data = await api("/api/admin/settings");
      setForm({ shippingCharges: Number(data.shippingCharges ?? 250), freeShippingThreshold: Number(data.freeShippingThreshold ?? 15000) });
      setConfigured(data.configured === true);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load settings."); }
  }
  useEffect(() => { void load(); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await api(`/api/admin/settings`, { method: configured ? "PUT" : "POST", body: JSON.stringify(form) }); setConfigured(true); toast.success("Store settings saved."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save settings."); }
    finally { setBusy(false); }
  }
  async function reset() {
    if (!window.confirm("Delete the saved settings record and restore defaults?")) return;
    try { const data = await api("/api/admin/settings", { method: "DELETE" }); setForm({ shippingCharges: Number(data.shippingCharges), freeShippingThreshold: Number(data.freeShippingThreshold) }); setConfigured(false); toast.success("Settings reset to defaults."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not reset settings."); }
  }
  return <form onSubmit={save} className="max-w-2xl border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-gold">Singleton store record</p><h2 className="mt-2 font-display text-3xl text-primary">Shipping settings</h2><p className="mt-2 text-sm text-muted-foreground">{configured ? "Edit the saved checkout configuration." : "No saved settings record exists yet. Create one below."}</p></div>{configured && <button type="button" onClick={() => void reset()} className="text-xs text-red-700 hover:underline">Delete / reset</button>}</div><label className="mt-7 block text-xs text-muted-foreground">Shipping charge (₹)<input type="number" min="0" value={form.shippingCharges} onChange={(event) => setForm({ ...form, shippingCharges: Number(event.target.value) })} className="mt-2 w-full border border-border px-3 py-3 text-sm outline-none focus:border-gold" /></label><label className="mt-5 block text-xs text-muted-foreground">Free shipping threshold (₹)<input type="number" min="0" value={form.freeShippingThreshold} onChange={(event) => setForm({ ...form, freeShippingThreshold: Number(event.target.value) })} className="mt-2 w-full border border-border px-3 py-3 text-sm outline-none focus:border-gold" /></label><button disabled={busy} className="mt-6 bg-primary px-5 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving…" : configured ? "Save settings" : "Create settings record"}</button></form>;
}

function CustomerEditor({ initial, onDone }: { initial: CustomerRecord; onDone: () => void }) {
  const [form, setForm] = useState({ name: String(initial.name ?? ""), email: String(initial.email ?? ""), phone: String(initial.phone ?? "") });
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await api(`/api/admin/customers${initial._id ? `/${initial._id}` : ""}`, { method: initial._id ? "PUT" : "POST", body: JSON.stringify(form) });
      toast.success("Customer saved."); onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save customer."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Customer record</p><h3 className="mt-1 font-display text-2xl text-primary">{initial._id ? "Edit customer" : "Add customer"}</h3></div><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground">Email address<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Mobile number<input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "") })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label></div><button disabled={busy} className="mt-6 w-full bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving…" : "Save customer"}</button></form>;
}

function CustomerManagementPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selected, setSelected] = useState<{ customer: CustomerRecord; orders: CustomerOrder[] } | null>(null);
  const [editing, setEditing] = useState<CustomerRecord | null>(null);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [state, setState] = useState("all");
  const [activity, setActivity] = useState("all");
  const [paid, setPaid] = useState("all");
  const [sortField, setSortField] = useState("joined");
  const [sortDirection, setSortDirection] = useState("newest");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, city: city === "all" ? "" : city, state: state === "all" ? "" : state, activity, paid, sortField, sortDirection });
      setCustomers(await api(`/api/admin/customers?${params}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [search, city, state, activity, paid, sortField, sortDirection]);

  async function openCustomer(id: string) {
    try {
      setSelected(await api(`/api/admin/customers/${id}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load customer.");
    }
  }

  async function remove(customer: CustomerRecord) {
    if (!customer._id || !window.confirm(`Delete ${String(customer.name ?? "this customer")}? Existing orders will be kept.`)) return;
    try {
      await api(`/api/admin/customers/${customer._id}`, { method: "DELETE" });
      setSelected(null);
      await load();
      toast.success("Customer deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete customer.");
    }
  }

  function clearFilters() {
    setSearch("");
    setCity("all");
    setState("all");
    setActivity("all");
    setPaid("all");
    setSortField("joined");
    setSortDirection("newest");
  }

  const cities = [...new Set(customers.map((customer) => customer.city).filter(Boolean) as string[])].sort();
  const states = [...new Set(customers.map((customer) => customer.state).filter(Boolean) as string[])].sort();
  const stats = customers[0]?.customerStats ?? {
    orders: customers.reduce((sum, customer) => sum + Number(customer.orderCount ?? 0), 0),
    revenue: customers.reduce((sum, customer) => sum + Number(customer.orderTotal ?? 0), 0),
  };
  const wishlistCount = customers.reduce((sum, customer) => sum + Number(customer.wishlistCount ?? customer.wishlist?.length ?? 0), 0);

  if (editing) {
    return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to customers</button><div className="max-w-xl"><CustomerEditor initial={editing} onDone={() => { setEditing(null); void load(); }} /></div></div>;
  }

  if (selected) {
    const detailWishlistCount = selected.customer.wishlist?.length ?? selected.customer.wishlistCount ?? 0;
    return <div>
      <button type="button" onClick={() => setSelected(null)} className="mb-5 text-sm text-primary hover:underline">← Back to customers</button>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Customer profile</p><h2 className="mt-1 font-display text-3xl text-primary">{selected.customer.name || "Unnamed customer"}</h2><p className="mt-2 text-sm text-muted-foreground">Customer details, activity, and purchase history.</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => setEditing(selected.customer)} className="border border-primary px-4 py-2.5 text-xs text-primary hover:bg-primary hover:text-white">Edit customer</button><button type="button" onClick={() => void remove(selected.customer)} className="border border-red-200 px-4 py-2.5 text-xs text-red-700 hover:bg-red-50">Delete</button></div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total orders" value={selected.orders.length} icon={ShoppingCart} /><MetricCard label="Total spent" value={`₹${selected.orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0).toLocaleString("en-IN")}`} icon={BarChart3} /><MetricCard label="Wishlist items" value={detailWishlistCount} icon={Heart} /><MetricCard label="Last activity" value={customerRelativeDate(selected.customer.lastActivity)} icon={UserCheck} /></div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr]">
        <section className="border border-[#ded5c9] bg-white p-6"><div className="flex size-14 items-center justify-center rounded-full bg-primary text-xl text-white">{(selected.customer.name || "BB").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><h3 className="mt-4 font-display text-2xl text-primary">{selected.customer.name || "Unnamed customer"}</h3><p className="mt-2 text-sm text-muted-foreground">{selected.customer.email || "Email not provided"}</p><p className="mt-1 text-sm text-muted-foreground">+91 {selected.customer.phone || "Phone not provided"}</p><div className="mt-5 space-y-2 border-t border-border pt-5 text-sm"><p><span className="text-muted-foreground">Location:</span> {selected.customer.city || selected.customer.state ? [selected.customer.city, selected.customer.state].filter(Boolean).join(", ") : "Not provided"}</p><p><span className="text-muted-foreground">Joined:</span> {customerDate(selected.customer.createdAt)}</p><p><span className="text-muted-foreground">Last activity:</span> {customerRelativeDate(selected.customer.lastActivity)}</p><p><span className="text-muted-foreground">Phone:</span> {selected.customer.verified ? "Verified" : "Not verified"}</p></div></section>
        <section className="border border-[#ded5c9] bg-white p-6"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Purchase history</p><h3 className="mt-1 font-display text-2xl text-primary">Customer orders</h3></div><p className="text-sm text-muted-foreground">{selected.orders.length} order{selected.orders.length === 1 ? "" : "s"}</p></div>{selected.orders.length === 0 ? <p className="mt-8 border-t border-border pt-8 text-sm text-muted-foreground">No purchases yet.</p> : <div className="mt-5 divide-y divide-border border-y border-border">{selected.orders.map((order, index) => <div key={`${order.orderId ?? "order"}-${index}`} className="flex flex-wrap items-center gap-4 py-4"><div className="min-w-40 flex-1"><p className="font-medium text-primary">{order.orderId || "Order"}</p><p className="mt-1 text-xs text-muted-foreground">{customerDate(order.createdAt)}</p></div><p className="text-sm">{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} item(s)</p><p className="text-sm font-medium">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</p><span className={`border px-2 py-1 text-xs capitalize ${statusBadge(order.status)}`}>{titleCase(order.status)}</span></div>)}</div>}</section>
      </div>
    </div>;
  }

  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-gold">Customer operations</p><h2 className="mt-1 font-display text-3xl text-primary">Customer Management</h2><p className="mt-2 text-sm text-muted-foreground">View and manage customer information.</p></div><button type="button" onClick={() => setEditing({ name: "", email: "", phone: "" })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add customer</button></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total customers" value={customers.length} icon={Users} /><MetricCard label="Total orders" value={stats.orders} icon={ShoppingCart} /><MetricCard label="Total revenue" value={`₹${Number(stats.revenue).toLocaleString("en-IN")}`} icon={BarChart3} /><MetricCard label="Wishlists" value={wishlistCount} icon={Heart} /></div>
    <section className="mt-6 border border-[#ded5c9] bg-white p-5"><div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-gold" /><h3 className="font-display text-xl text-primary">Search &amp; Filter</h3></div><div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_170px_170px]"><label className="relative block"><span className="sr-only">Search customers</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by phone, name, or email…" className="w-full border border-border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold" /></label><label><span className="sr-only">Sort customers by field</span><select value={sortField} onChange={(event) => setSortField(event.target.value)} className="w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="joined">Join date</option><option value="activity">Last activity</option><option value="orders">Total orders</option><option value="spend">Total spend</option></select></label><label><span className="sr-only">Sort customer direction</span><select value={sortDirection} onChange={(event) => setSortDirection(event.target.value)} className="w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div><p className="mt-5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Advanced filters</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label><span className="sr-only">Filter by city</span><select value={city} onChange={(event) => setCity(event.target.value)} className="w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="all">All cities</option>{cities.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label><span className="sr-only">Filter by state</span><select value={state} onChange={(event) => setState(event.target.value)} className="w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="all">All states</option>{states.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label><span className="sr-only">Filter by last activity</span><select value={activity} onChange={(event) => setActivity(event.target.value)} className="w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="all">All activity</option><option value="today">Active today</option><option value="7-days">Active in 7 days</option><option value="30-days">Active in 30 days</option><option value="never">No activity</option></select></label><label><span className="sr-only">Filter by payment history</span><select value={paid} onChange={(event) => setPaid(event.target.value)} className="w-full border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-gold"><option value="all">All users</option><option value="paid">Paid users</option><option value="unpaid">No paid orders</option></select></label></div><button type="button" onClick={clearFilters} className="mt-4 border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary">Clear filters</button></section>
    <section className="mt-5 overflow-hidden border border-[#ded5c9] bg-white"><div className="flex items-center justify-between border-b border-border bg-[#fbf9f6] px-5 py-4"><h3 className="font-display text-xl text-primary">Customers ({customers.length})</h3><p className="text-xs text-muted-foreground">{loading ? "Refreshing…" : "Live customer records"}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="border-b border-border bg-white text-[10px] uppercase tracking-[0.14em] text-muted-foreground"><tr><th className="px-4 py-4">Phone</th><th className="px-4 py-4">Name</th><th className="px-4 py-4">Email</th><th className="px-4 py-4">Total orders</th><th className="px-4 py-4">Total spent</th><th className="px-4 py-4">Wishlist</th><th className="px-4 py-4">Last activity</th><th className="px-4 py-4">Joined</th><th className="px-4 py-4 text-right">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Loading customers…</td></tr> : customers.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No customers match these filters.</td></tr> : customers.map((customer) => <tr key={customer._id} className="border-b border-border last:border-0 hover:bg-[#fbf9f6]"><td className="px-4 py-4 whitespace-nowrap"><p>+91 {customer.phone || "—"}</p>{customer.verified && <span className="mt-1 inline-flex border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800">Verified</span>}</td><td className="px-4 py-4"><p className={customer.name ? "font-medium text-primary" : "italic text-muted-foreground"}>{customer.name || "Not provided"}</p></td><td className="px-4 py-4"><p className={customer.email ? "text-primary" : "italic text-muted-foreground"}>{customer.email || "Not provided"}</p></td><td className="px-4 py-4">{customer.orderCount ?? 0}</td><td className="px-4 py-4">₹{Number(customer.orderTotal ?? 0).toLocaleString("en-IN")}</td><td className="px-4 py-4">{customer.wishlistCount ?? customer.wishlist?.length ?? 0}</td><td className="px-4 py-4 whitespace-nowrap text-xs text-muted-foreground">{customerRelativeDate(customer.lastActivity)}</td><td className="px-4 py-4 whitespace-nowrap text-xs text-muted-foreground">{customerDate(customer.createdAt)}</td><td className="px-4 py-4 text-right"><button type="button" onClick={() => customer._id && void openCustomer(customer._id)} className="inline-flex items-center gap-1.5 border border-primary px-3 py-1.5 text-xs text-primary hover:bg-primary hover:text-white"><Eye className="size-3.5" /> View</button></td></tr>)}</tbody></table></div></section>
  </div>;
}

function CustomerCrudPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selected, setSelected] = useState<{ customer: CustomerRecord; orders: CustomerOrder[] } | null>(null);
  const [editing, setEditing] = useState<CustomerRecord | null>(null);
  const [search, setSearch] = useState("");
  async function load() {
    try { setCustomers(await api(`/api/admin/customers?search=${encodeURIComponent(search)}`)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load customers."); }
  }
  useEffect(() => { void load(); }, [search]);
  async function openCustomer(id: string) { try { setSelected(await api(`/api/admin/customers/${id}`)); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load customer."); } }
  async function remove(customer: CustomerRecord) {
    if (!customer._id || !window.confirm(`Delete ${String(customer.name ?? "this customer")}? Existing orders will be kept.`)) return;
    try { await api(`/api/admin/customers/${customer._id}`, { method: "DELETE" }); setSelected(null); await load(); toast.success("Customer deleted."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete customer."); }
  }
  if (editing) return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to customers</button><div className="max-w-xl"><CustomerEditor initial={editing} onDone={() => { setEditing(null); void load(); }} /></div></div>;
  if (selected) return <div><button type="button" onClick={() => setSelected(null)} className="mb-5 text-sm text-primary hover:underline">← Back to customers</button><div className="grid gap-5 lg:grid-cols-[280px_1fr]"><section className="border border-[#ded5c9] bg-white p-6"><div className="flex size-14 items-center justify-center rounded-full bg-primary text-xl text-white">{(selected.customer.name || "BB").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div><h2 className="mt-4 font-display text-2xl text-primary">{selected.customer.name || "Unnamed customer"}</h2><p className="mt-2 text-sm text-muted-foreground">{selected.customer.email || "Email not added"}</p><p className="mt-1 text-sm text-muted-foreground">+91 {selected.customer.phone}</p><div className="mt-6 flex gap-3 border-t border-border pt-5"><button type="button" onClick={() => setEditing(selected.customer)} className="border border-primary px-3 py-2 text-xs text-primary">Edit</button><button type="button" onClick={() => void remove(selected.customer)} className="border border-red-200 px-3 py-2 text-xs text-red-700">Delete</button></div></section><section className="border border-[#ded5c9] bg-white p-6"><div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Purchase history</p><h2 className="mt-1 font-display text-3xl text-primary">Customer orders</h2></div><p className="text-sm text-muted-foreground">{selected.orders.length} order{selected.orders.length === 1 ? "" : "s"}</p></div>{selected.orders.length === 0 ? <p className="mt-8 border-t border-border pt-8 text-sm text-muted-foreground">No purchases yet.</p> : <div className="mt-5 divide-y divide-border border-y border-border">{selected.orders.map((order) => <div key={order.orderId} className="flex flex-wrap items-center gap-4 py-4"><div className="min-w-32 flex-1"><p className="font-medium text-primary">{order.orderId}</p><p className="mt-1 text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}</p></div><p className="text-sm">{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} item(s)</p><p className="text-sm font-medium">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</p><span className="bg-amber-50 px-2 py-1 text-xs capitalize text-amber-800">{order.status}</span></div>)}</div>}</section></div></div>;
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{customers.length} records</p><h2 className="mt-1 font-display text-3xl text-primary">Customers</h2><p className="mt-2 text-sm text-muted-foreground">Manage customer profiles and account information.</p></div><button type="button" onClick={() => setEditing({ name: "", email: "", phone: "" })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add new</button></div><div className="mt-6 border border-[#ded5c9] bg-white p-5"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or mobile…" className="w-full border border-border px-3 py-3 text-sm outline-none focus:border-gold" /></div><div className="mt-5 overflow-x-auto border border-[#ded5c9] bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border bg-[#fbf9f6] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><tr><th className="px-4 py-4">Customer</th><th className="px-4 py-4">Mobile</th><th className="px-4 py-4">Orders</th><th className="px-4 py-4">Total spent</th><th className="px-4 py-4">Actions</th></tr></thead><tbody>{customers.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No customers found.</td></tr> : customers.map((customer) => <tr key={customer._id} className="border-b border-border last:border-0"><td className="px-4 py-4"><p className="font-medium text-primary">{customer.name || "Unnamed customer"}</p><p className="mt-1 text-xs text-muted-foreground">{customer.email || "Email not added"}</p></td><td className="px-4 py-4 text-muted-foreground">+91 {customer.phone}</td><td className="px-4 py-4">{customer.orderCount ?? 0}</td><td className="px-4 py-4">₹{Number(customer.orderTotal ?? 0).toLocaleString("en-IN")}</td><td className="px-4 py-4"><div className="flex gap-3"><button type="button" onClick={() => customer._id && void openCustomer(customer._id)} className="text-xs text-primary hover:underline">View</button><button type="button" onClick={() => setEditing({ ...customer })} className="text-xs text-primary hover:underline">Edit</button><button type="button" onClick={() => void remove(customer)} className="text-xs text-red-700 hover:underline">Delete</button></div></td></tr>)}</tbody></table></div></div>;
}

function ReviewCrudPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<AdminReview | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [reviewItems, productItems] = await Promise.all([api(`/api/admin/reviews?search=${encodeURIComponent(search)}&status=${status}`), api("/api/admin/products")]);
      setReviews(reviewItems);
      setProducts(productItems);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load reviews."); }
  }
  useEffect(() => { void load(); }, [search, status]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing) return; setBusy(true);
    try {
      const { _id, media, productName, createdAt, updatedAt, ...payload } = editing;
      const saved = await api(`/api/admin/reviews${_id ? `/${_id}` : ""}`, { method: _id ? "PUT" : "POST", body: JSON.stringify(payload) });
      setEditing(null); setReviews((current) => _id ? current.map((item) => item._id === _id ? saved : item) : [saved, ...current]); toast.success("Review saved.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save review."); }
    finally { setBusy(false); }
  }
  async function remove(review: AdminReview) {
    if (!review._id || !window.confirm("Delete this review and its media? This cannot be undone.")) return;
    try { await api(`/api/admin/reviews/${review._id}`, { method: "DELETE" }); setReviews((current) => current.filter((item) => item._id !== review._id)); toast.success("Review deleted."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete review."); }
  }
  return <div>
    {editing ? <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to reviews</button><form onSubmit={save} className="max-w-2xl border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Review record</p><h2 className="mt-1 font-display text-3xl text-primary">{editing._id ? "Edit review" : "Add review"}</h2></div><button type="button" onClick={() => setEditing(null)} className="text-xs text-muted-foreground">Cancel</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{!editing._id && <label className="text-xs text-muted-foreground sm:col-span-2">Product<select required value={editing.productId} onChange={(event) => setEditing({ ...editing, productId: event.target.value })} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm"><option value="">Choose a product</option>{products.map((product) => <option key={product._id} value={String(product.id)}>{String(product.name ?? product.id)}</option>)}</select></label>}<label className="text-xs text-muted-foreground">Reviewer name<input required maxLength={80} value={editing.reviewerName ?? ""} onChange={(event) => setEditing({ ...editing, reviewerName: event.target.value })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Rating<select value={editing.rating} onChange={(event) => setEditing({ ...editing, rating: Number(event.target.value) })} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm">{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select></label><label className="text-xs text-muted-foreground sm:col-span-2">Title<input required maxLength={120} value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Review details<textarea required maxLength={5000} rows={6} value={editing.body} onChange={(event) => setEditing({ ...editing, body: event.target.value })} className="mt-1 w-full resize-y border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Status<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as AdminReview["status"] })} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label></div><button disabled={busy} className="mt-6 w-full bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving…" : "Save review"}</button></form></div> : <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{reviews.length} records</p><h2 className="mt-1 font-display text-3xl text-primary">Product reviews</h2><p className="mt-2 text-sm text-muted-foreground">Moderate and manage customer feedback.</p></div><button type="button" onClick={() => setEditing({ productId: "", reviewerName: "Bawari customer", rating: 5, title: "", body: "", status: "pending", media: [] })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add new</button></div><div className="mt-6 flex flex-wrap gap-3 border border-[#ded5c9] bg-white p-5"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviews…" className="min-w-60 flex-1 border border-border px-3 py-2.5 text-sm" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div><div className="mt-5 overflow-x-auto border border-[#ded5c9] bg-white"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-border bg-[#fbf9f6] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><tr><th className="px-4 py-4">Review</th><th className="px-4 py-4">Product</th><th className="px-4 py-4">Rating</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Actions</th></tr></thead><tbody>{reviews.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No reviews found.</td></tr> : reviews.map((review) => <tr key={review._id} className="border-b border-border last:border-0"><td className="max-w-72 px-4 py-4"><p className="truncate font-medium text-primary">{review.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{review.reviewerName} · {review.body}</p></td><td className="px-4 py-4 text-muted-foreground">{review.productName ?? review.productId}</td><td className="px-4 py-4"><AdminStars value={review.rating} /></td><td className="px-4 py-4 capitalize">{review.status}</td><td className="px-4 py-4"><div className="flex gap-3"><button type="button" onClick={() => setEditing({ ...review })} className="text-xs text-primary hover:underline">Edit</button><button type="button" onClick={() => void remove(review)} className="text-xs text-red-700 hover:underline">Delete</button></div></td></tr>)}</tbody></table></div></>}</div>;
}

const emptyOrder: Order = { orderId: "", customerName: "", customerPhone: "", customerEmail: "", status: "pending", paymentStatus: "demo", paymentMethod: "Demo", subtotal: 0, shipping: 0, discount: 0, total: 0, items: [] };

function OrderEditor({ initial, onDone }: { initial: Order; onDone: () => void }) {
  const [form, setForm] = useState<Order>({ ...emptyOrder, ...initial });
  const [itemsJson, setItemsJson] = useState(JSON.stringify(initial.items ?? [], null, 2));
  const [busy, setBusy] = useState(false);
  const set = (key: keyof Order, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const items = JSON.parse(itemsJson);
      if (!Array.isArray(items)) throw new Error("Order items must be a JSON array.");
      const { _id, createdAt, ...payload } = form;
      await api(`/api/admin/orders${_id ? `/${_id}` : ""}`, { method: _id ? "PUT" : "POST", body: JSON.stringify({ ...payload, items }) });
      toast.success("Order saved."); onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save order."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="max-w-3xl border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Order record</p><h2 className="mt-1 font-display text-3xl text-primary">{form._id ? "Edit order" : "Add order"}</h2></div><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Order ID<input value={form.orderId ?? ""} onChange={(event) => set("orderId", event.target.value)} placeholder="Generated if blank" className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Customer name<input value={form.customerName ?? ""} onChange={(event) => set("customerName", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Customer phone<input value={form.customerPhone ?? ""} onChange={(event) => set("customerPhone", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Customer email<input type="email" value={form.customerEmail ?? ""} onChange={(event) => set("customerEmail", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Order status<select value={form.status ?? "pending"} onChange={(event) => set("status", event.target.value)} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm capitalize">{["pending", "processing", "shipped", "delivered", "cancelled"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="text-xs text-muted-foreground">Payment status<input value={form.paymentStatus ?? ""} onChange={(event) => set("paymentStatus", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Payment method<input value={form.paymentMethod ?? ""} onChange={(event) => set("paymentMethod", event.target.value)} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Total (₹)<input type="number" min="0" value={Number(form.total ?? 0)} onChange={(event) => set("total", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Subtotal (₹)<input type="number" min="0" value={Number(form.subtotal ?? 0)} onChange={(event) => set("subtotal", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Shipping (₹)<input type="number" min="0" value={Number(form.shipping ?? 0)} onChange={(event) => set("shipping", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground">Discount (₹)<input type="number" min="0" value={Number(form.discount ?? 0)} onChange={(event) => set("discount", Number(event.target.value))} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><label className="text-xs text-muted-foreground sm:col-span-2">Order items JSON<textarea rows={7} value={itemsJson} onChange={(event) => setItemsJson(event.target.value)} className="mt-1 w-full resize-y border border-border px-3 py-2.5 font-mono text-xs" /><span className="mt-1 block text-[11px]">Use an array of items with productId, name, quantity, and price.</span></label></div><button disabled={busy} className="mt-6 w-full bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving…" : "Save order"}</button></form>;
}

function OrderCrudPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [editing, setEditing] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  async function load() { try { setOrders(await api(`/api/admin/orders?search=${encodeURIComponent(search)}&sort=newest`)); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load orders."); } }
  useEffect(() => { void load(); }, [search]);
  async function remove(order: Order) {
    if (!order._id || !window.confirm(`Delete order ${order.orderId ?? ""}? Inventory will not be restored.`)) return;
    try { await api(`/api/admin/orders/${order._id}`, { method: "DELETE" }); await load(); toast.success("Order deleted."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete order."); }
  }
  if (editing) return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to orders</button><OrderEditor initial={editing} onDone={() => { setEditing(null); void load(); }} /></div>;
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{orders.length} records</p><h2 className="mt-1 font-display text-3xl text-primary">Order management</h2><p className="mt-2 text-sm text-muted-foreground">Add, edit, and delete order records.</p></div><button type="button" onClick={() => setEditing({ ...emptyOrder })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add new</button></div><div className="mt-6 border border-[#ded5c9] bg-white p-5"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, or email…" className="w-full border border-border px-3 py-2.5 text-sm" /></div><div className="mt-5 overflow-x-auto border border-[#ded5c9] bg-white"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-border bg-[#fbf9f6] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><tr><th className="px-4 py-4">Order</th><th className="px-4 py-4">Customer</th><th className="px-4 py-4">Amount</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Payment</th><th className="px-4 py-4">Actions</th></tr></thead><tbody>{orders.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No orders found.</td></tr> : orders.map((order) => <tr key={order._id} className="border-b border-border last:border-0"><td className="px-4 py-4 font-medium text-primary">{order.orderId}</td><td className="px-4 py-4"><p>{order.customerName || "Guest checkout"}</p><p className="mt-1 text-xs text-muted-foreground">{order.customerEmail || "Email not available"}</p></td><td className="px-4 py-4">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</td><td className="px-4 py-4 capitalize">{order.status}</td><td className="px-4 py-4 text-xs capitalize text-muted-foreground">{order.paymentStatus}</td><td className="px-4 py-4"><div className="flex gap-3"><button type="button" onClick={() => setEditing({ ...order })} className="text-xs text-primary hover:underline">Edit</button><button type="button" onClick={() => void remove(order)} className="text-xs text-red-700 hover:underline">Delete</button></div></td></tr>)}</tbody></table></div></div>;
}

function InventoryEditor({ initial, products, onDone }: { initial: InventoryEvent; products: RecordItem[]; onDone: () => void }) {
  const [form, setForm] = useState({ productId: String(initial.productId ?? ""), eventType: String(initial.eventType ?? "manual"), quantity: Number(initial.quantity ?? 0), reason: String((initial as InventoryEvent & { reason?: string }).reason ?? "") });
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      if (!form.productId) throw new Error("Choose a product.");
      if (!Number.isInteger(form.quantity) || form.quantity === 0) throw new Error("Quantity must be a non-zero whole number.");
      const method = initial._id ? "PUT" : "POST";
      await api(`/api/admin/inventory${initial._id ? `/${initial._id}` : ""}`, { method, body: JSON.stringify(form) });
      toast.success("Inventory movement saved."); onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save inventory movement."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="max-w-xl border border-[#ded5c9] bg-white p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[0.18em] text-gold">Inventory record</p><h2 className="mt-1 font-display text-3xl text-primary">{initial._id ? "Edit movement" : "Add movement"}</h2><p className="mt-2 text-sm text-muted-foreground">Manual movements update the product stock at the same time.</p></div><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><label className="mt-6 block text-xs text-muted-foreground">Product<select required disabled={Boolean(initial._id)} value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm disabled:bg-[#f4efe8]"><option value="">Choose a product</option>{products.map((product) => <option key={product._id} value={String(product.id)}>{String(product.name ?? product.id)}</option>)}</select></label><label className="mt-4 block text-xs text-muted-foreground">Event type<select value={form.eventType} onChange={(event) => setForm({ ...form, eventType: event.target.value })} className="mt-1 w-full border border-border bg-white px-3 py-2.5 text-sm"><option value="manual">Manual adjustment</option><option value="purchase">Purchase</option></select></label><label className="mt-4 block text-xs text-muted-foreground">Quantity change<input required type="number" step="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: Number(event.target.value) })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /><span className="mt-1 block text-[11px]">Use a positive number to add stock or a negative number to remove it.</span></label><label className="mt-4 block text-xs text-muted-foreground">Reason<input maxLength={200} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Restock, correction, damaged item…" className="mt-1 w-full border border-border px-3 py-2.5 text-sm" /></label><button disabled={busy} className="mt-6 w-full bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50">{busy ? "Saving…" : "Save movement"}</button></form>;
}

function InventoryCrudPage() {
  const [events, setEvents] = useState<InventoryEvent[]>([]);
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [editing, setEditing] = useState<InventoryEvent | null>(null);
  const [productId, setProductId] = useState("");
  const [eventType, setEventType] = useState("all");
  async function load() {
    try {
      const params = new URLSearchParams({ eventType });
      if (productId) params.set("productId", productId);
      const [history, productRows] = await Promise.all([api(`/api/admin/inventory?${params}`), api("/api/admin/products")]);
      setEvents(history); setProducts(productRows);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load inventory."); }
  }
  useEffect(() => { void load(); }, [productId, eventType]);
  async function remove(event: InventoryEvent) {
    if (!event._id || !window.confirm("Delete this movement? The product stock will be reversed.")) return;
    try { await api(`/api/admin/inventory/${event._id}`, { method: "DELETE" }); await load(); toast.success("Inventory movement deleted."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete inventory movement."); }
  }
  if (editing) return <div><button type="button" onClick={() => setEditing(null)} className="mb-5 text-sm text-primary hover:underline">← Back to inventory</button><InventoryEditor initial={editing} products={products} onDone={() => { setEditing(null); void load(); }} /></div>;
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{events.length} records</p><h2 className="mt-1 font-display text-3xl text-primary">Inventory history</h2><p className="mt-2 text-sm text-muted-foreground">Every movement is editable, removable, and synchronized with product stock.</p></div><button type="button" onClick={() => setEditing({ eventType: "manual", quantity: 1 })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add movement</button></div><div className="mt-6 flex flex-wrap gap-3 border border-[#ded5c9] bg-white p-5"><select value={productId} onChange={(event) => setProductId(event.target.value)} className="min-w-56 border border-border bg-white px-3 py-2.5 text-sm"><option value="">All products</option>{products.map((product) => <option key={product._id} value={String(product.id)}>{String(product.name ?? product.id)}</option>)}</select><select value={eventType} onChange={(event) => setEventType(event.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm"><option value="all">All events</option><option value="purchase">Purchases</option><option value="manual">Manual adjustments</option></select><button type="button" onClick={() => { setProductId(""); setEventType("all"); }} className="border border-border px-3 py-2.5 text-xs text-muted-foreground">Clear filters</button></div><div className="mt-5 overflow-x-auto border border-[#ded5c9] bg-white"><table className="w-full min-w-[1320px] text-left text-sm"><thead className="border-b border-border bg-[#fbf9f6] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><tr><th className="px-4 py-4">Date</th><th className="px-4 py-4">Product</th><th className="px-4 py-4">Event</th><th className="px-4 py-4">Change</th><th className="px-4 py-4">Stock after</th><th className="px-4 py-4">Buyer name</th><th className="px-4 py-4">Mobile number</th><th className="px-4 py-4">Email</th><th className="px-4 py-4">Actions</th></tr></thead><tbody>{events.length === 0 ? <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No inventory events found.</td></tr> : events.map((event) => <tr key={event._id} className="border-b border-border align-top last:border-0"><td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{event.createdAt ? new Date(event.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td><td className="px-4 py-4 font-medium text-primary">{event.productName ?? event.productId}</td><td className="px-4 py-4 capitalize">{event.eventType}</td><td className={`px-4 py-4 font-medium ${Number(event.quantity) < 0 ? "text-red-700" : "text-emerald-700"}`}>{Number(event.quantity) > 0 ? "+" : ""}{event.quantity}</td><td className="px-4 py-4">{event.nextStock ?? "—"}</td><td className="px-4 py-4 font-medium text-primary">{event.buyerName || "—"}</td><td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{event.buyerPhone ? `+91 ${event.buyerPhone}` : "—"}</td><td className="max-w-56 truncate px-4 py-4 text-muted-foreground" title={event.buyerEmail || undefined}>{event.buyerEmail || "—"}</td><td className="px-4 py-4"><div className="flex gap-3"><button type="button" onClick={() => setEditing({ ...event })} className="text-xs text-primary hover:underline">Edit</button><button type="button" onClick={() => void remove(event)} className="text-xs text-red-700 hover:underline">Delete</button></div></td></tr>)}</tbody></table></div></div>;
}