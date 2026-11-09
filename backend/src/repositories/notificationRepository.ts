import { query } from '../config/database';
import { Notification } from '../types';

export class NotificationRepository {
  static async list(params: {
    businessId: string;
    userId?: string;
    limit?: number;
  }): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const limit = params.limit || 30;

    const listRes = await query<Notification>(
      `SELECT * FROM notifications 
       WHERE business_id = $1 AND (user_id IS NULL OR user_id = $2)
       ORDER BY created_at DESC 
       LIMIT $3`,
      [params.businessId, params.userId || null, limit]
    );

    const countRes = await query(
      `SELECT COUNT(*) FROM notifications 
       WHERE business_id = $1 AND (user_id IS NULL OR user_id = $2) AND is_read = FALSE`,
      [params.businessId, params.userId || null]
    );
    const unreadCount = parseInt(countRes.rows[0].count, 10);

    return {
      notifications: listRes.rows,
      unreadCount,
    };
  }

  static async markAsRead(businessId: string, id: string): Promise<boolean> {
    const res = await query(
      `UPDATE notifications SET is_read = TRUE WHERE business_id = $1 AND id = $2`,
      [businessId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async markAllAsRead(businessId: string, userId?: string): Promise<void> {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE business_id = $1 AND (user_id IS NULL OR user_id = $2)`,
      [businessId, userId || null]
    );
  }
}
