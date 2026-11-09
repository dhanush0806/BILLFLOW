import { query } from '../config/database';
import { Product, Service } from '../types';

export class CatalogRepository {
  // PRODUCTS
  static async listProducts(params: {
    businessId: string;
    search?: string;
    category?: string;
    includeArchived?: boolean;
  }): Promise<Product[]> {
    let sql = 'SELECT * FROM products WHERE business_id = $1';
    const values: any[] = [params.businessId];
    let idx = 2;

    if (!params.includeArchived) {
      sql += ' AND is_archived = FALSE';
    }

    if (params.category && params.category !== 'all') {
      sql += ` AND category = $${idx}`;
      values.push(params.category);
      idx++;
    }

    if (params.search) {
      sql += ` AND (name ILIKE $${idx} OR code ILIKE $${idx} OR description ILIKE $${idx})`;
      values.push(`%${params.search}%`);
      idx++;
    }

    sql += ' ORDER BY created_at DESC';
    const res = await query<Product>(sql, values);
    return res.rows;
  }

  static async findProductById(businessId: string, id: string): Promise<Product | null> {
    const res = await query<Product>(
      'SELECT * FROM products WHERE business_id = $1 AND id = $2 LIMIT 1',
      [businessId, id]
    );
    return res.rows[0] || null;
  }

  static async createProduct(data: {
    businessId: string;
    name: string;
    code?: string;
    description?: string;
    category?: string;
    price: number;
    unit?: string;
    stockQuantity?: number;
    isActive?: boolean;
  }): Promise<Product> {
    const res = await query<Product>(
      `INSERT INTO products (business_id, name, code, description, category, price, unit, stock_quantity, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.businessId,
        data.name,
        data.code || null,
        data.description || null,
        data.category || 'General',
        data.price,
        data.unit || 'item',
        data.stockQuantity || 0,
        data.isActive ?? true,
      ]
    );
    return res.rows[0];
  }

  static async updateProduct(
    businessId: string,
    id: string,
    data: Partial<Product>
  ): Promise<Product | null> {
    const res = await query<Product>(
      `UPDATE products
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           category = COALESCE($4, category),
           price = COALESCE($5, price),
           unit = COALESCE($6, unit),
           stock_quantity = COALESCE($7, stock_quantity),
           is_active = COALESCE($8, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $9 AND id = $10
       RETURNING *`,
      [
        data.name || null,
        data.code || null,
        data.description || null,
        data.category || null,
        data.price ?? null,
        data.unit || null,
        data.stock_quantity ?? null,
        data.is_active ?? null,
        businessId,
        id,
      ]
    );
    return res.rows[0] || null;
  }

  static async archiveProduct(businessId: string, id: string): Promise<boolean> {
    const res = await query(
      'UPDATE products SET is_archived = TRUE, updated_at = CURRENT_TIMESTAMP WHERE business_id = $1 AND id = $2',
      [businessId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // SERVICES
  static async listServices(params: {
    businessId: string;
    search?: string;
    category?: string;
    includeArchived?: boolean;
  }): Promise<Service[]> {
    let sql = 'SELECT * FROM services WHERE business_id = $1';
    const values: any[] = [params.businessId];
    let idx = 2;

    if (!params.includeArchived) {
      sql += ' AND is_archived = FALSE';
    }

    if (params.category && params.category !== 'all') {
      sql += ` AND category = $${idx}`;
      values.push(params.category);
      idx++;
    }

    if (params.search) {
      sql += ` AND (name ILIKE $${idx} OR description ILIKE $${idx})`;
      values.push(`%${params.search}%`);
      idx++;
    }

    sql += ' ORDER BY created_at DESC';
    const res = await query<Service>(sql, values);
    return res.rows;
  }

  static async findServiceById(businessId: string, id: string): Promise<Service | null> {
    const res = await query<Service>(
      'SELECT * FROM services WHERE business_id = $1 AND id = $2 LIMIT 1',
      [businessId, id]
    );
    return res.rows[0] || null;
  }

  static async createService(data: {
    businessId: string;
    name: string;
    description?: string;
    category?: string;
    defaultPrice: number;
    unit?: string;
    isActive?: boolean;
  }): Promise<Service> {
    const res = await query<Service>(
      `INSERT INTO services (business_id, name, description, category, default_price, unit, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.businessId,
        data.name,
        data.description || null,
        data.category || 'General',
        data.defaultPrice,
        data.unit || 'hour',
        data.isActive ?? true,
      ]
    );
    return res.rows[0];
  }

  static async updateService(
    businessId: string,
    id: string,
    data: Partial<Service>
  ): Promise<Service | null> {
    const res = await query<Service>(
      `UPDATE services
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           default_price = COALESCE($4, default_price),
           unit = COALESCE($5, unit),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $7 AND id = $8
       RETURNING *`,
      [
        data.name || null,
        data.description || null,
        data.category || null,
        data.default_price ?? null,
        data.unit || null,
        data.is_active ?? null,
        businessId,
        id,
      ]
    );
    return res.rows[0] || null;
  }

  static async archiveService(businessId: string, id: string): Promise<boolean> {
    const res = await query(
      'UPDATE services SET is_archived = TRUE, updated_at = CURRENT_TIMESTAMP WHERE business_id = $1 AND id = $2',
      [businessId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
