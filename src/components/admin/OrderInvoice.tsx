import { Printer, X } from "lucide-react";
import storefrontLogo from "../../../attached_assets/Bawari_Banno_Horizontal_Transparent-01_1789242095079.png";

type InvoiceItem = {
  productId?: string;
  name?: string;
  quantity?: number;
  price?: number;
  variantColor?: string;
};

type InvoiceOrder = {
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress?: unknown;
  address?: unknown;
  items?: InvoiceItem[];
  subtotal?: number;
  shipping?: number;
  discount?: number;
  total?: number;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  transactionId?: string;
  createdAt?: string;
};

function money(value: unknown) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function addressLines(value: unknown) {
  if (!value) return [];
  if (typeof value === "string") return value.split(/\n|,/).map((line) => line.trim()).filter(Boolean);
  if (typeof value !== "object") return [];
  const address = value as Record<string, unknown>;
  return [
    address.name,
    address.line1,
    address.line2,
    [address.city, address.state, address.pincode].filter(Boolean).join(", "),
    address.phone,
  ].filter(Boolean).map(String);
}

function invoiceDate(value?: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

export function OrderInvoice({ order, onClose }: { order: InvoiceOrder; onClose: () => void }) {
  const shippingAddress = addressLines(order.shippingAddress ?? order.address);
  const lineItems = order.items ?? [];
  const subtotal = Number(order.subtotal ?? lineItems.reduce((sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 0), 0));
  const shipping = Number(order.shipping ?? 0);
  const discount = Number(order.discount ?? 0);

  return (
    <div className="invoice-print-overlay fixed inset-0 z-[70] overflow-y-auto bg-ink/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Invoice for ${order.orderId ?? "order"}`}>
      <div className="invoice-print-toolbar sticky top-0 z-10 mx-auto flex max-w-4xl items-center justify-between gap-3 border border-border bg-white p-3 shadow-sm">
        <p className="text-sm font-medium text-primary">Invoice preview · {order.orderId || "Order"}</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90">
            <Printer className="size-4" /> Print / Save as PDF
          </button>
          <button type="button" onClick={onClose} className="p-2 text-muted-foreground hover:text-primary" aria-label="Close invoice">
            <X className="size-5" />
          </button>
        </div>
      </div>

      <article className="invoice-print-sheet mx-auto my-5 max-w-4xl border border-[#e6d8c1] bg-[#fffdfa] px-5 py-6 shadow-xl sm:px-10 sm:py-10">
        <header className="overflow-hidden border border-[#5b1728]">
          <div className="flex flex-wrap items-center justify-between gap-6 bg-[#5b1728] px-5 py-6 sm:px-8 sm:py-7">
            <div>
              <div className="inline-flex rounded-sm bg-[#ED145B] px-3 py-1.5">
                <img src={storefrontLogo} alt="Bawari Banno" className="h-auto w-48 object-contain object-left sm:w-56" />
              </div>
              <p className="mt-3 max-w-xs text-xs leading-relaxed text-white/80">Handwoven sarees, chosen for colour, craft and the stories they carry forward.</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e5c98f]">Bawari Banno</p>
              <h1 className="mt-2 font-display text-3xl text-white">Order invoice</h1>
              <p className="mt-2 text-sm text-white/85">Invoice no. <span className="font-medium text-white">{order.orderId || "Order"}</span></p>
              <p className="mt-1 text-sm text-white/70">{invoiceDate(order.createdAt)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#b08a4b] bg-[#fffaf2] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[#765b34]">
            <span>Order confirmation</span>
            <span>Payment · {order.paymentStatus || "Pending"}</span>
          </div>
        </header>

        <section className="mt-7 grid gap-5 sm:grid-cols-2">
          <div className="rounded-sm border border-[#eadfce] border-t-2 border-t-[#b08a4b] bg-[#fffaf4] p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b7947]">Invoice to</p>
            <p className="mt-3 font-semibold text-[#18202d]">{order.customerName || "Customer"}</p>
            {order.customerPhone && <p className="mt-1 text-sm text-[#46515f]">+91 {order.customerPhone}</p>}
            {order.customerEmail && <p className="mt-1 break-all text-sm text-[#46515f]">{order.customerEmail}</p>}
          </div>
          <div className="rounded-sm border border-[#eadfce] border-t-2 border-t-[#b08a4b] bg-[#fffaf4] p-4 sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b7947]">Ship to</p>
            {shippingAddress.length ? <div className="mt-3 space-y-1 text-sm text-[#46515f]">{shippingAddress.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}</div> : <p className="mt-3 text-sm text-[#657080]">Shipping address not recorded</p>}
          </div>
        </section>

        <div className="mt-8 overflow-hidden border border-[#eadfce]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#5b1728] text-[10px] uppercase tracking-[0.14em] text-white">
              <tr><th className="px-3 py-3 sm:px-4">Item</th><th className="px-2 py-3 text-center">Qty</th><th className="px-3 py-3 text-right">Price</th><th className="px-3 py-3 text-right sm:px-4">Amount</th></tr>
            </thead>
            <tbody>
              {lineItems.length ? lineItems.map((item, index) => {
                const quantity = Number(item.quantity ?? 0);
                const price = Number(item.price ?? 0);
                return <tr key={`${item.productId ?? item.name ?? "item"}-${index}`} className="border-t border-[#eadfce] even:bg-[#fffaf4]">
                  <td className="px-3 py-3 sm:px-4"><p className="font-medium text-[#18202d]">{item.name || item.productId || "Saree"}</p>{item.variantColor && <p className="mt-1 text-xs text-[#657080]">Colour: {item.variantColor}</p>}</td>
                  <td className="px-2 py-3 text-center text-[#46515f]">{quantity}</td>
                  <td className="px-3 py-3 text-right text-[#46515f]">{money(price)}</td>
                  <td className="px-3 py-3 text-right font-medium text-[#18202d] sm:px-4">{money(price * quantity)}</td>
                </tr>;
              }) : <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-[#657080]">No item details recorded for this order.</td></tr>}
            </tbody>
          </table>
        </div>

        <section className="mt-6 flex flex-col-reverse justify-between gap-6 sm:flex-row">
          <div className="max-w-sm text-xs leading-relaxed text-[#657080]">
            <p><span className="font-medium text-[#18202d]">Payment:</span> {order.paymentMethod || "Not recorded"} · {order.paymentStatus || "pending"}</p>
            {order.transactionId && <p className="mt-1 break-all"><span className="font-medium text-[#18202d]">Transaction:</span> {order.transactionId}</p>}
            <p className="mt-4 text-[#9b7947]">Thank you for choosing Bawari Banno.</p>
          </div>
          <div className="w-full space-y-2 rounded-sm border border-[#eadfce] bg-[#fffaf4] p-4 text-sm sm:max-w-xs">
            <div className="flex justify-between gap-4"><span className="text-[#657080]">Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-[#657080]">Shipping</span><span>{shipping ? money(shipping) : "Free"}</span></div>
            {discount > 0 && <div className="flex justify-between gap-4"><span className="text-[#657080]">Discount</span><span>-{money(discount)}</span></div>}
            <div className="flex justify-between gap-4 border-t border-[#eadfce] pt-3 text-base font-semibold text-[#ED145B]"><span>Grand total</span><span>{money(order.total)}</span></div>
          </div>
        </section>
        <footer className="mt-8 border-t border-[#eadfce] pt-4 text-center text-[10px] uppercase tracking-[0.18em] text-[#9b7947]">Bawari Banno · Thank you for your order</footer>
      </article>
    </div>
  );
}
