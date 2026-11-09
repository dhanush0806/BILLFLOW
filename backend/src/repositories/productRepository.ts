import { query, withTransaction } from '../config/database';
import { Product } from '../types';

export class ProductRepository {
  static async list(params: {
    businessId: string;
    search?: string;
    categoryId?: string;
    stockStatus?: 'low' | 'out' | 'in_stock';
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    let where = 'WHERE p.business_id = $1';
    const values: any[] = [params.businessId];
    let idx = 2;

    if (!params.includeArchived) {
      where += ' AND p.is_archived = FALSE';
    }

    if (params.categoryId && params.categoryId !== 'all') {
      where += ` AND (p.category_id = $${idx} OR p.category = $${idx})`;
      values.push(params.categoryId);
      idx++;
    }

    if (params.stockStatus === 'low') {
      where += ' AND p.stock_quantity > 0 AND p.stock_quantity <= p.minimum_stock';
    } else if (params.stockStatus === 'out') {
      where += ' AND p.stock_quantity <= 0';
    } else if (params.stockStatus === 'in_stock') {
      where += ' AND p.stock_quantity > 0';
    }

    if (params.search) {
      where += ` AND (
        p.name ILIKE $${idx} OR 
        p.sku ILIKE $${idx} OR 
        p.barcode ILIKE $${idx} OR 
        p.brand ILIKE $${idx} OR 
        p.category ILIKE $${idx}
      )`;
      values.push(`%${params.search}%`);
      idx++;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM products p ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = params.limit || 100;
    const offset = params.offset || 0;
    values.push(limit, offset);

    const res = await query<Product>(
      `SELECT p.*,
              c.name AS category_name,
              COALESCE(p.selling_price, p.price) AS selling_price,
              COALESCE(p.purchase_price, 0) AS purchase_price
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    return {
      products: res.rows,
      total,
    };
  }

  static async findById(businessId: string, id: string): Promise<Product | null> {
    const res = await query<Product>(
      `SELECT p.*,
              c.name AS category_name,
              COALESCE(p.selling_price, p.price) AS selling_price,
              COALESCE(p.purchase_price, 0) AS purchase_price
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.business_id = $1 AND p.id = $2
       LIMIT 1`,
      [businessId, id]
    );
    return res.rows[0] || null;
  }

  static async findByBarcodeOrSku(businessId: string, queryStr: string): Promise<Product | null> {
    const res = await query<Product>(
      `SELECT p.*,
              c.name AS category_name,
              COALESCE(p.selling_price, p.price) AS selling_price,
              COALESCE(p.purchase_price, 0) AS purchase_price
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.business_id = $1 
         AND p.is_archived = FALSE
         AND (p.barcode = $2 OR p.sku = $2 OR p.code = $2)
       LIMIT 1`,
      [businessId, queryStr.trim()]
    );
    return res.rows[0] || null;
  }

  static async create(
    businessId: string,
    data: {
      name: string;
      sku?: string;
      barcode?: string;
      categoryId?: string | null;
      category?: string;
      brand?: string;
      purchasePrice: number;
      sellingPrice: number;
      unit?: string;
      stockQuantity?: number;
      minimumStock?: number;
      taxRate?: number;
      imageUrl?: string;
      isActive?: boolean;
    },
    userId?: string
  ): Promise<Product> {
    return await withTransaction(async (client) => {
      // Resolve category name if categoryId is provided
      let categoryName = data.category || 'General';
      if (data.categoryId) {
        const catRes = await client.query(
          'SELECT name FROM categories WHERE business_id = $1 AND id = $2',
          [businessId, data.categoryId]
        );
        if (catRes.rowCount && catRes.rowCount > 0) {
          categoryName = catRes.rows[0].name;
        }
      }

      const res = await client.query<Product>(
        `INSERT INTO products (
          business_id, name, code, sku, barcode, category_id, category, brand,
          purchase_price, selling_price, price, unit, stock_quantity, minimum_stock,
          tax_rate, image_url, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          businessId,
          data.name.trim(),
          data.sku || data.barcode || null,
          data.sku || null,
          data.barcode || null,
          data.categoryId || null,
          categoryName,
          data.brand || null,
          data.purchasePrice || 0,
          data.sellingPrice,
          data.sellingPrice,
          data.unit || 'pcs',
          data.stockQuantity || 0,
          data.minimumStock ?? 5,
          data.taxRate || 0,
          data.imageUrl || null,
          data.isActive ?? true,
        ]
      );
      const product = res.rows[0];

      // Record initial stock movement if starting stock > 0
      if ((data.stockQuantity || 0) > 0) {
        await client.query(
          `INSERT INTO stock_movements (
            business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
            reference_number, reason, created_by
          ) VALUES ($1, $2, 'initial_stock', $3, 0, $3, 'PROD-CREATE', 'Initial opening stock', $4)`,
          [businessId, product.id, data.stockQuantity, userId || null]
        );
      }

      return product;
    });
  }

