import { query } from '../config/database';

export const logAudit = async (params: {
  businessId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any>;
  ipAddress?: string;
}) => {
  try {
    await query(
      `INSERT INTO audit_logs (business_id, user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.businessId,
        params.userId || null,
        params.action,
        params.entityType,
        params.entityId,
        params.details ? JSON.stringify(params.details) : null,
        params.ipAddress || null,
      ]
    );
  } catch (err) {
    console.error('Audit log failure (non-blocking):', err);
  }
};
