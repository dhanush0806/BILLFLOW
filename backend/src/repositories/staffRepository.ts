import bcrypt from 'bcrypt';
import { query } from '../config/database';
import { User, UserRole } from '../types';

export class StaffRepository {
  static async listStaff(businessId: string): Promise<Omit<User, 'password_hash'>[]> {
    const res = await query<User>(
      `SELECT id, business_id, role, email, full_name, phone, is_active, created_at, updated_at
       FROM users
       WHERE business_id = $1 AND role IN ('admin', 'cashier')
       ORDER BY role ASC, full_name ASC`,
      [businessId]
    );
    return res.rows;
  }

  static async createStaff(
    businessId: string,
    data: {
      fullName: string;
      email: string;
      password: string;
      role: 'admin' | 'cashier';
      phone?: string;
    }
  ): Promise<Omit<User, 'password_hash'>> {
    const existing = await query(
      'SELECT id FROM users WHERE business_id = $1 AND email = $2',
      [businessId, data.email.toLowerCase()]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      throw new Error('A staff account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const res = await query<User>(
      `INSERT INTO users (business_id, role, email, password_hash, full_name, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, business_id, role, email, full_name, phone, is_active, created_at, updated_at`,
      [
        businessId,
        data.role,
        data.email.toLowerCase(),
        passwordHash,
        data.fullName.trim(),
        data.phone || null,
      ]
    );
    return res.rows[0];
  }

  static async updateStatus(
    businessId: string,
    userId: string,
    isActive: boolean
  ): Promise<boolean> {
    const res = await query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE business_id = $2 AND id = $3',
      [isActive, businessId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async getActivityLogs(businessId: string, limit = 50) {
    const res = await query(
      `SELECT al.*, u.full_name AS user_name, u.role AS user_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.business_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2`,
      [businessId, limit]
    );
    return res.rows;
  }
}