  static async update(
    businessId: string,
    id: string,
    data: Partial<{
      name: string;
      sku: string;
      barcode: string;
      categoryId: string | null;
      category: string;
      brand: string;
      purchasePrice: number;
      sellingPrice: number;
      unit: string;
      minimumStock: number;
      taxRate: number;
      imageUrl: string;
      isActive: boolean;
      stockQuantity: number;
    }>
  ): Promise<Product | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) return null;

    let categoryName = data.category !== undefined ? data.category : existing.category;
    if (data.categoryId) {
      const catRes = await query(
        'SELECT name FROM categories WHERE business_id = $1 AND id = $2',
        [businessId, data.categoryId]
      );
      if (catRes.rowCount && catRes.rowCount > 0) {
        categoryName = catRes.rows[0].name;
      }
    }

    const res = await query<Product>(
      `UPDATE products
       SET name = COALESCE($1, name),
           sku = COALESCE($2, sku),
           code = COALESCE($2, code),
           barcode = COALESCE($3, barcode),
           category_id = $4,
           category = COALESCE($5, category),
           brand = COALESCE($6, brand),
           purchase_price = COALESCE($7, purchase_price),
           selling_price = COALESCE($8, selling_price),
           price = COALESCE($8, price),
           unit = COALESCE($9, unit),
           minimum_stock = COALESCE($10, minimum_stock),
           tax_rate = COALESCE($11, tax_rate),
           image_url = COALESCE($12, image_url),
           is_active = COALESCE($13, is_active),
           stock_quantity = COALESCE($14, stock_quantity),
           updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $15 AND id = $16
       RETURNING *`,
      [
        data.name ? data.name.trim() : null,
        data.sku || null,
        data.barcode || null,
        data.categoryId !== undefined ? data.categoryId : existing.category_id,
        categoryName,
        data.brand || null,
        data.purchasePrice,
        data.sellingPrice,
        data.unit || null,
        data.minimumStock,
        data.taxRate,
        data.imageUrl || null,
        data.isActive,
        data.stockQuantity,
        businessId,
        id,
      ]
    );

    return res.rows[0] || null;
  }

  static async archive(businessId: string, id: string): Promise<boolean> {
    const res = await query(
      'UPDATE products SET is_archived = TRUE, is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE business_id = $1 AND id = $2',
      [businessId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async batchImport(
    businessId: string,
    items: Array<{
      name: string;
      sku?: string;
      barcode?: string;
      category?: string;
      brand?: string;
      purchasePrice: number;
      sellingPrice: number;
      unit?: string;
      stockQuantity?: number;
      minimumStock?: number;
      taxRate?: number;
    }>,
    userId?: string
  ): Promise<{ inserted: number; errors: string[] }> {
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (!item.name || !item.sellingPrice) {
          errors.push(`Row ${i + 1}: Name and selling price are required.`);
          continue;
        }

        await this.create(
          businessId,
          {
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            category: item.category || 'General',
            brand: item.brand,
            purchasePrice: item.purchasePrice || 0,
            sellingPrice: item.sellingPrice,
            unit: item.unit || 'pcs',
            stockQuantity: item.stockQuantity || 0,
            minimumStock: item.minimumStock ?? 5,
            taxRate: item.taxRate || 0,
          },
          userId
        );
        inserted++;
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${item.name}): ${err.message}`);
      }
    }

    return { inserted, errors };
  }
}
