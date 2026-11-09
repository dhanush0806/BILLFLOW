import { InvoiceRepository } from '../repositories/invoiceRepository';
import { BusinessRepository } from '../repositories/businessRepository';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { createNotification } from '../utils/notifications';
import { logAudit } from '../utils/auditLogger';
import { InvoiceItem, InvoiceStatus } from '../types';

export class InvoiceService {
  static async listInvoices(params: any) {
    // Check and automatically transition past-due invoices to 'overdue'
    await InvoiceRepository.updateOverdueStatuses();
    return await InvoiceRepository.list(params);
  }

  static async getInvoice(businessId: string, invoiceId: string) {
    const invoice = await InvoiceRepository.findById(businessId, invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  static async createInvoice(
    businessId: string,
    userId: string,
    data: {
      customerId: string;
      invoiceDate: string;
      dueDate: string;
      items: InvoiceItem[];
      discountType?: 'percentage' | 'fixed';
      discountValue?: number;
      taxRate?: number;
      otherCharges?: number;
      notes?: string;
      paymentInstructions?: string;
      status?: 'draft' | 'issued';
    }
  ) {
    const invoice = await InvoiceRepository.createInvoice(businessId, data);

    await logAudit({
      businessId,
      userId,
      action: 'INVOICE_CREATED',
      entityType: 'invoice',
      entityId: invoice.id,
      details: {
        invoiceNumber: invoice.invoice_number,
        grandTotal: invoice.grand_total,
        status: invoice.status,
      },
    });

    if (invoice.status === 'issued') {
      await createNotification({
        businessId,
        title: `Invoice ${invoice.invoice_number} Issued`,
        message: `Invoice for ${invoice.grand_total} has been marked as issued.`,
        type: 'invoice_issued',
        link: `/invoices/${invoice.id}`,
      });
    }

    return invoice;
  }

  static async issueInvoice(businessId: string, userId: string, invoiceId: string) {
    const invoice = await InvoiceRepository.findById(businessId, invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'draft') {
      throw new Error(`Cannot issue invoice in status: ${invoice.status}`);
    }

    const updated = await InvoiceRepository.updateStatus(businessId, invoiceId, 'issued');

    await logAudit({
      businessId,
      userId,
      action: 'INVOICE_ISSUED',
      entityType: 'invoice',
      entityId: invoiceId,
      details: { invoiceNumber: invoice.invoice_number },
    });

    await createNotification({
      businessId,
      title: `Invoice ${invoice.invoice_number} Issued`,
      message: `Invoice #${invoice.invoice_number} is now active and ready for payment.`,
      type: 'invoice_issued',
      link: `/invoices/${invoice.id}`,
    });

    return updated;
  }

  static async cancelInvoice(businessId: string, userId: string, invoiceId: string) {
    const cancelled = await InvoiceRepository.cancelInvoice(businessId, invoiceId);

    await logAudit({
      businessId,
      userId,
      action: 'INVOICE_CANCELLED',
      entityType: 'invoice',
      entityId: invoiceId,
      details: { invoiceNumber: cancelled.invoice_number },
    });

    await createNotification({
      businessId,
      title: `Invoice ${cancelled.invoice_number} Cancelled`,
      message: `Invoice #${cancelled.invoice_number} was voided/cancelled.`,
      type: 'invoice_cancelled',
      link: `/invoices/${cancelled.id}`,
    });

    return cancelled;
  }

  static async streamInvoicePDF(
    businessId: string,
    invoiceId: string,
    stream: NodeJS.WritableStream
  ) {
    const invoice = await InvoiceRepository.findById(businessId, invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const business = await BusinessRepository.findById(businessId);
    if (!business) throw new Error('Business not found');

    return await generateInvoicePDF(invoice, business, stream);
  }
}
