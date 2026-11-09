import { query } from '../config/database';
import { Expense } from '../types';

export class ExpenseRepository {
  static async list(params: {
    businessId: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ expenses: Expense[]; total: number; totalAmount: number }> {
    let where = 'WHERE business_id = $1';
    const values: any[] = [params.businessId];
    let idx = 2;

    if (params.category && params.category !== 'all') {
      where += ` AND category = $${idx}`;
      values.push(params.category);
      idx++;
    }

    if (params.startDate) {
      where += ` AND expense_date >= $${idx}`;
      values.push(params.startDate);
      idx++;
    }

    if (params.endDate) {
      where += ` AND expense_date <= $${idx}`;
      values.push(params.endDate);
      idx++;
    }

    if (params.search) {
      where += ` AND (title ILIKE $${idx} OR description ILIKE $${idx})`;
      values.push(`%${params.search}%`);
      idx++;
    }

    const statRes = await query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total_amount FROM expenses ${where}`,
      values
    );
    const total = parseInt(statRes.rows[0].count, 10);
    const totalAmount = parseFloat(statRes.rows[0].total_amount);

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    values.push(limit, offset);

    const listRes = await query<Expense>(
      `SELECT * FROM expenses 
       ${where} 
       ORDER BY expense_date DESC, created_at DESC 
       LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );

    return {
      expenses: listRes.rows,
      total,
      totalAmount,
    };
  }

  static async findById(businessId: string, id: string): Promise<Expense | null> {
    const res = await query<Expense>(
      'SELECT * FROM expenses WHERE business_id = $1 AND id = $2 LIMIT 1',
      [businessId, id]
    );
    return res.rows[0] || null;
  }

  static async create(data: {
    businessId: string;
    title: string;
    category: string;
    amount: number;
    expenseDate: string;
    paymentMethod?: string;
    description?: string;
    attachmentUrl?: string;
  }): Promise<Expense> {
    const res = await query<Expense>(
      `INSERT INTO expenses (business_id, title, category, amount, expense_date, payment_method, description, attachment_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.businessId,
        data.title,
        data.category,
        data.amount,
        data.expenseDate,
        data.paymentMethod || 'bank_transfer',
        data.description || null,
        data.attachmentUrl || null,
      ]
    );
    return res.rows[0];
  }

  static async update(
    businessId: string,
    id: string,
    data: Partial<Expense>
  ): Promise<Expense | null> {
    const res = await query<Expense>(
      `UPDATE expenses
       SET title = COALESCE($1, title),
           category = COALESCE($2, category),
           amount = COALESCE($3, amount),
           expense_date = COALESCE($4, expense_date),
           payment_method = COALESCE($5, payment_method),
           description = COALESCE($6, description),
           attachment_url = COALESCE($7, attachment_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE business_id = $8 AND id = $9
       RETURNING *`,
      [
        data.title || null,
        data.category || null,
        data.amount ?? null,
        data.expense_date || null,
        data.payment_method || null,
        data.description || null,
        data.attachment_url || null,
        businessId,
        id,
      ]
    );
    return res.rows[0] || null;
  }

  static async delete(businessId: string, id: string): Promise<boolean> {
    const res = await query('DELETE FROM expenses WHERE business_id = $1 AND id = $2', [
      businessId,
      id,
    ]);
    return (res.rowCount ?? 0) > 0;
  }
}
