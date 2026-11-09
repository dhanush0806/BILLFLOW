-- Migration: 003_grocery_shop_refinements.sql
-- Grocery Shop enhancements: Strict role enforcement, Purchases receiving workflow, and Idempotency

-- 1. Enforce strict 2-role system: 'admin' (Shop Owner) and 'cashier' (Staff)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role = 'cashier' WHERE role NOT IN ('admin', 'cashier');
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'cashier'));

-- 2. Restrict business type to grocery/retail shop
ALTER TABLE businesses ALTER COLUMN business_type SET DEFAULT 'shop';
UPDATE businesses SET business_type = 'shop' WHERE business_type IS NULL OR business_type != 'shop';

-- 3. Enhance Purchases table to support 'ordered' vs 'received' goods workflow
ALTER TABLE purchases 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (status IN ('ordered', 'received', 'cancelled')),
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reference_invoice_number VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(business_id, status);

-- 4. Ensure product stock fields support decimal quantities (e.g., kg/liters for grocery items)
ALTER TABLE products 
  ALTER COLUMN stock_quantity TYPE NUMERIC(10, 2) USING stock_quantity::NUMERIC(10, 2),
  ALTER COLUMN minimum_stock TYPE NUMERIC(10, 2) USING minimum_stock::NUMERIC(10, 2);

-- 5. Add idempotency_key to invoices to safely prevent duplicate checkout
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_idempotency 
  ON invoices(business_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 6. Indexes for rapid POS barcode and SKU scanning
CREATE INDEX IF NOT EXISTS idx_products_barcode_fast ON products(business_id, barcode) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_products_sku_fast ON products(business_id, sku) WHERE is_archived = FALSE;
