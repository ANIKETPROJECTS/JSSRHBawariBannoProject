import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Boxes, ChevronRight, Image, LayoutDashboard, LogOut, Megaphone, Package, Plus, Save, Settings, ShoppingCart, Star, Tags, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Panel | Bawari Banno" }] }),
  component: AdminPage,
});

type Tab = "dashboard" | "products" | "inventory" | "orders" | "customers" | "reviews" | "categories" | "heroes" | "announcements" | "coupons" | "settings";
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

  useEffect(() => {
    api("/api/admin/me").then(() => setAuthenticated(true)).catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading admin panel…</div>;
  if (!authenticated) return <Login onSuccess={() => setAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-[#2d2520]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#ded5c9] bg-white px-5 py-7 lg:block">
        <Link to="/" className="font-display text-3xl text-primary">Bawari Banno</Link>
        <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Admin studio</p>
        <nav className="mt-12 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors ${tab === id ? "bg-primary text-white" : "text-muted-foreground hover:bg-[#f4efe8]"}`}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </nav>
        <button type="button" onClick={async () => { await api("/api/admin/logout", { method: "POST" }); navigate({ to: "/admin" }); }} className="absolute bottom-8 flex items-center gap-3 px-3 text-sm text-muted-foreground hover:text-primary">
          <LogOut className="size-4" /> Sign out
        </button>
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
          {tab === "dashboard" ? <Dashboard /> : tab === "inventory" ? <InventoryPage /> : tab === "orders" ? <OrdersPage /> : tab === "settings" ? <SettingsPage /> : ["customers", "reviews"].includes(tab) ? <ComingSoonPage tab={tab} /> : <ResourceManager resource={tab} />}
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
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    const refresh = () => api("/api/admin/summary").then(setSummary).catch((error) => toast.error(error.message));
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);
  const cards = useMemo(() => summary ? [{ label: "Products", value: summary.products, icon: Package }, { label: "Categories", value: summary.categories, icon: Tags }, { label: "Hero slides", value: summary.heroes, icon: Image }, { label: "Low stock", value: summary.lowStock + summary.outOfStock, icon: Boxes }] : [], [summary]);
  async function seed() { if (!window.confirm("Import the current demo products, categories, and hero slides into MongoDB? Existing records with the same IDs will be updated.")) return; try { const result = await api("/api/admin/seed", { method: "POST" }); toast.success(`Imported ${result.products} products, ${result.categories} categories, and ${result.heroes} hero slides.`); const next = await api("/api/admin/summary"); setSummary(next); } catch (error) { toast.error(error instanceof Error ? error.message : "Import failed."); } }
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="border border-[#ded5c9] bg-white p-5"><Icon className="size-5 text-gold" /><p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-4xl text-primary">{value}</p></div>)}</div><div className="mt-8 border border-[#ded5c9] bg-white p-6"><BarChart3 className="size-5 text-gold" /><h2 className="mt-4 font-display text-2xl text-primary">Your content workspace</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Manage what shoppers see on the homepage and collections. Products with stock at five or below are flagged for attention.</p><button type="button" onClick={() => void seed()} className="mt-6 border border-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-primary hover:bg-primary hover:text-white">Import existing demo catalog</button></div></>;
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

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Package }) {
  return <div className="border border-[#ded5c9] bg-white p-5"><Icon className="size-5 text-gold" /><p className="mt-5 text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl text-primary">{value}</p></div>;
}

function ComingSoonPage({ tab }: { tab: "customers" | "reviews" }) {
  const details = { customers: ["Customer management", "Customer profiles and order history will appear here when customer accounts are connected."], reviews: ["Product reviews", "Moderate and publish customer reviews here once reviews are enabled on the storefront."] }[tab];
  return <div className="border border-[#ded5c9] bg-white p-8"><Settings className="size-6 text-gold" /><h2 className="mt-5 font-display text-3xl text-primary">{details[0]}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{details[1]}</p><span className="mt-6 inline-block bg-[#f4efe8] px-3 py-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Ready for the next commerce phase</span></div>;
}

const emptyByResource: Record<Exclude<Tab, "dashboard" | "inventory" | "settings" | "customers" | "reviews">, Record<string, unknown>> = {
  heroes: { title: "", subtitle: "", image: "", href: "/", order: 0, published: true },
  categories: { label: "", slug: "", description: "", image: "", order: 0, published: true },
  products: { id: "", name: "", fabric: "", price: 0, category: "silk", subcategory: "", image: "", blouse: "", length: "", care: "", description: "", stock: 0, published: true, featured: false },
  announcements: { message: "", order: 0, active: true },
  coupons: { code: "", label: "", type: "percent", amount: 10, minimumSubtotal: 0, active: true },
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
  const fields = resource === "heroes" ? [["title", "Title"], ["subtitle", "Subtitle"], ["image", "Image URL"], ["href", "Button link"], ["order", "Display order"]] : resource === "categories" ? [["label", "Name"], ["slug", "Slug"], ["description", "Description"], ["image", "Image URL"], ["order", "Display order"]] : resource === "announcements" ? [["message", "Announcement text"], ["order", "Display order"]] : resource === "coupons" ? [["code", "Coupon code"], ["label", "Customer-facing offer"], ["type", "Discount type"], ["amount", "Discount amount"], ["minimumSubtotal", "Minimum subtotal (₹)"]] : [["id", "Product ID"], ["name", "Name"], ["fabric", "Fabric"], ["price", "Price (₹)"], ["category", "Category ID"], ["subcategory", "Subcategory"], ["image", "Image URL"], ["stock", "Stock quantity"], ["blouse", "Blouse"], ["length", "Length"], ["care", "Care"], ["description", "Description"]];
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); try { const { _id, ...payload } = form; await api(`/api/admin/${resource}${_id ? `/${_id}` : ""}`, { method: _id ? "PUT" : "POST", body: JSON.stringify(payload) }); toast.success("Saved."); onDone(); } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed."); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="border border-[#ded5c9] bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-display text-2xl text-primary">{form._id ? "Edit record" : "New record"}</h3><button type="button" onClick={onDone} className="text-xs text-muted-foreground">Cancel</button></div><div className="mt-5 space-y-3">{fields.map(([key, label]) => <label key={key} className="block text-xs text-muted-foreground">{label}<input required={["title", "label", "name", "id", "slug", "message", "code"].includes(key)} type={["price", "stock", "order", "amount", "minimumSubtotal"].includes(key) ? "number" : "text"} value={String(form[key] ?? "")} onChange={(e) => setForm({ ...form, [key]: ["price", "stock", "order", "amount", "minimumSubtotal"].includes(key) ? Number(e.target.value) : e.target.value })} className="mt-1 w-full border border-border px-3 py-2.5 text-sm outline-none focus:border-gold" /></label>)}</div>{["heroes", "categories", "products"].includes(resource) ? <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published !== false} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published on storefront</label> : <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active !== false} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>}{resource === "products" && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured === true} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured product</label>}<button disabled={busy} className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-50"><Save className="size-4" /> {busy ? "Saving…" : "Save changes"}</button></form>;
}