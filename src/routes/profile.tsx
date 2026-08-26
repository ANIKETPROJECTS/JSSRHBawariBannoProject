import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Heart,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
  Truck,
  XCircle,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { CustomerGate } from "@/components/site/CustomerGate";
import { SiteShell } from "@/components/site/SiteShell";
import { formatPrice, sarees } from "@/data/sarees";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile | Bawari Banno" },
      {
        name: "description",
        content: "Register with OTP and manage your Bawari Banno profile, orders and addresses.",
      },
    ],
  }),
  component: Profile,
});

type RegistrationStep = "phone" | "otp" | "details" | "complete";

const profileLinks = [
  { label: "Account details", icon: UserRound },
  { label: "My orders", icon: Package },
  { label: "Wishlist", icon: Heart },
  { label: "Saved addresses", icon: MapPin },
];

const orders = [
  { id: "BB-2408-019", date: "12 August 2026", status: "Delivered", item: sarees[0] },
  { id: "BB-2407-014", date: "28 July 2026", status: "In transit", item: sarees[3] },
];

type CustomerOrder = { _id?: string; orderId?: string; status?: string; paymentStatus?: string; paymentMethod?: string; total?: number; items?: { productId: string; name?: string; image?: string; quantity: number; price?: number }[]; createdAt?: string; statusHistory?: { status: string; changedAt?: string }[] };

function Profile() {
  return <SiteShell><CustomerGate><AuthenticatedProfile /></CustomerGate></SiteShell>;
}

function AuthenticatedProfile() {
  const [customer, setCustomer] = useState<{ name: string; email: string; phone: string; wishlist?: string[] } | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetch("/api/auth/me").then((response) => response.json()).then((result) => setCustomer(result.customer)).catch(() => undefined); }, []);
  useEffect(() => { fetch("/api/auth/orders").then((response) => response.json()).then((result) => setCustomerOrders(Array.isArray(result.orders) ? result.orders : [])).catch(() => undefined); }, []);
  if (!customer) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading your profile…</div>;
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: data.get("name"), email: data.get("email") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save profile.");
      setCustomer(result); setEditing(false); toast.success("Profile details saved.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save profile."); }
    finally { setSaving(false); }
  }
  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      window.dispatchEvent(new Event("customer-logout"));
      window.location.assign("/profile");
    }
  }
  const initials = customer.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BB";
  const saved = sarees.filter((saree) => customer.wishlist?.map(String).includes(saree.id));
  return <CustomerProfileNoWishlist customer={customer} orders={customerOrders} saved={saved} editing={editing} saving={saving} onSave={save} onEditing={() => setEditing(!editing)} onSignOut={signOut} />;
}

