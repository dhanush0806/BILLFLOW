-- Migration: 002_retail_shop_transform.sql
-- Transform BillFlow into pure Retail Shop Management & POS Software

-- 1. Ensure businesses table has retail defaults
ALTER TABLE businesses ALTER COLUMN business_type SET DEFAULT 'shop';
UPDATE businesses SET business_type = 'shop' WHERE business_type IN ('freelancer', 'service');

-- 2. Update user roles to support 'admin' and 'cashier'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'cashier', 'customer'));
UPDATE users SET role = 'admin' WHERE role NOT IN ('admin', 'cashier');

-- 3. Enhance business_settings for retail shop & receipt printing
ALTER TABLE business_settings 
  ADD COLUMN IF NOT EXISTS receipt_header TEXT DEFAULT 'Welcome to our store!',
  ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT 'Thank you for shopping with us! Please visit again.',
  ADD COLUMN IF NOT EXISTS tax_name VARCHAR(50) DEFAULT 'GST',
  ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS barcode_enabled BOOLEAN DEFAULT TRUE;

-- 4. Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_category_per_business UNIQUE (business_id, name)
);
CREATE INDEX IF NOT EXISTS idx_categories_business ON categories(business_id);

-- 5. Enhance Products Table for Retail Management
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku VARCHAR(100),
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS minimum_stock INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Sync selling_price with existing price if not set
UPDATE products SET selling_price = price WHERE selling_price = 0.00 AND price > 0.00;
UPDATE products SET purchase_price = ROUND(selling_price * 0.7, 2) WHERE purchase_price = 0.00 AND selling_price > 0.00;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(business_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(business_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 6. Create Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(100),
    outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers(business_id);

-- 7. Create Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_number VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partially_paid', 'unpaid')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_purchase_number_per_business UNIQUE (business_id, purchase_number)
);
CREATE INDEX IF NOT EXISTS idx_purchases_business ON purchases(business_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);

-- 8. Create Purchase Items Table
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);

-- 9. Create Supplier Payments Table
CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    purchase_id UUID REFERENCES purchases(id) ON DELETE SET NULL,
    payment_number VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other')),
    reference VARCHAR(150),
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_business ON supplier_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);

-- 10. Enhance Invoices Table for Retail POS Bills
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS is_pos BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS split_payments JSONB,
  ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Allow optional email for retail customers
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;

-- 11. Create Sales Returns Table
CREATE TABLE IF NOT EXISTS sales_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    return_number VARCHAR(100) NOT NULL,
    return_date DATE NOT NULL,
    total_refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    refund_method VARCHAR(50) NOT NULL CHECK (refund_method IN ('cash', 'upi', 'card', 'store_credit', 'other')),
    reason VARCHAR(255) NOT NULL,
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_return_number_per_business UNIQUE (business_id, return_number)
);
CREATE INDEX IF NOT EXISTS idx_returns_business ON sales_returns(business_id);
CREATE INDEX IF NOT EXISTS idx_returns_invoice ON sales_returns(invoice_id);

-- 12. Create Sales Return Items Table
CREATE TABLE IF NOT EXISTS sales_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_return_id UUID NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_resalable BOOLEAN DEFAULT TRUE,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON sales_return_items(sales_return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product ON sales_return_items(product_id);

-- 13. Create Stock Movements Table (Comprehensive Audit Trail for Every Stock Change)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
      'sale', 'purchase', 'return', 'adjustment_damage', 'adjustment_expired', 'adjustment_recount', 'adjustment_manual', 'initial_stock'
    )),
    quantity_change NUMERIC(10, 2) NOT NULL,
    quantity_before NUMERIC(10, 2) NOT NULL,
    quantity_after NUMERIC(10, 2) NOT NULL,
    reference_id UUID,
    reference_number VARCHAR(100),
    reason TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_business ON stock_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);

-- 14. Update Expenses Category Check
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check CHECK (
  category IN ('rent', 'electricity', 'internet', 'transport', 'maintenance', 'supplies', 'marketing', 'salary', 'other')
);

