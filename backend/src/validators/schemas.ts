import { z } from 'zod';

export const registerBusinessSchema = z.object({
  businessName: z.string().min(2, 'Shop name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessType: z.enum(['shop']).default('shop'),
  address: z.string().optional(),
  currency: z.string().default('₹'),
  taxId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Valid email is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  recoveryPin: z.string().min(4, 'Recovery verification code is required'),
});

export const businessSetupSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  currency: z.string().min(1).default('₹'),
  invoicePrefix: z.string().min(1).default('BILL-'),
  nextInvoiceNumber: z.number().int().positive().default(1001),
  defaultTaxRate: z.number().min(0).max(100).default(5),
  taxName: z.string().default('GST'),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  lowStockThreshold: z.number().int().min(1).default(10),
  defaultDueDays: z.number().int().min(0).default(0),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingOrIfsc: z.string().optional(),
  upiId: z.string().optional(),
  paymentInstructions: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  email: z.string().email('Valid email is required').or(z.literal('')).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  customerType: z.enum(['individual', 'business']).default('individual'),
  taxNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  code: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  category: z.string().default('General'),
  brand: z.string().optional(),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative').default(0),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  unit: z.string().default('pcs'),
  stockQuantity: z.number().min(0).default(0),
  minimumStock: z.number().int().min(0).default(5),
  taxRate: z.number().min(0).max(100).default(0),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  companyName: z.string().optional(),
  email: z.string().email().or(z.literal('')).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  notes: z.string().optional(),
});

export const purchaseItemSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  productName: z.string().min(1),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitCost: z.number().min(0, 'Cost price cannot be negative'),
  taxRate: z.number().min(0).max(100).default(0),
});

export const purchaseSchema = z.object({
  supplierId: z.string().uuid('Valid supplier ID is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  items: z.array(purchaseItemSchema).min(1, 'At least one purchase item is required'),
  taxAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  shippingAmount: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other']).default('bank_transfer'),
  status: z.enum(['ordered', 'received', 'cancelled']).default('received'),
  referenceInvoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const supplierPaymentSchema = z.object({
  supplierId: z.string().uuid('Valid supplier ID is required'),
  purchaseId: z.string().uuid().nullable().optional(),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  adjustmentType: z.enum([
    'adjustment_damage',
    'adjustment_expired',
    'adjustment_recount',
    'adjustment_manual',
  ]),
  quantity: z.number().positive('Adjustment quantity must be greater than zero'),
  isAddition: z.boolean().default(false), // true if adding stock, false if deducting
  reason: z.string().min(3, 'Detailed reason is required for every stock adjustment'),
});

export const posCheckoutSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Valid product ID is required'),
        name: z.string().min(1),
        quantity: z.number().positive('Quantity must be greater than zero'),
        unitPrice: z.number().min(0),
        discountAmount: z.number().min(0).default(0),
        taxRate: z.number().min(0).max(100).default(0),
      })
    )
    .min(1, 'Cart cannot be empty'),
  discountType: z.enum(['percentage', 'fixed']).default('fixed'),
  discountValue: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'split', 'bank_transfer', 'other']).default('cash'),
  splitPayments: z.record(z.string(), z.number()).optional(),
  tenderedCash: z.number().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const salesReturnItemSchema = z.object({
  invoiceItemId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid('Valid product ID is required'),
  productName: z.string().min(1),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPrice: z.number().min(0),
  refundAmount: z.number().min(0),
  isResalable: z.boolean().default(true),
  reason: z.string().optional(),
});

export const salesReturnSchema = z.object({
  invoiceId: z.string().uuid('Original Bill ID is required'),
  returnDate: z.string().min(1, 'Return date is required'),
  reason: z.string().min(2, 'Return reason is required'),
  refundMethod: z.enum(['cash', 'upi', 'card', 'store_credit', 'other']).default('cash'),
  notes: z.string().optional(),
  items: z.array(salesReturnItemSchema).min(1, 'At least one item must be returned'),
});

export const staffUserSchema = z.object({
  fullName: z.string().min(2, 'Staff name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'cashier']).default('cashier'),
  phone: z.string().optional(),
});

export const invoiceItemSchema = z.object({
  itemType: z.enum(['product', 'service', 'custom']).default('product'),
  productId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discountAmount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
});

export const invoiceSchema = z.object({
  customerId: z.string().uuid('Valid customer ID is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  discountType: z.enum(['percentage', 'fixed']).default('fixed'),
  discountValue: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  otherCharges: z.number().min(0).default(0),
  notes: z.string().optional(),
  paymentInstructions: z.string().optional(),
  status: z.enum(['draft', 'issued']).default('draft'),
});

export const updateInvoiceSchema = invoiceSchema.partial();

export const paymentSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice ID is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'card', 'split', 'other']),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  title: z.string().min(2, 'Expense title is required'),
  category: z.enum([
    'rent',
    'electricity',
    'internet',
    'transport',
    'maintenance',
    'supplies',
    'marketing',
    'salary',
    'other',
  ]),
  amount: z.number().positive('Amount must be greater than zero'),
  expenseDate: z.string().min(1, 'Expense date is required'),
  paymentMethod: z.string().default('cash'),
  description: z.string().optional(),
});

export const businessProfileSchema = z.object({
  name: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().min(1),
  taxId: z.string().optional(),
  paymentInstructions: z.string().optional(),
});

export const invoiceSettingsSchema = z.object({
  invoicePrefix: z.string().min(1),
  nextInvoiceNumber: z.number().int().positive(),
  defaultDueDays: z.number().int().min(0),
  defaultTaxRate: z.number().min(0).max(100),
  defaultNotes: z.string().optional(),
  defaultTerms: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingOrIfsc: z.string().optional(),
  upiId: z.string().optional(),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  taxName: z.string().optional(),
  taxInclusive: z.boolean().optional(),
  lowStockThreshold: z.number().int().min(1).optional(),
  barcodeEnabled: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});