function CustomerOrderTimeline({ order }: { order: CustomerOrder }) {
  const normalized = String(order.status ?? "pending").toLowerCase();
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const historyByStatus = new Map(history.map((event) => [String(event.status).toLowerCase(), event]));
  const standardSteps = [
    { status: "pending", label: "Order placed", detail: "We received your order.", Icon: Package },
    { status: "approved", label: "Order confirmed", detail: "Your order has been confirmed.", Icon: CheckCircle2 },
    { status: "processing", label: "Preparing your order", detail: "Our team is getting your saree ready.", Icon: Package },
    { status: "shipped", label: "Shipped", detail: "Your order is on its way.", Icon: Truck },
    { status: "delivered", label: "Delivered", detail: "Your order has been delivered.", Icon: CheckCircle2 },
  ];
  const currentIndex = standardSteps.findIndex((step) => step.status === normalized);
  const highestHistoryIndex = Math.max(...history.map((event) => standardSteps.findIndex((step) => step.status === String(event.status).toLowerCase())).filter((index) => index >= 0), -1);
  const reachedIndex = Math.max(currentIndex, highestHistoryIndex);
  const terminal = normalized === "cancelled" || normalized === "rejected";
  const visibleSteps = terminal ? standardSteps.slice(0, Math.max(reachedIndex + 1, 1)) : standardSteps;
  const steps = terminal ? [...visibleSteps, { status: normalized, label: normalized === "rejected" ? "Order rejected" : "Order cancelled", detail: normalized === "rejected" ? "This order was not accepted." : "This order was cancelled.", Icon: XCircle }] : visibleSteps;

  return <div className="mt-5 border-t border-border pt-5">
    <div className="flex items-center justify-between gap-3"><p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Order tracking</p><span className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] ${terminal ? "border-red-200 bg-red-50 text-red-800" : normalized === "delivered" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-sky-200 bg-sky-50 text-sky-800"}`}>{normalized === "approved" ? "Confirmed" : normalized === "processing" ? "Processing" : normalized === "shipped" ? "In transit" : titleCaseOrderStatus(normalized)}</span></div>
    <ol className="mt-5 grid gap-0 sm:grid-cols-5">
      {steps.map((step, index) => {
        const event = historyByStatus.get(step.status);
        const stepIndex = standardSteps.findIndex((item) => item.status === step.status);
        const completed = terminal ? index < steps.length - 1 : stepIndex <= reachedIndex;
        const active = step.status === normalized;
        const Icon = step.Icon;
        return <li key={step.status} className="relative flex gap-3 pb-5 sm:block sm:pb-0 sm:pr-3">
          {index < steps.length - 1 && <span className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px sm:left-6 sm:top-3 sm:h-px sm:w-[calc(100%-0.75rem)] ${completed ? "bg-primary" : "bg-border"}`} />}
          <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: completed || active ? "hsl(var(--primary))" : "hsl(var(--border))" }}><Icon className={`size-3.5 ${completed || active ? "text-primary" : "text-muted-foreground"}`} /></div>
          <div className="sm:mt-3"><p className={`text-xs font-medium ${active ? "text-primary" : completed ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{event?.changedAt ? formatOrderDate(event.changedAt) : active || completed ? formatOrderDate(order.createdAt) : step.detail}</p></div>
        </li>;
      })}
    </ol>
    <p className="mt-1 text-xs text-muted-foreground">Current status: <span className="font-medium capitalize text-primary">{titleCaseOrderStatus(normalized)}</span></p>
  </div>;
}

function titleCaseOrderStatus(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatOrderDate(value: string | undefined) {
  if (!value) return "Date pending";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Date pending";
}

function CustomerProfileNoWishlist({ customer, orders, saved, editing, saving, onSave, onEditing, onSignOut }: { customer: { name: string; email: string; phone: string }; orders: CustomerOrder[]; saved: typeof sarees; editing: boolean; saving: boolean; onSave: (event: React.FormEvent<HTMLFormElement>) => void; onEditing: () => void; onSignOut: () => void }) {
  const initials = customer.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BB";
  return <><section className="fabric-texture border-b border-border"><div className="mx-auto max-w-7xl px-5 py-14"><p className="text-eyebrow text-muted-foreground">Your Bawari Banno</p><h1 className="mt-3 font-display text-5xl font-light text-primary">Welcome back, {customer.name || "to your account"}</h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">Your personal space for heirlooms, orders and the little details that make every drape feel yours.</p></div></section><section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[260px_1fr] lg:gap-14"><aside><div className="border border-border bg-card p-6"><div className="flex items-center gap-4"><div className="flex size-16 items-center justify-center rounded-full bg-primary text-2xl text-white">{initials}</div><div className="min-w-0"><p className="font-display text-2xl text-primary">{customer.name || "Bawari customer"}</p><p className="mt-1 truncate text-xs text-muted-foreground">+91 {customer.phone}</p></div></div><div className="mt-6 border-t border-border pt-5"><p className="text-eyebrow text-muted-foreground">Verified mobile</p><p className="mt-1 flex items-center gap-1 text-sm text-emerald-deep"><Check className="size-3.5" /> OTP verified</p></div></div><button type="button" onClick={onSignOut} className="mt-5 flex items-center gap-2 px-2 text-sm text-muted-foreground hover:text-primary"><LogOut className="size-4" /> Sign out</button></aside><div className="min-w-0"><section className="border border-border bg-card p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-eyebrow text-muted-foreground">Personal details</p><h2 className="mt-2 font-display text-3xl font-light text-primary">Account details</h2></div><button type="button" onClick={onEditing} className="inline-flex items-center gap-2 text-sm text-primary"><Pencil className="size-3.5" />{editing ? "Cancel" : "Edit details"}</button></div><form onSubmit={onSave} className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2"><label><span className="text-eyebrow text-muted-foreground">Full name</span><input name="name" defaultValue={customer.name} readOnly={!editing} required className={`mt-2 w-full border-b bg-transparent py-2 text-sm outline-none ${editing ? "border-gold" : "border-border"}`} /></label><label><span className="text-eyebrow text-muted-foreground">Email address</span><input name="email" type="email" defaultValue={customer.email} readOnly={!editing} required className={`mt-2 w-full border-b bg-transparent py-2 text-sm outline-none ${editing ? "border-gold" : "border-border"}`} /></label><label><span className="text-eyebrow text-muted-foreground">Phone number</span><input value={`+91 ${customer.phone}`} readOnly className="mt-2 w-full border-b border-border bg-transparent py-2 text-sm outline-none" /></label>{editing && <button disabled={saving} className="w-fit bg-primary px-7 py-3 text-eyebrow text-white disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button>}</form></section><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="border border-border bg-card p-5"><p className="font-display text-4xl font-light text-primary">{orders.length}</p><p className="mt-2 text-eyebrow text-muted-foreground">Orders</p></div><Link to="/wishlist" className="border border-border bg-card p-5 transition-colors hover:border-gold"><p className="font-display text-4xl font-light text-primary">{saved.length}</p><p className="mt-2 text-eyebrow text-muted-foreground">Saved favourites</p><p className="mt-2 text-xs text-primary">View wishlist →</p></Link></div><section className="mt-8 border border-border bg-card p-6 sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="text-eyebrow text-muted-foreground">Your purchases</p><h2 className="mt-2 font-display text-3xl font-light text-primary">Order history</h2></div><span className="text-sm text-muted-foreground">{orders.length} order{orders.length === 1 ? "" : "s"}</span></div>{orders.length === 0 ? <p className="mt-6 border-t border-border pt-6 text-sm text-muted-foreground">Your order details will appear here after checkout.</p> : <div className="mt-6 space-y-4">{orders.map((order) => <article key={order._id ?? order.orderId} className="border border-border p-5"><div className="flex flex-wrap items-center gap-4"><div className="min-w-40 flex-1"><p className="font-medium text-primary">{order.orderId ?? "Order"}</p><p className="mt-1 text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Date unavailable"}</p><p className="mt-1 text-xs text-muted-foreground">{order.items?.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0) ?? 0} item(s) · {order.paymentMethod ?? "Demo payment"}</p></div><div className="text-right"><p className="font-medium text-primary">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</p><p className="mt-1 text-xs capitalize text-emerald-deep">{titleCaseOrderStatus(order.status ?? "pending")} · {order.paymentStatus ?? "pending"}</p></div></div><CustomerOrderTimeline order={order} /></article>)}</div>}</section></div></section></>;
}

function LegacyCustomerProfileNoWishlist({ customer, orders, saved, editing, saving, onSave, onEditing, onSignOut }: { customer: { name: string; email: string; phone: string }; orders: CustomerOrder[]; saved: typeof sarees; editing: boolean; saving: boolean; onSave: (event: React.FormEvent<HTMLFormElement>) => void; onEditing: () => void; onSignOut: () => void }) {
  const initials = customer.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BB";
  return <><section className="fabric-texture border-b border-border"><div className="mx-auto max-w-7xl px-5 py-14"><p className="text-eyebrow text-muted-foreground">Your Bawari Banno</p><h1 className="mt-3 font-display text-5xl font-light text-primary">Welcome back, {customer.name || "to your account"}</h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">Your personal space for heirlooms, orders and the little details that make every drape feel yours.</p></div></section><section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[260px_1fr] lg:gap-14"><aside><div className="border border-border bg-card p-6"><div className="flex items-center gap-4"><div className="flex size-16 items-center justify-center rounded-full bg-primary text-2xl text-white">{initials}</div><div className="min-w-0"><p className="font-display text-2xl text-primary">{customer.name || "Bawari customer"}</p><p className="mt-1 truncate text-xs text-muted-foreground">+91 {customer.phone}</p></div></div><div className="mt-6 border-t border-border pt-5"><p className="text-eyebrow text-muted-foreground">Verified mobile</p><p className="mt-1 flex items-center gap-1 text-sm text-emerald-deep"><Check className="size-3.5" /> OTP verified</p></div></div><button type="button" onClick={onSignOut} className="mt-5 flex items-center gap-2 px-2 text-sm text-muted-foreground hover:text-primary"><LogOut className="size-4" /> Sign out</button></aside><div className="min-w-0"><section className="border border-border bg-card p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-eyebrow text-muted-foreground">Personal details</p><h2 className="mt-2 font-display text-3xl font-light text-primary">Account details</h2></div><button type="button" onClick={onEditing} className="inline-flex items-center gap-2 text-sm text-primary"><Pencil className="size-3.5" />{editing ? "Cancel" : "Edit details"}</button></div><form onSubmit={onSave} className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2"><label><span className="text-eyebrow text-muted-foreground">Full name</span><input name="name" defaultValue={customer.name} readOnly={!editing} required className={`mt-2 w-full border-b bg-transparent py-2 text-sm outline-none ${editing ? "border-gold" : "border-border"}`} /></label><label><span className="text-eyebrow text-muted-foreground">Email address</span><input name="email" type="email" defaultValue={customer.email} readOnly={!editing} required className={`mt-2 w-full border-b bg-transparent py-2 text-sm outline-none ${editing ? "border-gold" : "border-border"}`} /></label><label><span className="text-eyebrow text-muted-foreground">Phone number</span><input value={`+91 ${customer.phone}`} readOnly className="mt-2 w-full border-b border-border bg-transparent py-2 text-sm outline-none" /></label>{editing && <button disabled={saving} className="w-fit bg-primary px-7 py-3 text-eyebrow text-white disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button>}</form></section><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="border border-border bg-card p-5"><p className="font-display text-4xl font-light text-primary">{orders.length}</p><p className="mt-2 text-eyebrow text-muted-foreground">Orders</p></div><Link to="/wishlist" className="border border-border bg-card p-5 transition-colors hover:border-gold"><p className="font-display text-4xl font-light text-primary">{saved.length}</p><p className="mt-2 text-eyebrow text-muted-foreground">Saved favourites</p><p className="mt-2 text-xs text-primary">View wishlist →</p></Link></div><section className="mt-8 border border-border bg-card p-6 sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="text-eyebrow text-muted-foreground">Your purchases</p><h2 className="mt-2 font-display text-3xl font-light text-primary">Order history</h2></div><span className="text-sm text-muted-foreground">{orders.length} order{orders.length === 1 ? "" : "s"}</span></div>{orders.length === 0 ? <p className="mt-6 border-t border-border pt-6 text-sm text-muted-foreground">Your order details will appear here after checkout.</p> : <div className="mt-6 divide-y divide-border border-y border-border">{orders.map((order) => <div key={order._id ?? order.orderId} className="flex flex-wrap items-center gap-4 py-4"><div className="min-w-40 flex-1"><p className="font-medium text-primary">{order.orderId ?? "Order"}</p><p className="mt-1 text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Date unavailable"}</p><p className="mt-1 text-xs text-muted-foreground">{order.items?.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0) ?? 0} item(s) · {order.paymentMethod ?? "Demo payment"}</p></div><div className="text-right"><p className="font-medium text-primary">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</p><p className="mt-1 text-xs capitalize text-emerald-deep">{order.status ?? "pending"} · {order.paymentStatus ?? "pending"}</p></div></div>)}</div>}</section></div></section></>;
}

function CustomerProfile({ customer, orders, saved, editing, saving, onSave, onEditing, onSignOut }: { customer: { name: string; email: string; phone: string }; orders: CustomerOrder[]; saved: typeof sarees; editing: boolean; saving: boolean; onSave: (event: React.FormEvent<HTMLFormElement>) => void; onEditing: () => void; onSignOut: () => void }) {
  const initials = customer.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "BB";
  return <SiteShell><section className="fabric-texture border-b border-border"><div className="mx-auto max-w-7xl px-5 py-14"><p className="text-eyebrow text-muted-foreground">Your Bawari Banno</p><h1 className="mt-3 font-display text-5xl font-light text-primary">Welcome back, {customer.name || "to your account"}</h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">Your personal space for heirlooms, orders and the little details that make every drape feel yours.</p></div></section><section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[260px_1fr] lg:gap-14"><aside><div className="border border-border bg-card p-6"><div className="flex items-center gap-4"><div className="flex size-16 items-center justify-center rounded-full bg-primary text-2xl text-white">{initials}</div><div className="min-w-0"><p className="font-display text-2xl text-primary">{customer.name || "Bawari customer"}</p><p className="mt-1 truncate text-xs text-muted-foreground">+91 {customer.phone}</p></div></div><div className="mt-6 border-t border-border pt-5"><p className="text-eyebrow text-muted-foreground">Verified mobile</p><p className="mt-1 flex items-center gap-1 text-sm text-emerald-deep"><Check className="size-3.5" /> OTP verified</p></div></div><button type="button" onClick={onSignOut} className="mt-5 flex items-center gap-2 px-2 text-sm text-muted-foreground hover:text-primary"><LogOut className="size-4" /> Sign out</button></aside><div className="min-w-0"><section className="border border-border bg-card p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-eyebrow text-muted-foreground">Personal details</p><h2 className="mt-2 font-display text-3xl font-light text-primary">Account details</h2></div><button type="button" onClick={onEditing} className="inline-flex items-center gap-2 text-sm text-primary"><Pencil className="size-3.5" />{editing ? "Cancel" : "Edit details"}</button></div><form onSubmit={onSave} className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2"><label><span className="text-eyebrow text-muted-foreground">Full name</span><input name="name" defaultValue={customer.name} readOnly={!editing} required className={`mt-2 w-full border-b bg-transparent py-2 text-sm outline-none ${editing ? "border-gold" : "border-border"}`} /></label><label><span className="text-eyebrow text-muted-foreground">Email address</span><input name="email" type="email" defaultValue={customer.email} readOnly={!editing} required className={`mt-2 w-full border-b bg-transparent py-2 text-sm outline-none ${editing ? "border-gold" : "border-border"}`} /></label><label><span className="text-eyebrow text-muted-foreground">Phone number</span><input value={`+91 ${customer.phone}`} readOnly className="mt-2 w-full border-b border-border bg-transparent py-2 text-sm outline-none" /></label>{editing && <button disabled={saving} className="w-fit bg-primary px-7 py-3 text-eyebrow text-white disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button>}</form></section><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="border border-border bg-card p-5"><p className="font-display text-4xl font-light text-primary">{orders.length}</p><p className="mt-2 text-eyebrow text-muted-foreground">Orders</p></div><div className="border border-border bg-card p-5"><p className="font-display text-4xl font-light text-primary">{saved.length}</p><p className="mt-2 text-eyebrow text-muted-foreground">Saved favourites</p></div><div className="border border-border bg-card p-5"><p className="font-display text-4xl font-light text-primary">0</p><p className="mt-2 text-eyebrow text-muted-foreground">Saved addresses</p></div></div><section className="mt-8 border border-border bg-card p-6 sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="text-eyebrow text-muted-foreground">Your purchases</p><h2 className="mt-2 font-display text-3xl font-light text-primary">Order history</h2></div><span className="text-sm text-muted-foreground">{orders.length} order{orders.length === 1 ? "" : "s"}</span></div>{orders.length === 0 ? <p className="mt-6 border-t border-border pt-6 text-sm text-muted-foreground">Your order details will appear here after checkout.</p> : <div className="mt-6 divide-y divide-border border-y border-border">{orders.map((order) => <div key={order._id ?? order.orderId} className="flex flex-wrap items-center gap-4 py-4"><div className="min-w-40 flex-1"><p className="font-medium text-primary">{order.orderId ?? "Order"}</p><p className="mt-1 text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Date unavailable"}</p><p className="mt-1 text-xs text-muted-foreground">{order.items?.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0) ?? 0} item(s) · {order.paymentMethod ?? "Demo payment"}</p></div><div className="text-right"><p className="font-medium text-primary">₹{Number(order.total ?? 0).toLocaleString("en-IN")}</p><p className="mt-1 text-xs capitalize text-emerald-deep">{order.status ?? "pending"} · {order.paymentStatus ?? "pending"}</p></div></div>)}</div>}</section><section className="mt-8 border border-border bg-card p-6 sm:p-8"><div className="flex items-end justify-between gap-4"><div><p className="text-eyebrow text-muted-foreground">Your saved edit</p><h2 className="mt-2 font-display text-3xl font-light text-primary">Wishlist</h2></div><span className="text-sm text-muted-foreground">{saved.length} item{saved.length === 1 ? "" : "s"}</span></div>{saved.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Your wishlist is empty. Tap the heart on any saree to save it here.</p> : <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">{saved.map((saree) => <Link key={saree.id} to="/products/$productId" params={{ productId: saree.id }} className="group"><img src={saree.image} alt={saree.name} className="aspect-[3/4] w-full object-cover" /><p className="mt-2 text-sm text-primary">{saree.name}</p><p className="mt-1 text-sm">{formatPrice(saree.price)}</p></Link>)}</div>}</section></div></section></SiteShell>;
}

