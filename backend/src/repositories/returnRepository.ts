import { query, withTransaction } from '../config/database';
import { SalesReturn, SalesReturnItem } from '../types';

export class ReturnRepository {
  static async list(params: {
    businessId: string;
    invoiceId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ returns: SalesReturn[]; total: number }> {
    let where = 'WHERE sr.business_id = $1';
    const values: any[] = [params.businessId];
    let idx = 2;

    if (params.invoiceId) {
      where += ` AND sr.invoice_id = $${idx}`;
      values.push(params.invoiceId);
      idx++;
    }

    if (params.startDate) {
      where += ` AND sr.return_date >= $${idx}`;
      values.push(params.startDate);
      idx++;
    }

    if (params.endDate) {
      where += ` AND sr.return_date <= $${idx}`;
      values.push(params.endDate);
      idx++;
    }

    if (params.search) {
      where += ` AND (sr.return_number ILIKE $${idx} OR i.invoice_number ILIKE $${idx} OR c.name ILIKE $${idx})`;
      values.push(`%${params.search}%`);
      idx++;
    }

    const countRes = await query(
      `SELECT COUNT(*) 
       FROM sales_returns sr
       JOIN invoices i ON i.id = sr.invoice_id
       LEFT JOIN customers c ON c.id = sr.customer_id
       ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    values.push(limit, offset);

    const res = await query<SalesReturn>(
      `SELECT sr.*,
              i.invoice_number,
              COALESCE(c.name, 'Walk-in Customer') AS customer_name,
              u.full_name AS recorder_name,
              (SELECT COUNT(*) FROM sales_return_items WHERE sales_return_id = sr.id) AS item_count
       FROM sales_returns sr
       JOIN invoices i ON i.id = sr.invoice_id
       LEFT JOIN customers c ON c.id = sr.customer_id
       LEFT JOIN users u ON u.id = sr.recorded_by
       ${where}
       ORDER BY sr.return_date DESC, sr.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    return {
      returns: res.rows,
      total,
    };
  }

  static async findById(businessId: string, id: string): Promise<SalesReturn | null> {
    const res = await query<SalesReturn>(
      `SELECT sr.*,
              i.invoice_number,
              COALESCE(c.name, 'Walk-in Customer') AS customer_name,
              u.full_name AS recorder_name
       FROM sales_returns sr
       JOIN invoices i ON i.id = sr.invoice_id
       LEFT JOIN customers c ON c.id = sr.customer_id
       LEFT JOIN users u ON u.id = sr.recorded_by
       WHERE sr.business_id = $1 AND sr.id = $2
       LIMIT 1`,
      [businessId, id]
    );

    if (res.rowCount === 0) return null;
    const returnRecord = res.rows[0];

    const itemsRes = await query<SalesReturnItem>(
      `SELECT sri.*, p.sku, p.barcode
       FROM sales_return_items sri
       LEFT JOIN products p ON p.id = sri.product_id
       WHERE sri.sales_return_id = $1
       ORDER BY sri.created_at ASC`,
      [id]
    );
    returnRecord.items = itemsRes.rows;

    return returnRecord;
  }

  static async getBillReturnEligibility(businessId: string, invoiceId: string) {
    // 1. Fetch original invoice
    const invRes = await query(
      `SELECT i.*, COALESCE(c.name, 'Walk-in Customer') AS customer_name
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.business_id = $1 AND i.id = $2
       LIMIT 1`,
      [businessId, invoiceId]
    );

    if (invRes.rowCount === 0) {
      throw new Error('Bill not found');
    }
    const invoice = invRes.rows[0];

    // 2. Fetch items along with already returned quantities
    const itemsRes = await query(
      `SELECT ii.*,
              p.sku,
              p.barcode,
              COALESCE(SUM(sri.quantity), 0) AS total_returned_quantity,
              (ii.quantity - COALESCE(SUM(sri.quantity), 0)) AS remaining_returnable_quantity
       FROM invoice_items ii
       LEFT JOIN products p ON p.id = ii.product_id
       LEFT JOIN sales_return_items sri ON sri.invoice_item_id = ii.id
       WHERE ii.invoice_id = $1
       GROUP BY ii.id, p.sku, p.barcode
       ORDER BY ii.created_at ASC`,
      [invoiceId]
    );

    return {
      invoice,
      items: itemsRes.rows,
    };
  }

  static async createReturn(
    businessId: string,
    data: {
      invoiceId: string;
      returnDate: string;
      reason: string;
      refundMethod: 'cash' | 'upi' | 'card' | 'store_credit' | 'other';
      notes?: string;
      items: Array<{
        invoiceItemId?: string | null;
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        refundAmount: number;
        isResalable: boolean;
        reason?: string;
      }>;
    },
    userId: string
  ): Promise<SalesReturn> {
    return await withTransaction(async (client) => {
      // 1. Fetch invoice
      const invRes = await client.query(
        'SELECT * FROM invoices WHERE business_id = $1 AND id = $2 FOR UPDATE',
        [businessId, data.invoiceId]
      );
      if (invRes.rowCount === 0) {
        throw new Error('Original bill not found');
      }
      const invoice = invRes.rows[0];

      // 2. Fetch invoice items and check returned quantities
      const itemsRes = await client.query(
        `SELECT ii.*, COALESCE(SUM(sri.quantity), 0) AS returned_qty
         FROM invoice_items ii
         LEFT JOIN sales_return_items sri ON sri.invoice_item_id = ii.id
         WHERE ii.invoice_id = $1
         GROUP BY ii.id`,
        [data.invoiceId]
      );
      const itemMap = new Map();
      for (const row of itemsRes.rows) {
        itemMap.set(row.id, {
          totalQty: parseFloat(row.quantity),
          returnedQty: parseFloat(row.returned_qty),
          remaining: parseFloat(row.quantity) - parseFloat(row.returned_qty),
        });
      }

      // Validate that requested return quantities do not exceed remaining
      let calculatedRefundTotal = 0;
      for (const item of data.items) {
        if (item.invoiceItemId && itemMap.has(item.invoiceItemId)) {
          const stats = itemMap.get(item.invoiceItemId);
          if (item.quantity > stats.remaining + 0.001) {
            throw new Error(
              `Cannot return ${item.quantity} units of ${item.productName}. Only ${stats.remaining} units remaining eligible for return.`
            );
          }
        }
        calculatedRefundTotal += item.refundAmount;
      }

      // 3. Generate Return Number
      const countRes = await client.query(
        'SELECT COUNT(*) FROM sales_returns WHERE business_id = $1',
        [businessId]
      );
      const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
      const returnNumber = `RET-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

      // 4. Insert Sales Return
      const retRes = await client.query<SalesReturn>(
        `INSERT INTO sales_returns (
          business_id, invoice_id, customer_id, return_number, return_date,
          total_refund_amount, refund_method, reason, notes, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          businessId,
          data.invoiceId,
          invoice.customer_id,
          returnNumber,
          data.returnDate,
          calculatedRefundTotal,
          data.refundMethod,
          data.reason.trim(),
          data.notes || null,
          userId,
        ]
      );
      const salesReturn = retRes.rows[0];

      // 5. Insert Return Items & Update Inventory Stock
      for (const item of data.items) {
        await client.query(
          `INSERT INTO sales_return_items (
            sales_return_id, invoice_item_id, product_id, product_name,
            quantity, unit_price, refund_amount, is_resalable, reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            salesReturn.id,
            item.invoiceItemId || null,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.refundAmount,
            item.isResalable,
            item.reason || data.reason,
          ]
        );

        // Fetch current product stock
        const pRes = await client.query(
          'SELECT stock_quantity FROM products WHERE business_id = $1 AND id = $2 FOR UPDATE',
          [businessId, item.productId]
        );
        if (pRes.rowCount && pRes.rowCount > 0) {
          const currentStock = parseFloat(pRes.rows[0].stock_quantity);

          if (item.isResalable) {
            // Restore to active stock
            const newStock = currentStock + item.quantity;
            await client.query(
              'UPDATE products SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
              [newStock, item.productId]
            );

            await client.query(
              `INSERT INTO stock_movements (
                business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
                reference_id, reference_number, reason, created_by
              ) VALUES ($1, $2, 'return', $3, $4, $5, $6, $7, $8, $9)`,
              [
                businessId,
                item.productId,
                item.quantity,
                currentStock,
                newStock,
                salesReturn.id,
                returnNumber,
                `Customer return restored to inventory: ${item.reason || data.reason}`,
                userId,
              ]
            );
          } else {
            // Damaged/Defective item returned but not resalable - log audit movement
            await client.query(
              `INSERT INTO stock_movements (
                business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
                reference_id, reference_number, reason, created_by
              ) VALUES ($1, $2, 'adjustment_damage', 0, $3, $3, $4, $5, $6, $7)`,
              [
                businessId,
                item.productId,
                currentStock,
                salesReturn.id,
                returnNumber,
                `Customer return accepted as damaged/non-resalable: ${item.reason || data.reason}`,
                userId,
              ]
            );
          }
        }
      }

      return salesReturn;
    });
  }
}
