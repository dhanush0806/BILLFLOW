import { query } from '../config/database';
import { NotificationType } from '../types';

export const createNotification = async (params: {
  businessId: string;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
}) => {
  try {
    await query(
      `INSERT INTO notifications (business_id, user_id, title, message, type, link)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.businessId,
        params.userId || null,
        params.title,
        params.message,
        params.type,
        params.link || null,
      ]
    );
  } catch (err) {
    console.error('Failed to create in-app notification:', err);
  }
};
