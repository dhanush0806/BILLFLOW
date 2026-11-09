import { query } from '../config/database';
import { Supplier, SupplierPayment } from '../types';

export class SupplierRepository {
  static async list(params: {
    businessId: string;
    search?: string;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ suppliers: Supplier[]; total: number }> {
    let where = 'WHERE s.business_id = $1';
    const values: any[] = [params.businessId];
    let idx = 2;

    if (!params.includeArchived) {
      where += ' AND s.is_archived = FALSE';
    }

    if (params.search) {
      where += ` AND (s.name ILIKE $${idx} OR s.company_name ILIKE $${idx} OR s.phone ILIKE $${idx} OR s.email ILIKE $${idx})`;
      values.push(`%${params.search}%`);
      idx++;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM suppliers s ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    values.push(limit, offset);

    const res = await query<Supplier>(
      `SELECT s.*,
              COUNT(p.id) AS total_purchases,
              COALESCE(SUM(p.total_amount), 0) AS total_purchase_amount
       FROM suppliers s
       LEFT JOIN purchases p ON p.supplier_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY s.name ASC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    return {
      suppliers: res.rows,
      total,
    };
  }

  static async findById(businessId: string, id: string): Promise<Supplier | null> {
    const res = await query<Supplier>(
      `SELECT s.*,
              COUNT(p.id) AS total_purchases,
              COALESCE(SUM(p.total_amount), 0) AS total_purchase_amount
       FROM suppliers s
       LEFT JOIN purchases p ON p.supplier_id = s.id
       WHERE s.business_id = $1 AND s.id = $2
       GROUP BY s.id
       LIMIT 1`,
      [businessId, id]
    );
    return res.rows[0] || null;
  }

  static async create(
    businessId: string,
    data: {
      name: string;
      companyName?: string;
      email?: string;
      phone?: string;
      address?: string;
      taxId?: string;
      notes?: string;
    }
  ): Promise<Supplier> {
    const res = await query<Supplier>(
      `INSERT INTO suppliers (
        business_id, name, company_name, email, phone, address, tax_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        businessId,
        data.name.trim(),
        data.companyName || null,
        data.email || null,
        data.phone || null,
        data.address || null,
        data.taxId || null,
        data.notes || null,
      ]
    );
    return res.rows[0];
  }

  static async update(
    businessId: string,
    id: string,
    data: Partial<{
      name: string;
      companyName: string;
      email: string;
      phone: string;
      address: string;
      taxId: string;
      notes: string;
    }>
  ): Promise<Supplier | null> {
    const res = await query<Supplier>(
      `UPDATE suppliers
       SET name = COALESCE($1, name),
           company_name = COALESCE($2, company_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           tax_id = COALESCE($6, tax_id),
           notes = COALESCE($7, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $8 AND id = $9
       RETURNING *`,
      [
        data.name ? data.name.trim() : null,
        data.companyName || null,
        data.email || null,
        data.phone || null,
        data.address || null,
        data.taxId || null,
        data.notes || null,
        businessId,
        id,
      ]
    );
    return res.rows[0] || null;
  }

  static async archive(businessId: string, id: string): Promise<boolean> {
    const res = await query(
      'UPDATE suppliers SET is_archived = TRUE, updated_at = CURRENT_TIMESTAMP WHERE business_id = $1 AND id = $2',
      [businessId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async getPayments(businessId: string, supplierId: string): Promise<SupplierPayment[]> {
    const res = await query<SupplierPayment>(
      `SELECT sp.*, u.full_name AS recorder_name, p.purchase_number
       FROM supplier_payments sp
       LEFT JOIN users u ON u.id = sp.recorded_by
       LEFT JOIN purchases p ON p.id = sp.purchase_id
       WHERE sp.business_id = $1 AND sp.supplier_id = $2
       ORDER BY sp.payment_date DESC, sp.created_at DESC`,
      [businessId, supplierId]
    );
    return res.rows;
  }
}
