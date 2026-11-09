import { query, withTransaction } from '../config/database';
import { StockMovement, StockMovementType } from '../types';

export class InventoryRepository {
  static async getOverview(businessId: string) {
    const statsRes = await query(
      `SELECT 
         COUNT(*) AS total_products,
         COALESCE(SUM(stock_quantity), 0) AS total_units_in_stock,
         COALESCE(SUM(stock_quantity * COALESCE(purchase_price, 0)), 0) AS total_valuation_cost,
         COALESCE(SUM(stock_quantity * COALESCE(selling_price, price, 0)), 0) AS total_valuation_retail,
         COUNT(*) FILTER (WHERE stock_quantity <= 0) AS out_of_stock_count,
         COUNT(*) FILTER (WHERE stock_quantity > 0 AND stock_quantity <= minimum_stock) AS low_stock_count
       FROM products
       WHERE business_id = $1 AND is_archived = FALSE`,
      [businessId]
    );

    return statsRes.rows[0];
  }

  static async getLowStockProducts(businessId: string) {
    const res = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.business_id = $1 
         AND p.is_archived = FALSE 
         AND p.stock_quantity <= p.minimum_stock
       ORDER BY p.stock_quantity ASC`,
      [businessId]
    );
    return res.rows;
  }

  static async getOutOfStockProducts(businessId: string) {
    const res = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.business_id = $1 
         AND p.is_archived = FALSE 
         AND p.stock_quantity <= 0
       ORDER BY p.name ASC`,
      [businessId]
    );
    return res.rows;
  }

  static async adjustStock(
    businessId: string,
    data: {
      productId: string;
      adjustmentType: StockMovementType;
      quantity: number;
      isAddition: boolean;
      reason: string;
    },
    userId: string
  ): Promise<{ product: any; movement: StockMovement }> {
    return await withTransaction(async (client) => {
      // Fetch product and lock row
      const prodRes = await client.query(
        'SELECT * FROM products WHERE business_id = $1 AND id = $2 FOR UPDATE',
        [businessId, data.productId]
      );
      if (prodRes.rowCount === 0) {
        throw new Error('Product not found');
      }
      const product = prodRes.rows[0];
      const quantityBefore = parseFloat(product.stock_quantity);

      const change = data.isAddition ? Math.abs(data.quantity) : -Math.abs(data.quantity);
      const quantityAfter = Math.max(0, quantityBefore + change);

      // Update product stock
      const updatedProdRes = await client.query(
        `UPDATE products 
         SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE business_id = $2 AND id = $3 
         RETURNING *`,
        [quantityAfter, businessId, data.productId]
      );

      // Insert stock movement record
      const movementRes = await client.query<StockMovement>(
        `INSERT INTO stock_movements (
          business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
          reference_number, reason, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          businessId,
          data.productId,
          data.adjustmentType,
          change,
          quantityBefore,
          quantityAfter,
          `ADJ-${Date.now().toString().slice(-6)}`,
          data.reason.trim(),
          userId,
        ]
      );

      return {
        product: updatedProdRes.rows[0],
        movement: movementRes.rows[0],
      };
    });
  }

  static async getMovements(params: {
    businessId: string;
    productId?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ movements: StockMovement[]; total: number }> {
    let where = 'WHERE sm.business_id = $1';
    const values: any[] = [params.businessId];
    let idx = 2;

    if (params.productId) {
      where += ` AND sm.product_id = $${idx}`;
      values.push(params.productId);
      idx++;
    }

    if (params.movementType && params.movementType !== 'all') {
      where += ` AND sm.movement_type = $${idx}`;
      values.push(params.movementType);
      idx++;
    }

    if (params.startDate) {
      where += ` AND sm.created_at >= $${idx}`;
      values.push(params.startDate);
      idx++;
    }

    if (params.endDate) {
      where += ` AND sm.created_at <= $${idx}`;
      values.push(params.endDate);
      idx++;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM stock_movements sm ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    values.push(limit, offset);

    const res = await query<StockMovement>(
      `SELECT sm.*,
              p.name AS product_name,
              p.sku,
              p.barcode,
              u.full_name AS creator_name
       FROM stock_movements sm
       JOIN products p ON p.id = sm.product_id
       LEFT JOIN users u ON u.id = sm.created_by
       ${where}
       ORDER BY sm.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    return {
      movements: res.rows,
      total,
    };
  }

  static async getValuationReport(businessId: string) {
    const res = await query(
      `SELECT 
         p.id,
         p.name,
         p.sku,
         p.barcode,
         p.category,
         p.stock_quantity,
         p.unit,
         COALESCE(p.purchase_price, 0) AS purchase_price,
         COALESCE(p.selling_price, p.price, 0) AS selling_price,
         (p.stock_quantity * COALESCE(p.purchase_price, 0)) AS total_cost_value,
         (p.stock_quantity * COALESCE(p.selling_price, p.price, 0)) AS total_retail_value,
         ((p.stock_quantity * COALESCE(p.selling_price, p.price, 0)) - (p.stock_quantity * COALESCE(p.purchase_price, 0))) AS potential_profit
       FROM products p
       WHERE p.business_id = $1 AND p.is_archived = FALSE
       ORDER BY total_retail_value DESC`,
      [businessId]
    );

    return res.rows;
  }
}
