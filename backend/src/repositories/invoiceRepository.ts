import { query, withTransaction } from '../config/database';
import { Invoice, InvoiceItem, InvoiceStatus } from '../types';
import { calculateInvoiceFinancials } from '../utils/calculator';

export class InvoiceRepository {
  static async list(params: {
    businessId: string;
    customerId?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ invoices: Invoice[]; total: number }> {
    let where = 'WHERE i.business_id = $1';
    const values: any[] = [params.businessId];
    let idx = 2;

    if (params.customerId) {
      where += ` AND i.customer_id = $${idx}`;
      values.push(params.customerId);
      idx++;
    }

    if (params.status && params.status !== 'all') {
      where += ` AND i.status = $${idx}`;
      values.push(params.status);
      idx++;
    }

    if (params.startDate) {
      where += ` AND i.invoice_date >= $${idx}`;
      values.push(params.startDate);
      idx++;
    }

    if (params.endDate) {
      where += ` AND i.invoice_date <= $${idx}`;
      values.push(params.endDate);
      idx++;
    }

    if (params.search) {
      where += ` AND (i.invoice_number ILIKE $${idx} OR c.name ILIKE $${idx} OR c.phone ILIKE $${idx})`;
      values.push(`%${params.search}%`);
      idx++;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    values.push(limit, offset);

    const res = await query<Invoice>(
      `SELECT i.*, 
              COALESCE(c.name, 'Walk-in Customer') AS customer_name, 
              c.email AS customer_email,
              c.phone AS customer_phone,
              u.full_name AS cashier_name,
              (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) AS item_count
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       LEFT JOIN users u ON u.id = i.cashier_id
       ${where}
       ORDER BY i.invoice_date DESC, i.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    return {
      invoices: res.rows,
      total,
    };
  }

  static async findById(businessId: string, id: string): Promise<Invoice | null> {
    const res = await query<Invoice>(
      `SELECT i.*, 
              COALESCE(c.name, 'Walk-in Customer') AS customer_name, 
              c.email AS customer_email,
              c.phone AS customer_phone,
              c.address AS customer_address,
              u.full_name AS cashier_name
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       LEFT JOIN users u ON u.id = i.cashier_id
       WHERE i.business_id = $1 AND i.id = $2
       LIMIT 1`,
      [businessId, id]
    );

    if (res.rowCount === 0) return null;
    const invoice = res.rows[0];

    // Load items along with returned quantity count
    const itemsRes = await query<InvoiceItem>(
      `SELECT ii.*,
              COALESCE((
                SELECT SUM(sri.quantity) 
                FROM sales_return_items sri 
                WHERE sri.invoice_item_id = ii.id
              ), 0) AS returned_quantity
       FROM invoice_items ii 
       WHERE ii.invoice_id = $1 
       ORDER BY ii.created_at ASC`,
      [id]
    );
    invoice.items = itemsRes.rows;

    return invoice;
  }

  static async createInvoice(
    businessId: string,
    data: {
      customerId: string;
      invoiceDate: string;
      dueDate: string;
      items: InvoiceItem[];
      discountType?: 'percentage' | 'fixed';
      discountValue?: number;
      taxRate?: number;
      otherCharges?: number;
      notes?: string;
      paymentInstructions?: string;
      status?: 'draft' | 'issued';
    }
  ): Promise<Invoice> {
    return await withTransaction(async (client) => {
      // 1. Fetch customer
      const custRes = await client.query(
        'SELECT * FROM customers WHERE business_id = $1 AND id = $2 LIMIT 1',
        [businessId, data.customerId]
      );
      if (custRes.rowCount === 0) {
        throw new Error('Customer not found');
      }
      const customer = custRes.rows[0];
      const customerSnapshot = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        taxNumber: customer.tax_number,
      };

      // 2. Fetch business settings
      const settingsRes = await client.query(
        'SELECT * FROM business_settings WHERE business_id = $1 FOR UPDATE',
        [businessId]
      );
      let prefix = 'BILL-';
      let nextNum = 1001;
      if (settingsRes.rowCount && settingsRes.rowCount > 0) {
        prefix = settingsRes.rows[0].invoice_prefix || 'BILL-';
        nextNum = settingsRes.rows[0].next_invoice_number || 1001;
      }

      const invoiceNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

      // 3. Decimal-safe financial calculations
      const calculated = calculateInvoiceFinancials({
        items: data.items.map((i) => ({
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_amount: i.discount_amount || 0,
          tax_rate: i.tax_rate || 0,
        })),
        discount_type: data.discountType || 'fixed',
        discount_value: data.discountValue || 0,
        tax_rate: data.taxRate || 0,
        other_charges: data.otherCharges || 0,
        paid_amount: 0,
      });

      // 4. Insert Invoice
      const invRes = await client.query<Invoice>(
        `INSERT INTO invoices (
           business_id, customer_id, invoice_number, invoice_date, due_date, status,
           subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount,
           other_charges, grand_total, paid_amount, balance_due, notes, payment_instructions, customer_snapshot
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING *`,
        [
          businessId,
          data.customerId,
          invoiceNumber,
          data.invoiceDate,
          data.dueDate,
          data.status || 'draft',
          calculated.subtotal,
          data.discountType || 'fixed',
          data.discountValue || 0,
          calculated.discount_amount,
          data.taxRate || 0,
          calculated.tax_amount,
          data.otherCharges || 0,
          calculated.grand_total,
          0,
          calculated.grand_total,
          data.notes || null,
          data.paymentInstructions || null,
          customerSnapshot,
        ]
      );
      const invoice = invRes.rows[0];

      // 5. Insert Items
      for (const item of calculated.items) {
        await client.query(
          `INSERT INTO invoice_items (
             invoice_id, item_type, product_id, name, description,
             quantity, unit_price, discount_amount, tax_rate, tax_amount, line_total
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            invoice.id,
            'product',
            item.product_id || null,
            item.name || 'Item',
            item.description || null,
            item.quantity,
            item.unit_price,
            item.discount_amount,
            item.tax_rate,
            item.tax_amount,
            item.line_total,
          ]
        );
      }

      // 6. Update next invoice number
      await client.query(
        'UPDATE business_settings SET next_invoice_number = $1 WHERE business_id = $2',
        [nextNum + 1, businessId]
      );

      return invoice;
    });
  }

  static async updateStatus(
    businessId: string,
    id: string,
    status: InvoiceStatus
  ): Promise<Invoice | null> {
    const res = await query<Invoice>(
      `UPDATE invoices 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE business_id = $2 AND id = $3 
       RETURNING *`,
      [status, businessId, id]
    );
    return res.rows[0] || null;
  }

  static async cancelInvoice(businessId: string, id: string): Promise<Invoice | null> {
    const res = await query<Invoice>(
      `UPDATE invoices 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
       WHERE business_id = $1 AND id = $2 AND status != 'paid' 
       RETURNING *`,
      [businessId, id]
    );
    return res.rows[0] || null;
  }

  static async updateOverdueStatuses(): Promise<number> {
    const res = await query(
      `UPDATE invoices 
       SET status = 'overdue', updated_at = CURRENT_TIMESTAMP 
       WHERE status = 'issued' AND due_date < CURRENT_DATE 
       RETURNING id`
    );
    return res.rowCount || 0;
  }
}
