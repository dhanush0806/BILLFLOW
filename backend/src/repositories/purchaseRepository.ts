import { query, withTransaction } from '../config/database';
import { Purchase, PurchaseItem, SupplierPayment } from '../types';

export class PurchaseRepository {
  static async list(params: {
    businessId: string;
    supplierId?: string;
    paymentStatus?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ purchases: Purchase[]; total: number }> {
    let where = 'WHERE p.business_id = $1';
    const values: any[] = [params.businessId];
    let idx = 2;

    if (params.supplierId) {
      where += ` AND p.supplier_id = $${idx}`;
      values.push(params.supplierId);
      idx++;
    }

    if (params.paymentStatus && params.paymentStatus !== 'all') {
      where += ` AND p.payment_status = $${idx}`;
      values.push(params.paymentStatus);
      idx++;
    }

    if (params.status && params.status !== 'all') {
      where += ` AND p.status = $${idx}`;
      values.push(params.status);
      idx++;
    }

    if (params.startDate) {
      where += ` AND p.purchase_date >= $${idx}`;
      values.push(params.startDate);
      idx++;
    }

    if (params.endDate) {
      where += ` AND p.purchase_date <= $${idx}`;
      values.push(params.endDate);
      idx++;
    }

    if (params.search) {
      where += ` AND (p.purchase_number ILIKE $${idx} OR s.name ILIKE $${idx} OR s.company_name ILIKE $${idx})`;
      values.push(`%${params.search}%`);
      idx++;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM purchases p JOIN suppliers s ON s.id = p.supplier_id ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    values.push(limit, offset);

    const res = await query<Purchase>(
      `SELECT p.*,
              s.name AS supplier_name,
              s.company_name AS supplier_company,
              (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) AS item_count
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       ${where}
       ORDER BY p.purchase_date DESC, p.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    return {
      purchases: res.rows,
      total,
    };
  }

  static async findById(businessId: string, id: string): Promise<Purchase | null> {
    const res = await query<Purchase>(
      `SELECT p.*,
              s.name AS supplier_name,
              s.company_name AS supplier_company,
              s.phone AS supplier_phone,
              s.email AS supplier_email,
              s.address AS supplier_address
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.business_id = $1 AND p.id = $2
       LIMIT 1`,
      [businessId, id]
    );

    if (res.rowCount === 0) return null;
    const purchase = res.rows[0];

    const itemsRes = await query<PurchaseItem>(
      `SELECT pi.*, p.sku, p.barcode
       FROM purchase_items pi
       LEFT JOIN products p ON p.id = pi.product_id
       WHERE pi.purchase_id = $1
       ORDER BY pi.created_at ASC`,
      [id]
    );
    purchase.items = itemsRes.rows;

    return purchase;
  }

  static async create(
    businessId: string,
    data: {
      supplierId: string;
      purchaseDate: string;
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitCost: number;
        taxRate?: number;
      }>;
      taxAmount?: number;
      discountAmount?: number;
      shippingAmount?: number;
      paidAmount?: number;
      paymentMethod?: string;
      status?: 'ordered' | 'received' | 'cancelled';
      referenceInvoiceNumber?: string;
      notes?: string;
    },
    userId: string
  ): Promise<Purchase> {
    return await withTransaction(async (client) => {
      // 1. Verify supplier
      const supRes = await client.query(
        'SELECT * FROM suppliers WHERE business_id = $1 AND id = $2 FOR UPDATE',
        [businessId, data.supplierId]
      );
      if (supRes.rowCount === 0) {
        throw new Error('Supplier not found');
      }

      // 2. Generate unique purchase number safely
      const countRes = await client.query(
        'SELECT COUNT(*) FROM purchases WHERE business_id = $1',
        [businessId]
      );
      const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
      const purchaseNumber = `PO-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

      // 3. Calculate subtotal & line totals
      let subtotal = 0;
      let calculatedTax = data.taxAmount || 0;
      const processedItems = data.items.map((item) => {
        const itemSubtotal = item.quantity * item.unitCost;
        const itemTax = (itemSubtotal * (item.taxRate || 0)) / 100;
        const lineTotal = itemSubtotal + itemTax;
        subtotal += itemSubtotal;
        if (!data.taxAmount) {
          calculatedTax += itemTax;
        }
        return {
          ...item,
          taxAmount: itemTax,
          lineTotal,
        };
      });

      const discount = data.discountAmount || 0;
      const shipping = data.shippingAmount || 0;
      const totalAmount = Math.max(0, subtotal + calculatedTax + shipping - discount);
      const paid = Math.min(totalAmount, data.paidAmount || 0);
      const balanceDue = Math.max(0, totalAmount - paid);

      let paymentStatus: 'paid' | 'partially_paid' | 'unpaid' = 'unpaid';
      if (paid >= totalAmount && totalAmount > 0) {
        paymentStatus = 'paid';
      } else if (paid > 0) {
        paymentStatus = 'partially_paid';
      }

      const purchaseStatus = data.status || 'received';
      const isReceived = purchaseStatus === 'received';

      // 4. Insert Purchase
      const purRes = await client.query<Purchase>(
        `INSERT INTO purchases (
          business_id, supplier_id, purchase_number, purchase_date,
          subtotal, tax_amount, discount_amount, shipping_amount, total_amount,
          paid_amount, balance_due, payment_status, status, received_at,
          reference_invoice_number, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          businessId,
          data.supplierId,
          purchaseNumber,
          data.purchaseDate,
          subtotal,
          calculatedTax,
          discount,
          shipping,
          totalAmount,
          paid,
          balanceDue,
          paymentStatus,
          purchaseStatus,
          isReceived ? new Date() : null,
          data.referenceInvoiceNumber || null,
          data.notes || null,
        ]
      );
      const purchase = purRes.rows[0];

      // 5. Insert Items & Increment Product Stock ONLY IF goods are received
      for (const item of processedItems) {
        await client.query(
          `INSERT INTO purchase_items (
            purchase_id, product_id, product_name, quantity, unit_cost, tax_rate, tax_amount, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            purchase.id,
            item.productId,
            item.productName,
            item.quantity,
            item.unitCost,
            item.taxRate || 0,
            item.taxAmount,
            item.lineTotal,
          ]
        );

        if (isReceived) {
          const pRes = await client.query(
            'SELECT stock_quantity, purchase_price FROM products WHERE id = $1 FOR UPDATE',
            [item.productId]
          );
          if (pRes.rowCount && pRes.rowCount > 0) {
            const currentStock = parseFloat(pRes.rows[0].stock_quantity);
            const newStock = Math.round((currentStock + item.quantity) * 100) / 100;

            await client.query(
              `UPDATE products 
               SET stock_quantity = $1, purchase_price = $2, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $3`,
              [newStock, item.unitCost, item.productId]
            );

            await client.query(
              `INSERT INTO stock_movements (
                business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
                reference_id, reference_number, reason, created_by
              ) VALUES ($1, $2, 'purchase', $3, $4, $5, $6, $7, 'Goods received via purchase order', $8)`,
              [
                businessId,
                item.productId,
                item.quantity,
                currentStock,
                newStock,
                purchase.id,
                purchaseNumber,
                userId,
              ]
            );
          }
        }
      }

      // 6. Record Supplier Payment if initial payment made
      if (paid > 0) {
        const payNum = `SPAY-${Date.now().toString().slice(-6)}`;
        await client.query(
          `INSERT INTO supplier_payments (
            business_id, supplier_id, purchase_id, payment_number, payment_date,
            amount, payment_method, reference, notes, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            businessId,
            data.supplierId,
            purchase.id,
            payNum,
            data.purchaseDate,
            paid,
            data.paymentMethod || 'bank_transfer',
            `Purchase ${purchaseNumber}`,
            'Initial purchase payment',
            userId,
          ]
        );
      }

      // 7. Update Supplier Outstanding Balance (+ balanceDue)
      if (balanceDue > 0) {
        await client.query(
          `UPDATE suppliers 
           SET outstanding_balance = outstanding_balance + $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [balanceDue, data.supplierId]
        );
      }

      return purchase;
    });
  }

