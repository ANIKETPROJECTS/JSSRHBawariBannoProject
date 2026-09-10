import type { Db } from "mongodb";

export type AuditFields = {
  createdBy?: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
};

export type VendorStatus = "active" | "inactive";
export type PurchaseInvoicePaymentStatus = "paid" | "pending" | "partially_paid";
export type PurchaseInvoicePaymentMethod = "prepaid" | "cod" | "credit" | "bank_transfer";
export type PurchaseInvoiceTaxType = "igst" | "cgst_sgst";
export type PurchaseInvoiceStatus = "draft" | "posted" | "cancelled";
export type StockBatchSourceType = "purchase" | "opening_balance" | "adjustment";
export type StockBatchStatus = "in_stock" | "sold_out" | "void";
export type ExpensePaymentMode = "cash" | "upi" | "card" | "bank_transfer";

export type VendorDocument = AuditFields & {
  vendorCode: string;
  businessName: string;
  legalName?: string;
  gstin?: string;
  state?: string;
  stateCode?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  bankDetails?: string;
  status: VendorStatus;
  notes?: string;
};

export type PurchaseInvoiceDocument = AuditFields & {
  vendorId: string;
  vendorInvoiceNumber: string;
  invoiceDate: Date;
  placeOfSupply?: string;
  paymentMethod: PurchaseInvoicePaymentMethod;
  paymentStatus: PurchaseInvoicePaymentStatus;
  status: PurchaseInvoiceStatus;
  subtotal: number;
  taxType?: PurchaseInvoiceTaxType;
  taxRate: number;
  taxAmount: number;
  totalPayable: number;
  invoiceFileId?: string;
  receivedDate?: Date;
  tripId?: string;
  notes?: string;
  postedAt?: Date;
  postedBy?: string;
};

export type PurchaseInvoiceLineDocument = AuditFields & {
  purchaseInvoiceId: string;
  vendorProductCode: string;
  itemName: string;
  quantityPurchased: number;
  costPricePerUnit: number;
  lineAmount: number;
  productId?: string;
  variantId?: string;
  stockBatchId?: string;
};

export type StockBatchDocument = AuditFields & {
  productId: string;
  variantId?: string;
  vendorId?: string;
  vendorProductCode?: string;
  sourceType: StockBatchSourceType;
  sourcePurchaseInvoiceId?: string;
  sourcePurchaseInvoiceLineId?: string;
  sourceLabel?: string;
  quantityReceived: number;
  quantityRemaining: number;
  costPricePerUnit?: number;
  receivedDate: Date;
  status: StockBatchStatus;
};

export type ExpenseDocument = AuditFields & {
  date: Date;
  category: string;
  description: string;
  amount: number;
  paymentMode: ExpensePaymentMode;
  vendorId?: string;
  tripId?: string;
  receiptFileId?: string;
};

export type BusinessTripDocument = AuditFields & {
  tripName: string;
  purpose?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
};

export type AuditLogDocument = {
  entityType: string;
  entityId: string;
  action: "created" | "updated" | "posted" | "corrected" | "cancelled" | "deleted";
  actor: string;
  changes?: Record<string, unknown>;
  createdAt: Date;
};

export const businessCollectionNames = {
  vendors: "vendors",
  purchaseInvoices: "purchase_invoices",
  purchaseInvoiceLines: "purchase_invoice_lines",
  stockBatches: "stock_batches",
  expenses: "expenses",
  businessTrips: "business_trips",
  auditLogs: "audit_logs",
} as const;

export const businessSettingsDefaults = {
  _id: "store",
  shippingCharges: 250,
  freeShippingThreshold: 15000,
  businessState: "",
  businessStateCode: "",
};

export function auditCreateFields(actor: string, now = new Date()) {
  return { createdBy: actor, createdAt: now, updatedBy: actor, updatedAt: now };
}

export function auditUpdateFields(actor: string, now = new Date()) {
  return { updatedBy: actor, updatedAt: now };
}

export async function ensureBusinessIndexes(database: Db) {
  await Promise.all([
    database.collection(businessCollectionNames.vendors).createIndex({ vendorCode: 1 }, { unique: true }),
    database.collection(businessCollectionNames.vendors).createIndex({ businessName: 1, status: 1 }),
    database.collection(businessCollectionNames.purchaseInvoices).createIndex({ vendorId: 1, invoiceDate: -1 }),
    database.collection(businessCollectionNames.purchaseInvoices).createIndex({ paymentStatus: 1, status: 1 }),
    database.collection(businessCollectionNames.purchaseInvoices).createIndex({ tripId: 1 }, { sparse: true }),
    database.collection(businessCollectionNames.purchaseInvoiceLines).createIndex({ purchaseInvoiceId: 1 }),
    database.collection(businessCollectionNames.purchaseInvoiceLines).createIndex({ productId: 1, vendorProductCode: 1 }),
    database.collection(businessCollectionNames.stockBatches).createIndex({ productId: 1, variantId: 1, receivedDate: 1 }),
    database.collection(businessCollectionNames.stockBatches).createIndex({ status: 1, quantityRemaining: 1 }),
    database.collection(businessCollectionNames.stockBatches).createIndex({ sourcePurchaseInvoiceId: 1 }, { sparse: true }),
    database.collection(businessCollectionNames.expenses).createIndex({ date: -1 }),
    database.collection(businessCollectionNames.expenses).createIndex({ vendorId: 1, tripId: 1 }),
    database.collection(businessCollectionNames.businessTrips).createIndex({ startDate: -1 }),
    database.collection(businessCollectionNames.auditLogs).createIndex({ entityType: 1, entityId: 1, createdAt: -1 }),
  ]);
}