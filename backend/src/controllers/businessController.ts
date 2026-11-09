import { Request, Response, NextFunction } from 'express';
import { BusinessRepository } from '../repositories/businessRepository';
import { CustomerRepository } from '../repositories/customerRepository';
import { ProductRepository } from '../repositories/productRepository';
import { sendSuccess, sendError } from '../utils/response';
import { withTransaction } from '../config/database';

export class BusinessController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const business = await BusinessRepository.findById(businessId);
      if (!business) return sendError(res, 'Business not found', 404);

      const settings = await BusinessRepository.getSettings(businessId);
      return sendSuccess(res, { business, settings });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const updated = await BusinessRepository.update(businessId, req.body);
      return sendSuccess(res, updated, 'Shop profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const settings = await BusinessRepository.getSettings(businessId);
      return sendSuccess(res, settings);
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const b = req.body;
      const settings = await BusinessRepository.upsertSettings(businessId, {
        invoice_prefix: b.invoicePrefix || b.invoice_prefix,
        next_invoice_number: b.nextInvoiceNumber || b.next_invoice_number,
        default_due_days: b.defaultDueDays ?? b.default_due_days,
        default_tax_rate: b.defaultTaxRate ?? b.default_tax_rate,
        default_notes: b.defaultNotes || b.default_notes,
        default_terms: b.defaultTerms || b.default_terms,
        bank_name: b.bankName || b.bank_name,
        account_number: b.accountNumber || b.account_number,
        routing_or_ifsc: b.routingOrIfsc || b.routing_or_ifsc,
        upi_id: b.upiId || b.upi_id,
        receipt_header: b.receiptHeader || b.receipt_header,
        receipt_footer: b.receiptFooter || b.receipt_footer,
        tax_name: b.taxName || b.tax_name,
        tax_inclusive: b.taxInclusive ?? b.tax_inclusive,
        low_stock_threshold: b.lowStockThreshold ?? b.low_stock_threshold,
        barcode_enabled: b.barcodeEnabled ?? b.barcode_enabled,
      });
      return sendSuccess(res, settings, 'Shop and receipt settings saved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async completeSetupWizard(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const {
        name,
        address,
        currency,
        invoicePrefix,
        nextInvoiceNumber,
        defaultTaxRate,
        taxName,
        receiptHeader,
        receiptFooter,
        lowStockThreshold,
        bankName,
        accountNumber,
        routingOrIfsc,
        upiId,
        paymentInstructions,
        firstCustomer,
        firstCatalogItem,
      } = req.body;

      await withTransaction(async () => {
        // Update shop info
        await BusinessRepository.update(businessId, {
          name,
          address,
          currency: currency || '₹',
          paymentInstructions,
          setupCompleted: true,
        });

        // Update settings
        await BusinessRepository.upsertSettings(businessId, {
          invoice_prefix: invoicePrefix || 'BILL-',
          next_invoice_number: nextInvoiceNumber || 1001,
          default_tax_rate: defaultTaxRate || 5,
          tax_name: taxName || 'GST',
          receipt_header: receiptHeader || 'Welcome to our store!',
          receipt_footer: receiptFooter || 'Thank you for shopping with us! Visit again.',
          low_stock_threshold: lowStockThreshold || 10,
          bank_name: bankName,
          account_number: accountNumber,
          routing_or_ifsc: routingOrIfsc,
          upi_id: upiId,
        });

        // Optional first customer
        if (firstCustomer && firstCustomer.name) {
          await CustomerRepository.create({
            businessId,
            name: firstCustomer.name,
            email: firstCustomer.email,
            phone: firstCustomer.phone,
          });
        }

        // Optional first product
        if (firstCatalogItem && firstCatalogItem.name) {
          await ProductRepository.create(
            businessId,
            {
              name: firstCatalogItem.name,
              sellingPrice: firstCatalogItem.price || 0,
              purchasePrice: Math.round((firstCatalogItem.price || 0) * 0.7 * 100) / 100,
              category: firstCatalogItem.category || 'General',
            },
            req.user!.userId
          );
        }
      });

      const updated = await BusinessRepository.findById(businessId);
      const settings = await BusinessRepository.getSettings(businessId);
      return sendSuccess(res, { business: updated, settings }, 'Setup wizard completed!');
    } catch (err) {
      next(err);
    }
  }
}