  // Receive purchased goods: increments stock only when received, and prevents adding twice!
  static async receiveGoods(businessId: string, purchaseId: string, userId: string): Promise<Purchase> {
    return await withTransaction(async (client) => {
      const purRes = await client.query<Purchase>(
        'SELECT * FROM purchases WHERE business_id = $1 AND id = $2 FOR UPDATE',
        [businessId, purchaseId]
      );

      if (purRes.rowCount === 0) {
        throw new Error('Purchase order not found');
      }

      const purchase = purRes.rows[0];

      if (purchase.status === 'received') {
        throw new Error('Purchased goods have already been received and stock already updated.');
      }

      const itemsRes = await client.query<PurchaseItem>(
        'SELECT * FROM purchase_items WHERE purchase_id = $1',
        [purchaseId]
      );

      for (const item of itemsRes.rows) {
        const pRes = await client.query(
          'SELECT stock_quantity, purchase_price FROM products WHERE id = $1 FOR UPDATE',
          [item.product_id]
        );
        if (pRes.rowCount && pRes.rowCount > 0) {
          const currentStock = parseFloat(pRes.rows[0].stock_quantity);
          const itemQty = parseFloat(item.quantity as any);
          const newStock = Math.round((currentStock + itemQty) * 100) / 100;

          await client.query(
            `UPDATE products 
             SET stock_quantity = $1, purchase_price = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3`,
            [newStock, item.unit_cost, item.product_id]
          );

          await client.query(
            `INSERT INTO stock_movements (
              business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
              reference_id, reference_number, reason, created_by
            ) VALUES ($1, $2, 'purchase', $3, $4, $5, $6, $7, 'Goods shipment received and verified', $8)`,
            [
              businessId,
              item.product_id,
              itemQty,
              currentStock,
              newStock,
              purchase.id,
              purchase.purchase_number,
              userId,
            ]
          );
        }
      }

      // Mark purchase status as received
      const updatedPur = await client.query<Purchase>(
        `UPDATE purchases 
         SET status = 'received', received_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1 
         RETURNING *`,
        [purchaseId]
      );

      return updatedPur.rows[0];
    });
  }