function RegistrationFlow({
  step,
  phone,
  otp,
  onPhoneChange,
  onOtpChange,
  onStepChange,
  onComplete,
  onViewDemo,
}: {
  step: RegistrationStep;
  phone: string;
  otp: string;
  onPhoneChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onStepChange: (step: RegistrationStep) => void;
  onComplete: () => void;
  onViewDemo: () => void;
}) {
  const progress = { phone: 1, otp: 2, details: 3, complete: 4 }[step];

  return (
    <section className="fabric-texture border-b border-border">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-5 py-12 lg:grid-cols-[1fr_440px] lg:py-16">
        <div className="max-w-xl">
          <p className="text-eyebrow text-muted-foreground">A private space for your edit</p>
          <h1 className="mt-4 font-display text-5xl font-light leading-[1.05] text-primary md:text-7xl">
            Your heirlooms, all in one place.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Create your Bawari Banno account to save favourite sarees, follow every delivery and
            keep your preferred address ready for the next occasion.
          </p>
          <div className="mt-10 grid max-w-md gap-4 sm:grid-cols-3">
            {[
              ["01", "One-tap checkout"],
              ["02", "Order updates"],
              ["03", "Saved favourites"],
            ].map(([number, label]) => (
              <div key={number} className="border-t border-gold pt-3">
                <p className="text-eyebrow text-primary">{number}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border bg-card p-6 shadow-[0_20px_50px_-35px_rgba(60,20,20,0.5)] sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-eyebrow text-muted-foreground">Welcome to Bawari Banno</p>
              <h2 className="mt-2 font-display text-3xl font-light text-primary">
                {step === "complete" ? "Your account is ready" : "Create your account"}
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">{progress}/4</span>
          </div>

          <div className="mt-6 flex gap-1">
            {[1, 2, 3, 4].map((item) => (
              <span
                key={item}
                className={`h-1 flex-1 ${item <= progress ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>

          {step === "phone" && (
            <form
              className="mt-9"
              onSubmit={(event) => {
                event.preventDefault();
                if (phone.replace(/\D/g, "").length < 10) {
                  toast.error("Please enter a valid 10-digit mobile number.");
                  return;
                }
                onStepChange("otp");
                toast.success("Demo OTP sent to your mobile number.");
              }}
            >
              <label htmlFor="phone" className="text-eyebrow text-muted-foreground">
                Mobile number
              </label>
              <div className="mt-2 flex border-b border-border focus-within:border-gold">
                <span className="py-3 text-sm text-muted-foreground">+91</span>
                <input
                  id="phone"
                  required
                  inputMode="numeric"
                  value={phone}
                  onChange={(event) => onPhoneChange(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"
                  placeholder="98765 43210"
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                We’ll send a one-time password to verify your number. No password required.
              </p>
              <button type="submit" className="mt-8 w-full bg-primary px-6 py-3.5 text-eyebrow text-primary-foreground hover:bg-ink">
                Send OTP
              </button>
            </form>
          )}

          {step === "otp" && (
            <form
              className="mt-9"
              onSubmit={(event) => {
                event.preventDefault();
                if (otp !== "123456") {
                  toast.error("Use the demo OTP 123456 to continue.");
                  return;
                }
                onStepChange("details");
              }}
            >
              <div className="flex items-center gap-2 text-sm text-foreground">
                <ShieldCheck className="size-4 text-emerald-deep" strokeWidth={1.5} />
                OTP sent to +91 {phone}
              </div>
              <label htmlFor="otp" className="mt-7 block text-eyebrow text-muted-foreground">
                Enter 6-digit OTP
              </label>
              <input
                id="otp"
                required
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-2 w-full border-b border-border bg-transparent py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-gold"
                placeholder="••••••"
              />
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Demo mode: enter <span className="text-primary">123456</span> to verify.
              </p>
              <button type="submit" className="mt-8 w-full bg-primary px-6 py-3.5 text-eyebrow text-primary-foreground hover:bg-ink">
                Verify OTP
              </button>
              <button type="button" onClick={() => onStepChange("phone")} className="mt-4 w-full text-xs text-muted-foreground hover:text-primary">
                Change mobile number
              </button>
            </form>
          )}

          {step === "details" && (
            <form
              className="mt-9 space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                onStepChange("complete");
              }}
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your mobile number is verified. Tell us a little about yourself.
              </p>
              {[
                ["full-name", "Full name", "Ananya Kapoor"],
                ["email", "Email address", "ananya@example.com"],
              ].map(([id, label, placeholder]) => (
                <label key={id} htmlFor={id} className="block">
                  <span className="text-eyebrow text-muted-foreground">{label}</span>
                  <input id={id} required type={id === "email" ? "email" : "text"} placeholder={placeholder} className="mt-2 w-full border-b border-border bg-transparent py-3 text-sm outline-none focus:border-gold" />
                </label>
              ))}
              <button type="submit" className="w-full bg-primary px-6 py-3.5 text-eyebrow text-primary-foreground hover:bg-ink">
                Complete registration
              </button>
            </form>
          )}

          {step === "complete" && (
            <div className="mt-9">
              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-deep text-primary-foreground">
                <Check className="size-7" strokeWidth={1.5} />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                Your account is verified and ready. Your saved details, addresses and orders will
                be available from your profile dashboard.
              </p>
              <button type="button" onClick={onComplete} className="mt-8 w-full bg-primary px-6 py-3.5 text-eyebrow text-primary-foreground hover:bg-ink">
                Go to my profile
              </button>
            </div>
          )}

          <button type="button" onClick={onViewDemo} className="mt-7 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary">
            Already registered? View demo profile <ChevronRight className="size-3" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </section>
  );
}

function ProfileDashboard({
  activeLink,
  editing,
  onActiveLinkChange,
  onEditingChange,
  onSignOut,
}: {
  activeLink: string;
  editing: boolean;
  onActiveLinkChange: (label: string) => void;
  onEditingChange: (editing: boolean) => void;
  onSignOut: () => void;
}) {
  return (
    <>
      <section className="fabric-texture border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:py-16">
          <p className="text-eyebrow text-muted-foreground">Your Bawari Banno</p>
          <h1 className="mt-3 font-display text-5xl font-light text-primary md:text-6xl">Welcome back, Ananya</h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Your personal space for heirlooms, orders and the little details that make every drape feel yours.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[260px_1fr] lg:gap-14 lg:py-16">
        <aside>
          <div className="border border-border bg-card p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">AK</div>
              <div className="min-w-0">
                <p className="font-display text-2xl text-primary">Ananya Kapoor</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">+91 98765 43210</p>
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-eyebrow text-muted-foreground">Verified mobile</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-emerald-deep"><Check className="size-3.5" /> OTP verified</p>
            </div>
          </div>

          <nav className="mt-5 border border-border bg-background p-2">
            {profileLinks.map(({ label, icon: Icon }) => {
              const active = activeLink === label;
              return (
                <button key={label} type="button" onClick={() => onActiveLinkChange(label)} className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors ${active ? "bg-secondary text-primary" : "text-foreground/70 hover:bg-secondary/60 hover:text-primary"}`}>
                  <Icon className="size-4" strokeWidth={1.5} />
                  <span>{label}</span>
                  {active && <ChevronRight className="ml-auto size-3.5" strokeWidth={1.5} />}
                </button>
              );
            })}
            <button type="button" onClick={onSignOut} className="mt-1 flex w-full items-center gap-3 border-t border-border px-3 py-3 text-left text-sm text-foreground/60 hover:text-primary">
              <LogOut className="size-4" strokeWidth={1.5} /> Sign out
            </button>
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="grid gap-4 sm:grid-cols-3">
            {[["03", "Orders placed"], ["07", "Saved sarees"], ["240", "Loyalty points"]].map(([value, label]) => (
              <div key={label} className="border border-border bg-card p-5">
                <p className="font-display text-4xl font-light text-primary">{value}</p>
                <p className="mt-2 text-eyebrow text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <section className="mt-10 border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-eyebrow text-muted-foreground">Personal details</p><h2 className="mt-2 font-display text-3xl font-light text-primary">Account details</h2></div>
              <button type="button" onClick={() => onEditingChange(!editing)} className="inline-flex items-center gap-2 text-sm text-primary hover:text-ink"><Pencil className="size-3.5" strokeWidth={1.5} />{editing ? "Cancel" : "Edit details"}</button>
            </div>
            <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {[["Full name", "Ananya Kapoor"], ["Email address", "ananya@example.com"], ["Phone number", "+91 98765 43210"], ["Date of birth", "18 September 1995"]].map(([label, value]) => (
                <label key={label} className="block"><span className="text-eyebrow text-muted-foreground">{label}</span><input defaultValue={value} readOnly={!editing} className={`mt-2 w-full border-b bg-transparent py-2 text-sm text-foreground outline-none ${editing ? "border-gold focus:border-primary" : "border-border cursor-default"}`} /></label>
              ))}
            </div>
            {editing && <button type="button" onClick={() => { onEditingChange(false); toast.success("Your profile details have been updated."); }} className="mt-8 bg-primary px-7 py-3 text-eyebrow text-primary-foreground hover:bg-ink">Save changes</button>}
          </section>

          <section className="mt-10">
            <div className="flex items-end justify-between gap-4"><div><p className="text-eyebrow text-muted-foreground">Most recent</p><h2 className="mt-2 font-display text-3xl font-light text-primary">Your orders</h2></div><button type="button" onClick={() => onActiveLinkChange("My orders")} className="text-sm text-primary hover:text-ink">View all</button></div>
            <div className="mt-5 divide-y divide-border border-y border-border">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center gap-4 py-4">
                  <img src={order.item.image} alt="" className="size-16 object-cover" />
                  <div className="min-w-0 flex-1"><p className="text-sm text-foreground">{order.id}</p><p className="mt-1 text-xs text-muted-foreground">{order.date}</p></div>
                  <div className="hidden text-right sm:block"><p className="text-sm text-foreground">{formatPrice(order.item.price)}</p><p className="mt-1 text-xs text-emerald-deep">{order.status}</p></div>
                  <ChevronRight className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="border border-border bg-card p-6">
              <div className="flex items-center justify-between"><p className="text-eyebrow text-muted-foreground">Saved address</p><button type="button" onClick={() => onActiveLinkChange("Saved addresses")} className="text-primary hover:text-ink"><Pencil className="size-3.5" /></button></div>
              <p className="mt-4 font-display text-2xl text-primary">Home</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Ananya Kapoor<br />24, Lotus Enclave, Adyar<br />Chennai 600020</p>
              <p className="mt-4 text-xs text-emerald-deep">Default delivery address</p>
            </div>
            <div className="border border-gold/40 bg-secondary/40 p-6">
              <p className="text-eyebrow text-primary">Saved favourites</p>
              <p className="mt-3 font-display text-2xl text-primary">Seven sarees waiting</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your saved edit is ready whenever the occasion calls.</p>
              <Link to="/products" className="mt-5 inline-flex items-center gap-2 text-sm text-primary hover:text-ink">View wishlist <Heart className="size-4" strokeWidth={1.5} /></Link>
            </div>
          </section>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border border-gold/40 bg-secondary/40 p-6">
            <div><p className="text-eyebrow text-primary">A little more room for beauty</p><p className="mt-2 font-display text-2xl text-primary">Continue browsing your edit</p></div>
            <Link to="/products" className="inline-flex items-center gap-2 text-sm text-primary hover:text-ink">Explore sarees <ChevronRight className="size-4" strokeWidth={1.5} /></Link>
          </div>
        </div>
      </section>
    </>
  );
}