import { query } from '../config/database';
import { User } from '../types';

export class UserRepository {
  static async findByEmail(email: string): Promise<User | null> {
    const res = await query<User>(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE LIMIT 1',
      [email.toLowerCase()]
    );
    return res.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const res = await query<User>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] || null;
  }

  static async findByBusinessAndEmail(businessId: string, email: string): Promise<User | null> {
    const res = await query<User>(
      'SELECT * FROM users WHERE business_id = $1 AND email = $2 LIMIT 1',
      [businessId, email.toLowerCase()]
    );
    return res.rows[0] || null;
  }

  static async create(userData: {
    businessId: string;
    role: 'admin' | 'customer';
    email: string;
    passwordHash: string;
    fullName: string;
    phone?: string;
  }): Promise<User> {
    const res = await query<User>(
      `INSERT INTO users (business_id, role, email, password_hash, full_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userData.businessId,
        userData.role,
        userData.email.toLowerCase(),
        userData.passwordHash,
        userData.fullName,
        userData.phone || null,
      ]
    );
    return res.rows[0];
  }

  static async updatePassword(id: string, passwordHash: string): Promise<void> {
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, id]
    );
  }

  static async updateProfile(id: string, fullName: string, phone?: string): Promise<User | null> {
    const res = await query<User>(
      `UPDATE users 
       SET full_name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [fullName, phone || null, id]
    );
    return res.rows[0] || null;
  }
}