  static async recordPayment(
    businessId: string,
    data: {
      supplierId: string;
      purchaseId?: string | null;
      paymentDate: string;
      amount: number;
      paymentMethod: string;
      reference?: string;
      notes?: string;
    },
    userId: string
  ): Promise<SupplierPayment> {
    return await withTransaction(async (client) => {
      const payNum = `SPAY-${Date.now().toString().slice(-6)}`;

      const payRes = await client.query<SupplierPayment>(
        `INSERT INTO supplier_payments (
          business_id, supplier_id, purchase_id, payment_number, payment_date,
          amount, payment_method, reference, notes, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          businessId,
          data.supplierId,
          data.purchaseId || null,
          payNum,
          data.paymentDate,
          data.amount,
          data.paymentMethod,
          data.reference || null,
          data.notes || null,
          userId,
        ]
      );

      // Deduct from supplier outstanding balance
      await client.query(
        `UPDATE suppliers 
         SET outstanding_balance = GREATEST(0, outstanding_balance - $1), updated_at = CURRENT_TIMESTAMP 
         WHERE business_id = $2 AND id = $3`,
        [data.amount, businessId, data.supplierId]
      );

      // If linked to a purchase, update purchase paid_amount and balance_due
      if (data.purchaseId) {
        const pRes = await client.query(
          'SELECT total_amount, paid_amount FROM purchases WHERE id = $1 FOR UPDATE',
          [data.purchaseId]
        );
        if (pRes.rowCount && pRes.rowCount > 0) {
          const total = parseFloat(pRes.rows[0].total_amount);
          const currentPaid = parseFloat(pRes.rows[0].paid_amount);
          const newPaid = Math.min(total, currentPaid + data.amount);
          const newBalance = Math.max(0, total - newPaid);
          const status = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid';

          await client.query(
            `UPDATE purchases 
             SET paid_amount = $1, balance_due = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4`,
            [newPaid, newBalance, status, data.purchaseId]
          );
        }
      }

      return payRes.rows[0];
    });
  }
}
