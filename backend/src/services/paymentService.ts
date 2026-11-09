import { PaymentRepository } from '../repositories/paymentRepository';
import { InvoiceRepository } from '../repositories/invoiceRepository';
import { BusinessRepository } from '../repositories/businessRepository';
import { generatePaymentReceiptPDF } from '../utils/pdfGenerator';
import { createNotification } from '../utils/notifications';
import { logAudit } from '../utils/auditLogger';
import { PaymentMethod } from '../types';

export class PaymentService {
  static async listPayments(params: any) {
    return await PaymentRepository.list(params);
  }

  static async getPayment(businessId: string, paymentId: string) {
    const payment = await PaymentRepository.findById(businessId, paymentId);
    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  static async recordPayment(
    businessId: string,
    userId: string,
    data: {
      invoiceId: string;
      paymentDate: string;
      amount: number;
      paymentMethod: PaymentMethod;
      transactionReference?: string;
      notes?: string;
    }
  ) {
    const payment = await PaymentRepository.recordPayment({
      businessId,
      invoiceId: data.invoiceId,
      paymentDate: data.paymentDate,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      transactionReference: data.transactionReference,
      notes: data.notes,
      recordedBy: userId,
    });

    await logAudit({
      businessId,
      userId,
      action: 'PAYMENT_RECORDED',
      entityType: 'payment',
      entityId: payment.id,
      details: {
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        invoiceId: payment.invoice_id,
      },
    });

    await createNotification({
      businessId,
      title: `Payment Received: ${payment.payment_number}`,
      message: `Recorded payment of ${payment.amount} via ${payment.payment_method}.`,
      type: 'payment_received',
      link: `/payments`,
    });

    return payment;
  }

  static async reversePayment(businessId: string, userId: string, paymentId: string) {
    const reversed = await PaymentRepository.reversePayment(businessId, paymentId);

    await logAudit({
      businessId,
      userId,
      action: 'PAYMENT_REVERSED',
      entityType: 'payment',
      entityId: paymentId,
      details: { paymentNumber: reversed.payment_number, amount: reversed.amount },
    });

    return reversed;
  }

  static async streamPaymentReceiptPDF(
    businessId: string,
    paymentId: string,
    stream: NodeJS.WritableStream
  ) {
    const payment = await PaymentRepository.findById(businessId, paymentId);
    if (!payment) throw new Error('Payment not found');

    const invoice = await InvoiceRepository.findById(businessId, payment.invoice_id);
    if (!invoice) throw new Error('Invoice not found');

    const business = await BusinessRepository.findById(businessId);
    if (!business) throw new Error('Business not found');

    return await generatePaymentReceiptPDF(payment, invoice, business, stream);
  }
}
