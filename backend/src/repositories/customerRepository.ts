import { query } from '../config/database';
import { Customer } from '../types';

export class CustomerRepository {
  static async findById(businessId: string, id: string): Promise<Customer | null> {
    const res = await query<Customer>(
      'SELECT * FROM customers WHERE business_id = $1 AND id = $2 LIMIT 1',
      [businessId, id]
    );
    return res.rows[0] || null;
  }

  static async findByEmail(businessId: string, email: string): Promise<Customer | null> {
    const res = await query<Customer>(
      'SELECT * FROM customers WHERE business_id = $1 AND email = $2 LIMIT 1',
      [businessId, email.toLowerCase()]
    );
    return res.rows[0] || null;
  }

  static async list(params: {
    businessId: string;
    search?: string;
    type?: string;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ customers: Customer[]; total: number }> {
    let whereClause = 'WHERE c.business_id = $1';
    const queryParams: any[] = [params.businessId];
    let paramIndex = 2;

    if (!params.includeArchived) {
      whereClause += ` AND c.is_archived = FALSE`;
    }

    if (params.type && params.type !== 'all') {
      whereClause += ` AND c.customer_type = $${paramIndex}`;
      queryParams.push(params.type);
      paramIndex++;
    }

    if (params.search) {
      whereClause += ` AND (c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM customers c ${whereClause}`,
      queryParams
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = params.limit || 50;
    const offset = params.offset || 0;

    queryParams.push(limit, offset);
    const listRes = await query<Customer>(
      `SELECT c.*,
              COUNT(DISTINCT i.id) AS total_invoices,
              COALESCE(SUM(i.grand_total), 0) AS total_spent,
              COALESCE(SUM(i.balance_due), 0) AS outstanding_balance
       FROM customers c
       LEFT JOIN invoices i ON i.customer_id = c.id AND i.status != 'cancelled'
       ${whereClause}
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    return {
      customers: listRes.rows,
      total,
    };
  }

  static async create(data: {
    businessId: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    customerType?: 'individual' | 'business';
    taxNumber?: string;
    notes?: string;
    userId?: string;
  }): Promise<Customer> {
    const emailVal = data.email && data.email.trim() ? data.email.toLowerCase() : `${data.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'customer'}_${Date.now()}@retail.local`;
    const res = await query<Customer>(
      `INSERT INTO customers (business_id, name, email, phone, address, customer_type, tax_number, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.businessId,
        data.name,
        emailVal,
        data.phone || null,
        data.address || null,
        data.customerType || 'individual',
        data.taxNumber || null,
        data.notes || null,
        data.userId || null,
      ]
    );
    return res.rows[0];
  }

  static async update(
    businessId: string,
    id: string,
    data: Partial<Customer>
  ): Promise<Customer | null> {
    const res = await query<Customer>(
      `UPDATE customers
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           customer_type = COALESCE($5, customer_type),
           tax_number = COALESCE($6, tax_number),
           notes = COALESCE($7, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $8 AND id = $9
       RETURNING *`,
      [
        data.name || null,
        data.email?.toLowerCase() || null,
        data.phone || null,
        data.address || null,
        data.customer_type || null,
        data.tax_number || null,
        data.notes || null,
        businessId,
        id,
      ]
    );
    return res.rows[0] || null;
  }

  static async hasFinancialRecords(businessId: string, customerId: string): Promise<boolean> {
    const res = await query(
      'SELECT id FROM invoices WHERE business_id = $1 AND customer_id = $2 LIMIT 1',
      [businessId, customerId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async archive(businessId: string, id: string): Promise<boolean> {
    const res = await query(
      'UPDATE customers SET is_archived = TRUE, updated_at = CURRENT_TIMESTAMP WHERE business_id = $1 AND id = $2',
      [businessId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async delete(businessId: string, id: string): Promise<boolean> {
    const res = await query('DELETE FROM customers WHERE business_id = $1 AND id = $2', [
      businessId,
      id,
    ]);
    return (res.rowCount ?? 0) > 0;
  }

  static async getCustomerInvoices(businessId: string, customerId: string) {
    const res = await query(
      `SELECT * FROM invoices 
       WHERE business_id = $1 AND customer_id = $2 
       ORDER BY invoice_date DESC, created_at DESC`,
      [businessId, customerId]
    );
    return res.rows;
  }

  static async getCustomerPayments(businessId: string, customerId: string) {
    const res = await query(
      `SELECT p.*, i.invoice_number 
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       WHERE p.business_id = $1 AND p.customer_id = $2 
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [businessId, customerId]
    );
    return res.rows;
  }
}
