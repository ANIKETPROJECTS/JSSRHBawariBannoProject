import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Boxes, ChevronRight, Image, LayoutDashboard, LogOut, Megaphone, Package, Plus, Save, Settings, ShoppingCart, Star, Tags, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Panel | Bawari Banno" }] }),
  component: AdminPage,
});

type Tab = "dashboard" | "products" | "inventory" | "orders" | "customers" | "reviews" | "categories" | "heroes" | "announcements" | "settings";
type RecordItem = Record<string, unknown> & { _id?: string };

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

  useEffect(() => {
    api("/api/admin/me").then(() => setAuthenticated(true)).catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading admin panel…</div>;
  if (!authenticated) return <Login onSuccess={() => setAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#2d2520]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-[#ded5c9] bg-white px-5 py-7 lg:flex">
        <Link to="/" className="font-display text-3xl text-primary">Bawari Banno</Link>
        <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Admin studio</p>
        <nav className="mt-12 min-h-0 flex-1 space-y-1 overflow-y-auto pb-5 pr-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors ${tab === id ? "bg-primary text-white" : "text-muted-foreground hover:bg-[#f4efe8]"}`}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </nav>
        <div className="mt-4 shrink-0 border-t border-[#ded5c9] pt-5">
        <button type="button" onClick={async () => { await api("/api/admin/logout", { method: "POST" }); navigate({ to: "/admin" }); }} className="flex items-center gap-3 px-3 text-sm text-muted-foreground hover:text-primary">
          <LogOut className="size-4" /> Sign out
        </button>
        </div>
      </aside>
      <main className="lg:ml-64">
        <header className="flex items-center justify-between border-b border-[#ded5c9] bg-white px-5 py-5 md:px-10">
          <div><p className="text-[10px] uppercase tracking-[0.22em] text-gold">Bawari Banno</p><h1 className="mt-1 font-display text-3xl text-primary">{tabs.find((item) => item.id === tab)?.label}</h1></div>
          <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">View storefront <ChevronRight className="size-3" /></Link>
        </header>
        <div className="border-b border-[#ded5c9] bg-white px-5 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">{tabs.map(({ id, label }) => <button key={id} type="button" onClick={() => setTab(id)} className={`whitespace-nowrap px-3 py-2 text-xs ${tab === id ? "bg-primary text-white" : "bg-[#f4efe8] text-muted-foreground"}`}>{label}</button>)}</div>
        </div>
        <div className="mx-auto max-w-7xl p-5 md:p-10">
          {tab === "dashboard" ? <Dashboard /> : tab === "inventory" ? <InventoryPage /> : tab === "orders" ? <OrdersPage /> : tab === "customers" ? <CustomersPage /> : tab === "settings" ? <SettingsPage /> : tab === "announcements" ? <AnnouncementsPage /> : tab === "reviews" ? <ComingSoonPage tab={tab} /> : <ResourceManager resource={tab} />}
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
  async function seed() { if (!window.confirm("Import the current demo products, categories, and hero slides into MongoDB? Existing records with the same IDs will be updated.")) return; try { const result = await api("/api/admin/seed", { method: "POST" }); toast.success(`Imported ${result.products} products, ${result.categories} categories, and ${result.heroes} hero slides.`); const next = await api("/api/admin/summary"); setSummary(next); } catch (error) { toast.error(error instanceof Error ? error.message : "Import failed."); } }
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
  productName?: string;
  quantity?: number;
  previousStock?: number;
  nextStock?: number;
  createdAt?: string;
};

function InventoryPage() {
  const [events, setEvents] = useState<InventoryEvent[]>([]);
  const [products, setProducts] = useState<RecordItem[]>([]);
  const [productId, setProductId] = useState("");
  const [eventType, setEventType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
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
      <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border bg-[#fbf9f6] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><tr><th className="px-4 py-4">Date & time</th><th className="px-4 py-4">Product</th><th className="px-4 py-4">Event</th><th className="px-4 py-4">Change</th><th className="px-4 py-4">Stock after</th><th className="px-4 py-4">Order</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading history…</td></tr> : events.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No inventory events match these filters.</td></tr> : events.map((event) => <tr key={event._id} className="border-b border-border last:border-0"><td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{event.createdAt ? new Date(event.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td><td className="px-4 py-4 font-medium">{event.productName ?? event.productId}</td><td className="px-4 py-4 capitalize">{event.eventType ?? "adjustment"}</td><td className={`px-4 py-4 font-medium ${Number(event.quantity) < 0 ? "text-red-700" : "text-emerald-700"}`}>{Number(event.quantity) > 0 ? "+" : ""}{event.quantity}</td><td className="px-4 py-4">{event.nextStock ?? "—"}</td><td className="px-4 py-4 text-xs text-muted-foreground">{event.orderId ?? "—"}</td></tr>)}</tbody></table>
    </div>
  </div>;
}

type Order = { _id?: string; orderId?: string; status?: string; paymentStatus?: string; total?: number; items?: { productId: string; quantity: number }[]; createdAt?: string };

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, status });
      setOrders(await api(`/api/admin/orders?${params}`));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load orders."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [search, status]);
  const revenue = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  return <div>
    <div className="grid gap-4 sm:grid-cols-3"><MetricCard label="Total orders" value={orders.length} icon={ShoppingCart} /><MetricCard label="Pending" value={orders.filter((order) => order.status === "pending").length} icon={BarChart3} /><MetricCard label="Demo revenue" value={`₹${revenue.toLocaleString("en-IN")}`} icon={Package} /></div>
    <div className="mt-6 border border-[#ded5c9] bg-white p-5"><div className="flex flex-wrap gap-3"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order number…" className="min-w-64 flex-1 border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /><select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-border bg-white px-3 py-2.5 text-sm"><option value="all">All statuses</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="delivered">Delivered</option></select></div></div>
    <div className="mt-5 overflow-x-auto border border-[#ded5c9] bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-border bg-[#fbf9f6] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><tr><th className="px-4 py-4">Order #</th><th className="px-4 py-4">Items</th><th className="px-4 py-4">Amount</th><th className="px-4 py-4">Order status</th><th className="px-4 py-4">Payment</th><th className="px-4 py-4">Date</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading orders…</td></tr> : orders.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No orders yet. Demo purchases will appear here.</td></tr> : orders.map((order) => <tr key={order._id} className="border-b border-border last:border-0"><td className="px-4 py-4 font-medium text-primary">{order.orderId}</td><td className="px-4 py-4">{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</td><td className="px-4 py-4">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</td><td className="px-4 py-4"><span className="bg-amber-50 px-2 py-1 text-xs capitalize text-amber-800">{order.status}</span></td><td className="px-4 py-4 text-xs capitalize text-muted-foreground">{order.paymentStatus}</td><td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td></tr>)}</tbody></table></div>
  </div>;
}

type CustomerRecord = { _id?: string; name?: string; email?: string; phone?: string; createdAt?: string; orderCount?: number; orderTotal?: number };
type CustomerOrder = { orderId?: string; total?: number; status?: string; paymentStatus?: string; items?: { productId: string; quantity: number }[]; createdAt?: string };

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
  return <div className="border border-[#ded5c9] bg-white p-5"><Icon className="size-5 text-gold" /><p className="mt-5 text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl text-primary">{value}</p></div>;
}

function ComingSoonPage({ tab }: { tab: "customers" | "reviews" }) {
  const details = { customers: ["Customer management", "Customer profiles and order history will appear here when customer accounts are connected."], reviews: ["Product reviews", "Moderate and publish customer reviews here once reviews are enabled on the storefront."] }[tab];
  return <div className="border border-[#ded5c9] bg-white p-8"><Settings className="size-6 text-gold" /><h2 className="mt-5 font-display text-3xl text-primary">{details[0]}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{details[1]}</p><span className="mt-6 inline-block bg-[#f4efe8] px-3 py-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Ready for the next commerce phase</span></div>;
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

const emptyByResource: Record<Exclude<Tab, "dashboard" | "inventory" | "settings" | "customers" | "reviews">, Record<string, unknown>> = {
  heroes: { title: "", subtitle: "", image: "", href: "/", order: 0, published: true },
  categories: { label: "", slug: "", description: "", image: "", order: 0, published: true },
  products: { id: "", name: "", fabric: "", price: 0, category: "silk", subcategory: "", image: "", blouse: "", length: "", care: "", description: "", stock: 0, published: true, featured: false },
  announcements: { message: "", order: 0, active: true },
};

function ResourceManager({ resource }: { resource: Exclude<Tab, "dashboard" | "inventory" | "settings" | "customers" | "reviews"> }) {
  const [items, setItems] = useState<RecordItem[]>([]); const [editing, setEditing] = useState<RecordItem | null>(null); const [loading, setLoading] = useState(true);
  async function refresh() { setLoading(true); try { setItems(await api(`/api/admin/${resource}`)); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load records."); } finally { setLoading(false); } }
  useEffect(() => {
    setEditing(null);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [resource]);
  async function remove(id: string) { if (!window.confirm("Delete this record? This cannot be undone.")) return; try { await api(`/api/admin/${resource}/${id}`, { method: "DELETE" }); toast.success("Deleted."); void refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Delete failed."); } }
  return <><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{items.length} records</p><h2 className="mt-1 font-display text-3xl text-primary">Manage {resource === "heroes" ? "hero slides" : resource}</h2></div><button type="button" onClick={() => setEditing({ ...emptyByResource[resource] })} className="inline-flex items-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white"><Plus className="size-4" /> Add new</button></div><div className="mt-7 grid gap-4 xl:grid-cols-[1fr_380px]"><div className="space-y-3">{loading ? <p className="text-sm text-muted-foreground">Loading…</p> : items.map((item) => <div key={item._id} className="flex items-center justify-between gap-4 border border-[#ded5c9] bg-white p-4"><div className="flex min-w-0 items-center gap-4">{typeof item.image === "string" && item.image ? <img src={item.image} alt="" className="size-14 shrink-0 object-cover" /> : <div className="size-14 shrink-0 bg-[#f0e9df]" />}<div className="min-w-0"><p className="truncate font-medium">{String(item.name ?? item.title ?? item.label ?? item.slug ?? "Untitled")}</p><p className="mt-1 text-xs text-muted-foreground">{resource === "products" ? `₹${Number(item.price ?? 0).toLocaleString("en-IN")} · Stock ${Number(item.stock ?? 0)}` : item.published === false ? "Draft" : "Published"}</p></div></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => setEditing(item)} className="border border-border px-3 py-2 text-xs text-primary">Edit</button><button type="button" onClick={() => item._id && void remove(item._id)} className="p-2 text-muted-foreground hover:text-red-700" aria-label="Delete"><Trash2 className="size-4" /></button></div></div>)}</div>{editing && <Editor resource={resource} initial={editing} onDone={() => { setEditing(null); void refresh(); }} />}</div></>;
}

function Editor({ resource, initial, onDone }: { resource: Exclude<Tab, "dashboard">; initial: RecordItem; onDone: () => void }) {
  const [form, setForm] = useState<RecordItem>(initial); const [busy, setBusy] = useState(false);
  const fields = resource === "heroes" ? [["title", "Title"], ["subtitle", "Subtitle"], ["image", "Image URL"], ["href", "Button link"], ["order", "Display order"]] : resource === "categories" ? [["label", "Name"], ["slug", "Slug"], ["description", "Description"], ["image", "Image URL"], ["order", "Display order"]] : [["id", "Product ID"], ["name", "Name"], ["fabric", "Fabric"], ["price", "Price (₹)"], ["category", "Category ID"], ["subcategory", "Subcategory"], ["image", "Image URL"], ["stock", "Stock quantity"], ["blouse", "Blouse"], ["length", "Length"], ["care", "Care"], ["description", "Description"]];
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); try { const { _id, ...payload } = form; await api(`/api/admin/${resource}${_id ? `/${_id}` : ""}`, { method: _id ? "PUT" : "POST", body: JSON.stringify(payload) }); toast.success("Saved."); onDone(); } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed."); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="border border-[#ded5c9] bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-display text-2xl text-primary">{form._id ? "Edit record" : "New record"}</h3><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><div className="mt-5 space-y-3">{fields.map(([key, label]) => <label key={key} className="block text-xs text-muted-foreground">{label}<input required={["title", "label", "name", "id", "slug", "message", "code"].includes(key)} type={["price", "stock", "order", "amount", "minimumSubtotal"].includes(key) ? "number" : "text"} value={String(form[key] ?? "")} onChange={(e) => setForm({ ...form, [key]: ["price", "stock", "order", "amount", "minimumSubtotal"].includes(key) ? Number(e.target.value) : e.target.value })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label>)}</div>{["heroes", "categories", "products"].includes(resource) ? <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published !== false} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published on storefront</label> : <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>}{resource === "products" && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured === true} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured product</label>}<button disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50"><Save className="size-4" /> {busy ? "Saving…" : "Save changes"}</button></form>;
}