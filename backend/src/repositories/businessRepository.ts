import { query } from '../config/database';
import { Business, BusinessSettings } from '../types';

export class BusinessRepository {
  static async findById(id: string): Promise<Business | null> {
    const res = await query<Business>('SELECT * FROM businesses WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] || null;
  }

  static async findByEmail(email: string): Promise<Business | null> {
    const res = await query<Business>(
      'SELECT * FROM businesses WHERE email = $1 LIMIT 1',
      [email.toLowerCase()]
    );
    return res.rows[0] || null;
  }

  static async create(businessData: {
    name: string;
    ownerName: string;
    email: string;
    phone?: string;
    businessType?: 'shop';
    address?: string;
    currency?: string;
    taxId?: string;
  }): Promise<Business> {
    const res = await query<Business>(
      `INSERT INTO businesses (name, owner_name, email, phone, business_type, address, currency, tax_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        businessData.name,
        businessData.ownerName,
        businessData.email.toLowerCase(),
        businessData.phone || null,
        'shop', // Always shop
        businessData.address || null,
        businessData.currency || '₹',
        businessData.taxId || null,
      ]
    );
    return res.rows[0];
  }

  static async update(
    id: string,
    data: {
      name?: string;
      ownerName?: string;
      email?: string;
      phone?: string;
      address?: string;
      currency?: string;
      taxId?: string;
      paymentInstructions?: string;
      setupCompleted?: boolean;
    }
  ): Promise<Business | null> {
    const res = await query<Business>(
      `UPDATE businesses
       SET name = COALESCE($1, name),
           owner_name = COALESCE($2, owner_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           currency = COALESCE($6, currency),
           tax_id = COALESCE($7, tax_id),
           payment_instructions = COALESCE($8, payment_instructions),
           setup_completed = COALESCE($9, setup_completed),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        data.name || null,
        data.ownerName || null,
        data.email?.toLowerCase() || null,
        data.phone || null,
        data.address || null,
        data.currency || null,
        data.taxId || null,
        data.paymentInstructions || null,
        data.setupCompleted ?? null,
        id,
      ]
    );
    return res.rows[0] || null;
  }

  static async getSettings(businessId: string): Promise<BusinessSettings | null> {
    const res = await query<BusinessSettings>(
      'SELECT * FROM business_settings WHERE business_id = $1 LIMIT 1',
      [businessId]
    );
    return res.rows[0] || null;
  }

  static async upsertSettings(
    businessId: string,
    data: Partial<BusinessSettings>
  ): Promise<BusinessSettings> {
    const res = await query<BusinessSettings>(
      `INSERT INTO business_settings (
         business_id, invoice_prefix, next_invoice_number, default_due_days, default_tax_rate,
         default_notes, default_terms, bank_name, account_number, routing_or_ifsc, upi_id,
         receipt_header, receipt_footer, tax_name, tax_inclusive, low_stock_threshold, barcode_enabled
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (business_id) DO UPDATE SET
         invoice_prefix = COALESCE(EXCLUDED.invoice_prefix, business_settings.invoice_prefix),
         next_invoice_number = COALESCE(EXCLUDED.next_invoice_number, business_settings.next_invoice_number),
         default_due_days = COALESCE(EXCLUDED.default_due_days, business_settings.default_due_days),
         default_tax_rate = COALESCE(EXCLUDED.default_tax_rate, business_settings.default_tax_rate),
         default_notes = COALESCE(EXCLUDED.default_notes, business_settings.default_notes),
         default_terms = COALESCE(EXCLUDED.default_terms, business_settings.default_terms),
         bank_name = COALESCE(EXCLUDED.bank_name, business_settings.bank_name),
         account_number = COALESCE(EXCLUDED.account_number, business_settings.account_number),
         routing_or_ifsc = COALESCE(EXCLUDED.routing_or_ifsc, business_settings.routing_or_ifsc),
         upi_id = COALESCE(EXCLUDED.upi_id, business_settings.upi_id),
         receipt_header = COALESCE(EXCLUDED.receipt_header, business_settings.receipt_header),
         receipt_footer = COALESCE(EXCLUDED.receipt_footer, business_settings.receipt_footer),
         tax_name = COALESCE(EXCLUDED.tax_name, business_settings.tax_name),
         tax_inclusive = COALESCE(EXCLUDED.tax_inclusive, business_settings.tax_inclusive),
         low_stock_threshold = COALESCE(EXCLUDED.low_stock_threshold, business_settings.low_stock_threshold),
         barcode_enabled = COALESCE(EXCLUDED.barcode_enabled, business_settings.barcode_enabled),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        businessId,
        data.invoice_prefix || 'BILL-',
        data.next_invoice_number || 1001,
        data.default_due_days !== undefined ? data.default_due_days : 0,
        data.default_tax_rate !== undefined ? data.default_tax_rate : 5,
        data.default_notes || 'Thank you for shopping with us!',
        data.default_terms || 'Items can be exchanged within 7 days with original receipt.',
        data.bank_name || null,
        data.account_number || null,
        data.routing_or_ifsc || null,
        data.upi_id || null,
        data.receipt_header || 'Welcome to our store!',
        data.receipt_footer || 'Thank you! Visit again.',
        data.tax_name || 'GST',
        data.tax_inclusive ?? false,
        data.low_stock_threshold || 10,
        data.barcode_enabled ?? true,
      ]
    );
    return res.rows[0];
  }
}
