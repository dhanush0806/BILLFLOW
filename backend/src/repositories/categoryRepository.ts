import { query } from '../config/database';
import { Category } from '../types';

export class CategoryRepository {
  static async list(businessId: string): Promise<Category[]> {
    const res = await query<Category>(
      `SELECT c.*,
              COUNT(p.id) FILTER (WHERE p.is_archived = FALSE) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       WHERE c.business_id = $1
       GROUP BY c.id
       ORDER BY c.name ASC`,
      [businessId]
    );
    return res.rows;
  }

  static async findById(businessId: string, id: string): Promise<Category | null> {
    const res = await query<Category>(
      'SELECT * FROM categories WHERE business_id = $1 AND id = $2 LIMIT 1',
      [businessId, id]
    );
    return res.rows[0] || null;
  }

  static async create(businessId: string, name: string, description?: string): Promise<Category> {
    const res = await query<Category>(
      `INSERT INTO categories (business_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [businessId, name.trim(), description || null]
    );
    return res.rows[0];
  }

  static async update(
    businessId: string,
    id: string,
    name: string,
    description?: string
  ): Promise<Category | null> {
    const res = await query<Category>(
      `UPDATE categories
       SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $3 AND id = $4
       RETURNING *`,
      [name.trim(), description || null, businessId, id]
    );
    return res.rows[0] || null;
  }

  static async delete(businessId: string, id: string): Promise<boolean> {
    // Unlink products first
    await query(
      'UPDATE products SET category_id = NULL WHERE business_id = $1 AND category_id = $2',
      [businessId, id]
    );
    const res = await query(
      'DELETE FROM categories WHERE business_id = $1 AND id = $2',
      [businessId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
