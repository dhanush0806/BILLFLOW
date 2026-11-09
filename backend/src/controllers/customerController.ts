import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { CustomerRepository } from '../repositories/customerRepository';
import { UserRepository } from '../repositories/userRepository';
import { sendSuccess, sendError } from '../utils/response';
import { withTransaction } from '../config/database';

export class CustomerController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { search, type, includeArchived, limit, offset } = req.query;

      const result = await CustomerRepository.list({
        businessId,
        search: search as string,
        type: type as string,
        includeArchived: includeArchived === 'true',
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const customer = await CustomerRepository.findById(businessId, req.params.id);
      if (!customer) return sendError(res, 'Customer not found', 404);

      const invoices = await CustomerRepository.getCustomerInvoices(businessId, req.params.id);
      const payments = await CustomerRepository.getCustomerPayments(businessId, req.params.id);

      return sendSuccess(res, {
        customer,
        invoices,
        payments,
      });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { name, email, phone, address, customerType, taxNumber, notes, portalPassword } = req.body;

      // Check duplicate in same business
      const existing = await CustomerRepository.findByEmail(businessId, email);
      if (existing) {
        return sendError(res, 'A customer with this email already exists in your business.', 409);
      }

      const result = await withTransaction(async (client) => {
        let portalUserId: string | undefined;

        if (portalPassword) {
          const passwordHash = await bcrypt.hash(portalPassword, 10);
          const userRes = await client.query(
            `INSERT INTO users (business_id, role, email, password_hash, full_name, phone)
             VALUES ($1, 'customer', $2, $3, $4, $5)
             ON CONFLICT (business_id, email) DO UPDATE SET password_hash = EXCLUDED.password_hash
             RETURNING id`,
            [businessId, email.toLowerCase(), passwordHash, name, phone || null]
          );
          portalUserId = userRes.rows[0].id;
        }

        const customerRes = await client.query(
          `INSERT INTO customers (business_id, name, email, phone, address, customer_type, tax_number, notes, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            businessId,
            name,
            email.toLowerCase(),
            phone || null,
            address || null,
            customerType || 'individual',
            taxNumber || null,
            notes || null,
            portalUserId || null,
          ]
        );

        return customerRes.rows[0];
      });

      return sendSuccess(res, result, 'Customer created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const updated = await CustomerRepository.update(businessId, req.params.id, req.body);
      if (!updated) return sendError(res, 'Customer not found', 404);

      return sendSuccess(res, updated, 'Customer updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const customerId = req.params.id;

      const hasFinances = await CustomerRepository.hasFinancialRecords(businessId, customerId);
      if (hasFinances) {
        // Safe archival instead of breaking foreign keys
        await CustomerRepository.archive(businessId, customerId);
        return sendSuccess(
          res,
          { archived: true },
          'Customer has active invoices or payments. Account has been safely archived instead of deleted.'
        );
      }

      const deleted = await CustomerRepository.delete(businessId, customerId);
      if (!deleted) return sendError(res, 'Customer not found', 404);

      return sendSuccess(res, { deleted: true }, 'Customer deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
