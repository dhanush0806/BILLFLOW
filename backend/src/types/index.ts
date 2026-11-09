export type BusinessType = 'shop';
export type UserRole = 'admin' | 'cashier';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'card' | 'split' | 'cheque' | 'other';
export type PaymentStatus = 'recorded' | 'reversed';
export type ItemType = 'product' | 'service' | 'custom';
export type CustomerType = 'individual' | 'business';
export type ExpenseCategory = 'rent' | 'electricity' | 'internet' | 'transport' | 'supplies' | 'marketing' | 'salary' | 'other';
export type NotificationType = 'invoice_issued' | 'payment_received' | 'invoice_overdue' | 'invoice_cancelled' | 'low_stock' | 'system';
export type StockMovementType =
  | 'sale'
  | 'purchase'
  | 'return'
  | 'adjustment_damage'
  | 'adjustment_expired'
  | 'adjustment_recount'
  | 'adjustment_manual'
  | 'initial_stock';

export interface Business {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  phone?: string;
  business_type: BusinessType;
  address?: string;
  logo_url?: string;
  currency: string;
  tax_id?: string;
  payment_instructions?: string;
  setup_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  business_id: string;
  role: UserRole;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BusinessSettings {
  id: string;
  business_id: string;
  invoice_prefix: string;
  next_invoice_number: number;
  default_due_days: number;
  default_tax_rate: number;
  default_notes: string;
  default_terms: string;
  bank_name?: string;
  account_number?: string;
  routing_or_ifsc?: string;
  upi_id?: string;
  receipt_header?: string;
  receipt_footer?: string;
  tax_name?: string;
  tax_inclusive?: boolean;
  low_stock_threshold?: number;
  barcode_enabled?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  product_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  id: string;
  business_id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  customer_type: CustomerType;
  tax_number?: string;
  notes?: string;
  is_archived: boolean;
  total_invoices?: number;
  total_spent?: number;
  outstanding_balance?: number;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  code?: string;
  sku?: string;
  barcode?: string;
  category_id?: string | null;
  category: string;
  brand?: string;
  purchase_price: number;
  selling_price: number;
  price: number;
  unit: string;
  stock_quantity: number;
  minimum_stock: number;
  tax_rate: number;
  image_url?: string;
  is_active: boolean;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  category: string;
  default_price: number;
  unit: string;
  is_active: boolean;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  outstanding_balance: number;
  notes?: string;
  is_archived: boolean;
  total_purchases?: number;
  created_at: Date;
  updated_at: Date;
}

export interface PurchaseItem {
  id?: string;
  purchase_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  tax_rate?: number;
  tax_amount?: number;
  line_total: number;
}

export interface Purchase {
  id: string;
  business_id: string;
  supplier_id: string;
  purchase_number: string;
  purchase_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_status: 'paid' | 'partially_paid' | 'unpaid';
  status: 'ordered' | 'received' | 'cancelled';
  received_at?: Date | string | null;
  reference_invoice_number?: string;
  notes?: string;
  supplier_name?: string;
  supplier_company?: string;
  items?: PurchaseItem[];
  created_at: Date;
  updated_at: Date;
}

export interface SupplierPayment {
  id: string;
  business_id: string;
  supplier_id: string;
  purchase_id?: string | null;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
  recorded_by?: string;
  supplier_name?: string;
  company_name?: string;
  recorder_name?: string;
  created_at: Date;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  item_type: ItemType;
  product_id?: string | null;
  service_id?: string | null;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  line_total: number;
  returned_quantity?: number;
}

export interface Invoice {
  id: string;
  business_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  other_charges: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
  notes?: string;
  payment_instructions?: string;
  customer_snapshot?: any;
  is_pos?: boolean;
  payment_method?: string;
  split_payments?: Record<string, number> | null;
  cashier_id?: string | null;
  cashier_name?: string;
  created_at: Date;
  updated_at: Date;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  items?: InvoiceItem[];
}

export interface SalesReturnItem {
  id?: string;
  sales_return_id?: string;
  invoice_item_id?: string | null;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
  is_resalable: boolean;
  reason?: string;
}

export interface SalesReturn {
  id: string;
  business_id: string;
  invoice_id: string;
  customer_id?: string | null;
  return_number: string;
  return_date: string;
  total_refund_amount: number;
  refund_method: string;
  reason: string;
  notes?: string;
  recorded_by?: string;
  invoice_number?: string;
  customer_name?: string;
  recorder_name?: string;
  items?: SalesReturnItem[];
  created_at: Date;
}

export interface StockMovement {
  id: string;
  business_id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reference_id?: string | null;
  reference_number?: string;
  reason: string;
  created_by?: string | null;
  product_name?: string;
  sku?: string;
  barcode?: string;
  creator_name?: string;
  created_at: Date;
}

export interface Payment {
  id: string;
  business_id: string;
  invoice_id: string;
  customer_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_reference?: string;
  notes?: string;
  status: PaymentStatus;
  recorded_by?: string;
  created_at: Date;
  updated_at: Date;
  invoice_number?: string;
  customer_name?: string;
  recorder_name?: string;
}

export interface Expense {
  id: string;
  business_id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  payment_method: string;
  description?: string;
  attachment_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  business_id: string;
  user_id?: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  is_read: boolean;
  created_at: Date;
}

export interface AuthPayload {
  userId: string;
  businessId: string;
  role: UserRole;
  email: string;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
