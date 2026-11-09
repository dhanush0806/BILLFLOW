import { query, withTransaction } from '../config/database';
import { Invoice } from '../types';

export class PosRepository {
  static async checkout(
    businessId: string,
    data: {
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      items: Array<{
        productId: string;
        name: string;
        quantity: number;
        unitPrice: number;
        discountAmount?: number;
        taxRate?: number;
      }>;
      discountType?: 'percentage' | 'fixed';
      discountValue?: number;
      taxRate?: number;
      paymentMethod: 'cash' | 'upi' | 'card' | 'split' | 'bank_transfer' | 'other';
      splitPayments?: Record<string, number>;
      tenderedCash?: number;
      notes?: string;
      idempotencyKey?: string;
    },
    userId: string
  ): Promise<{ invoice: Invoice; receiptData: any }> {
    return await withTransaction(async (client) => {
      // 0. Prevent duplicate checkout via Idempotency Key check
      if (data.idempotencyKey) {
        const dupCheck = await client.query<Invoice>(
          'SELECT * FROM invoices WHERE business_id = $1 AND idempotency_key = $2',
          [businessId, data.idempotencyKey]
        );
        if (dupCheck.rowCount && dupCheck.rowCount > 0) {
          const existingInv = dupCheck.rows[0];
          const itemsRes = await client.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [existingInv.id]);
          const shopRes = await client.query('SELECT * FROM businesses WHERE id = $1', [businessId]);
          const userRes = await client.query('SELECT full_name FROM users WHERE id = $1', [existingInv.cashier_id || userId]);
          return {
            invoice: existingInv,
            receiptData: {
              billNumber: existingInv.invoice_number,
              invoiceNumber: existingInv.invoice_number,
              billDate: existingInv.created_at,
              shopName: shopRes.rows[0]?.name,
              shopAddress: shopRes.rows[0]?.address,
              shopPhone: shopRes.rows[0]?.phone,
              shopGstin: shopRes.rows[0]?.tax_id,
              currency: shopRes.rows[0]?.currency || '₹',
              customerName: existingInv.customer_snapshot?.name || 'Walk-in Customer',
              customerPhone: existingInv.customer_snapshot?.phone || '',
              cashierName: userRes.rows[0]?.full_name || 'Staff Cashier',
              items: itemsRes.rows,
              subtotal: parseFloat(existingInv.subtotal as any),
              discountAmount: parseFloat(existingInv.discount_amount as any),
              taxAmount: parseFloat(existingInv.tax_amount as any),
              grandTotal: parseFloat(existingInv.grand_total as any),
              paymentMethod: existingInv.payment_method,
            },
          };
        }
      }

      // 1. Resolve Customer (Default to Walk-in if not provided)
      let customerId = data.customerId;
      let customerName = data.customerName || 'Walk-in Customer';
      let customerPhone = data.customerPhone || '';

      if (!customerId) {
        const walkinRes = await client.query(
          `SELECT id, name, phone FROM customers 
           WHERE business_id = $1 AND (name ILIKE '%Walk-in%' OR email = 'walkin@metroretail.local')
           LIMIT 1`,
          [businessId]
        );
        if (walkinRes.rowCount && walkinRes.rowCount > 0) {
          customerId = walkinRes.rows[0].id;
          if (!data.customerName) customerName = walkinRes.rows[0].name;
        } else {
          const newWalkin = await client.query(
            `INSERT INTO customers (business_id, name, email, phone, customer_type, notes)
             VALUES ($1, 'Walk-in Customer', 'walkin@metroretail.local', '+91 00000 00000', 'individual', 'Standard walk-in customer')
             RETURNING id, name`,
            [businessId]
          );
          customerId = newWalkin.rows[0].id;
          customerName = newWalkin.rows[0].name;
        }
      } else {
        const custRes = await client.query(
          'SELECT name, phone FROM customers WHERE business_id = $1 AND id = $2',
          [businessId, customerId]
        );
        if (custRes.rowCount && custRes.rowCount > 0) {
          customerName = custRes.rows[0].name;
          customerPhone = custRes.rows[0].phone || '';
        }
      }

      // 2. Fetch business settings to generate unique Bill Number safely
      const settingsRes = await client.query(
        'SELECT * FROM business_settings WHERE business_id = $1 FOR UPDATE',
        [businessId]
      );
      let prefix = 'BILL-';
      let nextNum = 1001;
      let defaultTaxRate = 5.0;

      if (settingsRes.rowCount && settingsRes.rowCount > 0) {
        const s = settingsRes.rows[0];
        prefix = s.invoice_prefix || 'BILL-';
        nextNum = s.next_invoice_number || 1001;
        defaultTaxRate = parseFloat(s.default_tax_rate || 5.0);
      }

      const billNumber = `${prefix}${nextNum}`;

      // Increment next invoice number
      await client.query(
        'UPDATE business_settings SET next_invoice_number = $1, updated_at = CURRENT_TIMESTAMP WHERE business_id = $2',
        [nextNum + 1, businessId]
      );

      // 3. Lock products and validate stock strictly (Never allow negative stock)
      const productIds = Array.from(new Set(data.items.map((it) => it.productId)));
      const pRes = await client.query(
        `SELECT id, name, sku, barcode, selling_price, price, stock_quantity, tax_rate, is_active, is_archived
         FROM products
         WHERE business_id = $1 AND id = ANY($2::uuid[])
         FOR UPDATE`,
        [businessId, productIds]
      );

      const productMap = new Map<string, any>();
      for (const row of pRes.rows) {
        productMap.set(row.id, row);
      }

      let subtotal = 0;
      let itemTaxTotal = 0;
      let itemDiscountTotal = 0;
      const processedItems = [];

      for (const item of data.items) {
        const p = productMap.get(item.productId);
        if (!p) {
          throw new Error(`Product not found in inventory: ${item.name}`);
        }
        if (p.is_archived || p.is_active === false) {
          throw new Error(`Product "${p.name}" is archived or inactive.`);
        }

        const availableStock = parseFloat(p.stock_quantity);
        const reqQty = Math.round(item.quantity * 100) / 100;

        if (reqQty <= 0) {
          throw new Error(`Quantity for "${p.name}" must be greater than zero.`);
        }

        if (availableStock < reqQty) {
          throw new Error(
            `Insufficient stock for "${p.name}". Available stock: ${availableStock}, Requested: ${reqQty}`
          );
        }

        // Use product unit price (fallback to provided or DB price)
        const unitPrice = item.unitPrice > 0 ? item.unitPrice : parseFloat(p.selling_price || p.price || 0);
        const itemDiscount = Math.max(0, item.discountAmount || 0);
        const lineBase = Math.max(0, reqQty * unitPrice - itemDiscount);

        const lineTaxRate = item.taxRate !== undefined ? item.taxRate : parseFloat(p.tax_rate || defaultTaxRate);
        const lineTax = Math.round(((lineBase * lineTaxRate) / 100) * 100) / 100;
        const lineTotal = Math.round((lineBase + lineTax) * 100) / 100;

        subtotal += Math.round(reqQty * unitPrice * 100) / 100;
        itemDiscountTotal += itemDiscount;
        itemTaxTotal += lineTax;

        processedItems.push({
          productId: p.id,
          name: p.name,
          quantity: reqQty,
          unitPrice,
          discountAmount: itemDiscount,
          taxRate: lineTaxRate,
          taxAmount: lineTax,
          lineTotal,
          currentStock: availableStock,
        });
      }

      // Bill-level discount calculation
      let billDiscount = 0;
      if (data.discountType === 'percentage') {
        const pct = Math.min(100, Math.max(0, data.discountValue || 0));
        billDiscount = Math.round((((subtotal - itemDiscountTotal) * pct) / 100) * 100) / 100;
      } else {
        billDiscount = Math.min(subtotal - itemDiscountTotal, Math.max(0, data.discountValue || 0));
      }

      const totalDiscount = Math.round((itemDiscountTotal + billDiscount) * 100) / 100;
      const taxableAmount = Math.max(0, subtotal - totalDiscount);
      const grandTotal = Math.round((taxableAmount + itemTaxTotal) * 100) / 100;

      // Validate split payment totals if split method selected
      if (data.paymentMethod === 'split') {
        if (!data.splitPayments || Object.keys(data.splitPayments).length === 0) {
          throw new Error('Split payment details are required when split payment method is selected.');
        }
        const splitSum = Object.values(data.splitPayments).reduce((sum, val) => sum + (Number(val) || 0), 0);
        if (Math.abs(splitSum - grandTotal) > 0.05) {
          throw new Error(`Split payment sum (${splitSum.toFixed(2)}) must match grand total (${grandTotal.toFixed(2)}).`);
        }
      }

      // 4. Insert Invoice (Bill)
      const invRes = await client.query<Invoice>(
        `INSERT INTO invoices (
          business_id, customer_id, invoice_number, invoice_date, due_date, status,
          subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount,
          other_charges, grand_total, paid_amount, balance_due, notes, is_pos,
          payment_method, split_payments, cashier_id, customer_snapshot, idempotency_key
        ) VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE, 'paid',
                  $4, $5, $6, $7, $8, $9,
                  0, $10, $10, 0, $11, true,
                  $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          businessId,
          customerId,
          billNumber,
          subtotal,
          data.discountType || 'fixed',
          data.discountValue || 0,
          totalDiscount,
          data.taxRate || defaultTaxRate,
          itemTaxTotal,
          grandTotal,
          data.notes || 'POS Counter Sale',
          data.paymentMethod,
          data.splitPayments ? JSON.stringify(data.splitPayments) : null,
          userId,
          JSON.stringify({ name: customerName, phone: customerPhone }),
          data.idempotencyKey || null,
        ]
      );
      const invoice = invRes.rows[0];

      // 5. Insert Invoice Items, Deduct Stock, and Record Stock Movements
      for (const item of processedItems) {
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id, item_type, product_id, name, quantity, unit_price,
            discount_amount, tax_rate, tax_amount, line_total
          ) VALUES ($1, 'product', $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            invoice.id,
            item.productId,
            item.name,
            item.quantity,
            item.unitPrice,
            item.discountAmount,
            item.taxRate,
            item.taxAmount,
            item.lineTotal,
          ]
        );

        const beforeStock = item.currentStock;
        const afterStock = Math.round((beforeStock - item.quantity) * 100) / 100;
        if (afterStock < 0) {
          throw new Error(`Negative stock prevented for product "${item.name}".`);
        }

        // Deduct product stock
        await client.query(
          'UPDATE products SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [afterStock, item.productId]
        );

        // Record stock movement audit trail
        await client.query(
          `INSERT INTO stock_movements (
            business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
            reference_id, reference_number, reason, created_by
          ) VALUES ($1, $2, 'sale', $3, $4, $5, $6, $7, 'POS Counter Sale', $8)`,
          [
            businessId,
            item.productId,
            -item.quantity,
            beforeStock,
            afterStock,
            invoice.id,
            billNumber,
            userId,
          ]
        );
      }

      // 6. Record Payment Entries
      if (data.paymentMethod === 'split' && data.splitPayments) {
        let splitIdx = 1;
        for (const [method, amount] of Object.entries(data.splitPayments)) {
          const numAmount = Number(amount);
          if (numAmount > 0) {
            await client.query(
              `INSERT INTO payments (
                business_id, invoice_id, customer_id, payment_number, payment_date,
                amount, payment_method, transaction_reference, notes, recorded_by
              ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, 'POS Split Payment', $8)`,
              [
                businessId,
                invoice.id,
                customerId,
                `PAY-${billNumber}-${splitIdx++}`,
                numAmount,
                method,
                `POS Split: ${method.toUpperCase()}`,
                userId,
              ]
            );
          }
        }
      } else {
        await client.query(
          `INSERT INTO payments (
            business_id, invoice_id, customer_id, payment_number, payment_date,
            amount, payment_method, transaction_reference, notes, recorded_by
          ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, 'POS Complete Payment', $8)`,
          [
            businessId,
            invoice.id,
            customerId,
            `PAY-${billNumber}`,
            grandTotal,
            data.paymentMethod,
            `POS: ${data.paymentMethod.toUpperCase()}`,
            userId,
          ]
        );
      }

      // 7. Prepare Complete Receipt Data
      const shopRes = await client.query('SELECT * FROM businesses WHERE id = $1', [businessId]);
      const shop = shopRes.rows[0];

      const cashierRes = await client.query('SELECT full_name FROM users WHERE id = $1', [userId]);
      const cashierName = cashierRes.rows[0]?.full_name || 'Staff Cashier';

      const changeTendered =
        data.paymentMethod === 'cash' && data.tenderedCash && data.tenderedCash > grandTotal
          ? Math.round((data.tenderedCash - grandTotal) * 100) / 100
          : 0;

      const receiptData = {
        shopName: shop.name,
        shopAddress: shop.address,
        shopPhone: shop.phone,
        shopGstin: shop.tax_id,
        currency: shop.currency || '₹',
        billNumber,
        invoiceNumber: billNumber,
        billDate: new Date().toISOString(),
        cashierName,
        customerName,
        customerPhone,
        items: processedItems,
        subtotal,
        discountAmount: totalDiscount,
        taxAmount: itemTaxTotal,
        grandTotal,
        paymentMethod: data.paymentMethod,
        splitPayments: data.splitPayments || null,
        tenderedCash: data.tenderedCash,
        changeTendered,
        receiptHeader: settingsRes.rows[0]?.receipt_header || 'Tax Invoice / Retail Receipt',
        receiptFooter: settingsRes.rows[0]?.receipt_footer || 'Thank you for shopping with us! Please visit again.',
      };

      return {
        invoice,
        receiptData,
      };
    });
  }
}
