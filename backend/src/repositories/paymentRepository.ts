import { query, withTransaction } from '../config/database';
import { Payment, PaymentMethod, PaymentStatus } from '../types';
import { roundMoney } from '../utils/calculator';

export class PaymentRepository {
  static async list(params: {
    businessId: string;
    invoiceId?: string;
    customerId?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ payments: Payment[]; total: number }> {
    let where = 'WHERE p.business_id = $1';
    const values: any[] = [params.businessId];
    let idx = 2;

    if (params.invoiceId) {
      where += ` AND p.invoice_id = $${idx}`;
      values.push(params.invoiceId);
      idx++;
    }

    if (params.customerId) {
      where += ` AND p.customer_id = $${idx}`;
      values.push(params.customerId);
      idx++;
    }

    if (params.paymentMethod && params.paymentMethod !== 'all') {
      where += ` AND p.payment_method = $${idx}`;
      values.push(params.paymentMethod);
      idx++;
    }

    if (params.startDate) {
      where += ` AND p.payment_date >= $${idx}`;
      values.push(params.startDate);
      idx++;
    }

    if (params.endDate) {
      where += ` AND p.payment_date <= $${idx}`;
      values.push(params.endDate);
      idx++;
    }

    const countRes = await query(`SELECT COUNT(*) FROM payments p ${where}`, values);
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    values.push(limit, offset);

    const res = await query<Payment>(
      `SELECT p.*, 
              i.invoice_number, 
              COALESCE(c.name, 'Walk-in Customer') AS customer_name,
              u.full_name AS recorder_name
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       LEFT JOIN customers c ON c.id = p.customer_id
       LEFT JOIN users u ON u.id = p.recorded_by
       ${where}
       ORDER BY p.payment_date DESC, p.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    return {
      payments: res.rows,
      total,
    };
  }

  static async findById(businessId: string, id: string): Promise<Payment | null> {
    const res = await query<Payment>(
      `SELECT p.*, 
              i.invoice_number, 
              c.name AS customer_name,
              u.full_name AS recorder_name
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       JOIN customers c ON c.id = p.customer_id
       LEFT JOIN users u ON u.id = p.recorded_by
       WHERE p.business_id = $1 AND p.id = $2
       LIMIT 1`,
      [businessId, id]
    );
    return res.rows[0] || null;
  }

  static async recordPayment(data: {
    businessId: string;
    invoiceId: string;
    paymentDate: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionReference?: string;
    notes?: string;
    recordedBy?: string;
  }): Promise<Payment> {
    return await withTransaction(async (client) => {
      // 1. Lock invoice for update
      const invRes = await client.query(
        'SELECT * FROM invoices WHERE business_id = $1 AND id = $2 FOR UPDATE',
        [data.businessId, data.invoiceId]
      );
      if (invRes.rowCount === 0) throw new Error('Invoice not found');
      const invoice = invRes.rows[0];

      if (invoice.status === 'cancelled') {
        throw new Error('Cannot record payment for a cancelled invoice');
      }

      const balanceDue = Number(invoice.balance_due);
      const paymentAmount = roundMoney(data.amount);

      if (paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than zero');
      }

      if (paymentAmount > balanceDue + 0.001) {
        throw new Error(
          `Payment amount (${paymentAmount.toFixed(2)}) cannot exceed remaining invoice balance (${balanceDue.toFixed(2)})`
        );
      }

      // 2. Generate Payment Number
      const countRes = await client.query(
        'SELECT COUNT(*) FROM payments WHERE business_id = $1',
        [data.businessId]
      );
      const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
      const paymentNumber = `PAY-${String(nextSeq).padStart(5, '0')}`;

      // 3. Insert Payment record
      const payRes = await client.query<Payment>(
        `INSERT INTO payments (
           business_id, invoice_id, customer_id, payment_number, payment_date,
           amount, payment_method, transaction_reference, notes, status, recorded_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'recorded', $10)
         RETURNING *`,
        [
          data.businessId,
          data.invoiceId,
          invoice.customer_id,
          paymentNumber,
          data.paymentDate,
          paymentAmount,
          data.paymentMethod,
          data.transactionReference || null,
          data.notes || null,
          data.recordedBy || null,
        ]
      );
      const newPayment = payRes.rows[0];

      // 4. Update Invoice Balance and Status
      const newPaidAmount = roundMoney(Number(invoice.paid_amount) + paymentAmount);
      const newBalanceDue = roundMoney(Math.max(0, Number(invoice.grand_total) - newPaidAmount));
      const newStatus = newBalanceDue <= 0.001 ? 'paid' : 'partially_paid';

      await client.query(
        `UPDATE invoices 
         SET paid_amount = $1, balance_due = $2, status = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        [newPaidAmount, newBalanceDue, newStatus, invoice.id]
      );

      return newPayment;
    });
  }

  static async reversePayment(businessId: string, paymentId: string): Promise<Payment> {
    return await withTransaction(async (client) => {
      const payRes = await client.query(
        'SELECT * FROM payments WHERE business_id = $1 AND id = $2 FOR UPDATE',
        [businessId, paymentId]
      );
      if (payRes.rowCount === 0) throw new Error('Payment not found');
      const payment = payRes.rows[0];

      if (payment.status === 'reversed') {
        throw new Error('Payment has already been reversed');
      }

      // Lock invoice
      const invRes = await client.query(
        'SELECT * FROM invoices WHERE id = $1 FOR UPDATE',
        [payment.invoice_id]
      );
      const invoice = invRes.rows[0];

      // Mark payment as reversed
      const updatedPayRes = await client.query<Payment>(
        `UPDATE payments SET status = 'reversed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [paymentId]
      );

      // Revert invoice paid amount and recalculate status
      const paymentAmount = Number(payment.amount);
      const newPaidAmount = roundMoney(Math.max(0, Number(invoice.paid_amount) - paymentAmount));
      const newBalanceDue = roundMoney(Number(invoice.grand_total) - newPaidAmount);

      let newStatus = 'issued';
      if (newPaidAmount > 0) {
        newStatus = 'partially_paid';
      } else if (new Date(invoice.due_date) < new Date()) {
        newStatus = 'overdue';
      }

      await client.query(
        `UPDATE invoices 
         SET paid_amount = $1, balance_due = $2, status = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        [newPaidAmount, newBalanceDue, newStatus, invoice.id]
      );

      return updatedPayRes.rows[0];
    });
  }
}
