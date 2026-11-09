import PDFDocument from 'pdfkit';
import { Invoice, Business, Payment } from '../types';

export const generateInvoicePDF = (
  invoice: Invoice,
  business: Business,
  stream: NodeJS.WritableStream
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });

      doc.pipe(stream);

      // Colors
      const primaryColor = '#1e293b'; // Slate 800
      const accentColor = '#2563eb'; // Blue 600
      const mutedColor = '#64748b'; // Slate 500
      const lightBg = '#f8fafc'; // Slate 50

      // Top Header Bar
      doc.rect(40, 40, 515, 6).fill(accentColor);

      // Business Header
      doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text(business.name, 40, 60);
      doc.fillColor(mutedColor).fontSize(9).font('Helvetica');

      let currentY = 85;
      if (business.address) {
        doc.text(business.address, 40, currentY);
        currentY += 14;
      }
      doc.text(`Email: ${business.email}${business.phone ? ` | Phone: ${business.phone}` : ''}`, 40, currentY);
      currentY += 14;
      if (business.tax_id) {
        doc.text(`Tax ID / EIN: ${business.tax_id}`, 40, currentY);
        currentY += 14;
      }

      // Invoice Title & Status
      doc.fillColor(primaryColor).fontSize(24).font('Helvetica-Bold').text('INVOICE', 350, 60, { align: 'right' });
      doc.fillColor(accentColor).fontSize(11).font('Helvetica-Bold').text(`# ${invoice.invoice_number}`, 350, 90, { align: 'right' });

      // Status Pill
      const statusText = invoice.status.toUpperCase().replace('_', ' ');
      doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text(`Status: ${statusText}`, 350, 105, { align: 'right' });

      // Invoice Dates Box
      currentY = Math.max(currentY + 15, 130);
      doc.rect(40, currentY, 515, 70).fill(lightBg);

      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
      doc.text('BILLED TO:', 55, currentY + 10);
      doc.text('INVOICE DETAILS:', 340, currentY + 10);

      doc.font('Helvetica').fillColor('#334155');
      const custName = invoice.customer_snapshot?.name || invoice.customer_name || 'Walk-in Customer';
      const custEmail = invoice.customer_snapshot?.email || invoice.customer_email || '';
      const custAddress = invoice.customer_snapshot?.address || '';

      doc.text(custName, 55, currentY + 24);
      if (custEmail) doc.text(custEmail, 55, currentY + 36);
      if (invoice.cashier_name) {
        doc.text(`Cashier: ${invoice.cashier_name}`, 55, currentY + 48);
      }

      const invDate = new Date(invoice.invoice_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const dueDate = new Date(invoice.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      doc.text(`Invoice Date: ${invDate}`, 340, currentY + 24);
      doc.text(`Due Date: ${dueDate}`, 340, currentY + 36);
      doc.text(`Payment: ${(invoice.payment_method || 'cash').toUpperCase()}`, 340, currentY + 48);

      // Table Header
      let tableY = currentY + 85;
      doc.rect(40, tableY, 515, 24).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('ITEM & DESCRIPTION', 50, tableY + 7);
      doc.text('QTY', 310, tableY + 7, { width: 40, align: 'right' });
      doc.text('UNIT PRICE', 360, tableY + 7, { width: 65, align: 'right' });
      doc.text('TAX %', 430, tableY + 7, { width: 40, align: 'right' });
      doc.text('TOTAL', 480, tableY + 7, { width: 65, align: 'right' });

      // Table Rows
      let rowY = tableY + 24;
      doc.font('Helvetica').fontSize(9);

      const items = invoice.items || [];
      items.forEach((item, index) => {
        const bg = index % 2 === 0 ? '#ffffff' : lightBg;
        doc.rect(40, rowY, 515, 26).fill(bg);

        doc.fillColor('#1e293b');
        doc.text(item.name, 50, rowY + 7, { width: 250, ellipsis: true });
        doc.fillColor(mutedColor);
        doc.text(String(item.quantity), 310, rowY + 7, { width: 40, align: 'right' });
        doc.text(`${business.currency} ${Number(item.unit_price).toFixed(2)}`, 360, rowY + 7, { width: 65, align: 'right' });
        doc.text(`${Number(item.tax_rate || 0)}%`, 430, rowY + 7, { width: 40, align: 'right' });
        doc.fillColor('#1e293b').font('Helvetica-Bold');
        doc.text(`${business.currency} ${Number(item.line_total).toFixed(2)}`, 480, rowY + 7, { width: 65, align: 'right' });
        doc.font('Helvetica');

        rowY += 26;
      });

      // Totals Box
      rowY += 15;
      const totalsX = 330;
      const totalsWidth = 225;

      const drawTotalLine = (label: string, amount: string, isBold = false, isAccent = false) => {
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica');
        doc.fillColor(isAccent ? accentColor : isBold ? primaryColor : mutedColor);
        doc.fontSize(isBold ? 10 : 9);
        doc.text(label, totalsX, rowY);
        doc.text(amount, totalsX, rowY, { width: totalsWidth, align: 'right' });
        rowY += 16;
      };

      drawTotalLine('Subtotal', `${business.currency} ${Number(invoice.subtotal).toFixed(2)}`);
      if (Number(invoice.discount_amount) > 0) {
        drawTotalLine('Discount', `-${business.currency} ${Number(invoice.discount_amount).toFixed(2)}`);
      }
      if (Number(invoice.tax_amount) > 0) {
        drawTotalLine(`Tax (${invoice.tax_rate}%)`, `${business.currency} ${Number(invoice.tax_amount).toFixed(2)}`);
      }
      if (Number(invoice.other_charges) > 0) {
        drawTotalLine('Other Charges', `${business.currency} ${Number(invoice.other_charges).toFixed(2)}`);
      }

      doc.rect(totalsX, rowY, totalsWidth, 1).fill('#cbd5e1');
      rowY += 6;
      drawTotalLine('Grand Total', `${business.currency} ${Number(invoice.grand_total).toFixed(2)}`, true);
      drawTotalLine('Paid Amount', `${business.currency} ${Number(invoice.paid_amount).toFixed(2)}`);
      doc.rect(totalsX, rowY, totalsWidth, 1).fill('#cbd5e1');
      rowY += 6;
      drawTotalLine('Balance Due', `${business.currency} ${Number(invoice.balance_due).toFixed(2)}`, true, true);

      // Notes & Instructions
      rowY = Math.max(rowY + 20, 620);
      if (invoice.notes || business.payment_instructions || invoice.payment_instructions) {
        doc.rect(40, rowY, 515, 80).fill(lightBg);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('PAYMENT INSTRUCTIONS & NOTES', 50, rowY + 10);
        doc.fillColor('#475569').fontSize(8).font('Helvetica');

        const instr = invoice.payment_instructions || business.payment_instructions;
        if (instr) {
          doc.text(`Payment: ${instr}`, 50, rowY + 24, { width: 495 });
        }
        if (invoice.notes) {
          doc.text(`Notes: ${invoice.notes}`, 50, rowY + (instr ? 45 : 24), { width: 495 });
        }
      }

      // Footer
      doc.fillColor(mutedColor).fontSize(8).text(
        'Thank you for your business. Generated by BillFlow Billing Platform.',
        40,
        780,
        { align: 'center', width: 515 }
      );

      doc.end();
      doc.on('end', () => resolve());
      doc.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

export const generatePaymentReceiptPDF = (
  payment: Payment,
  invoice: Invoice,
  business: Business,
  stream: NodeJS.WritableStream
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      doc.pipe(stream);

      const primaryColor = '#1e293b';
      const greenColor = '#16a34a'; // Emerald 600 for payment receipt
      const mutedColor = '#64748b';

      doc.rect(40, 40, 515, 6).fill(greenColor);
      doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text(business.name, 40, 60);
      doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text(`Receipt ID: ${payment.payment_number}`, 40, 85);

      doc.fillColor(greenColor).fontSize(22).font('Helvetica-Bold').text('PAYMENT RECEIPT', 300, 60, { align: 'right' });
      doc.fillColor(mutedColor).fontSize(9).font('Helvetica').text(`Date: ${payment.payment_date}`, 300, 85, { align: 'right' });

      // Receipt details box
      doc.rect(40, 120, 515, 180).fill('#f8fafc');
      doc.rect(40, 120, 515, 180).stroke('#e2e8f0');

      let y = 140;
      const drawField = (label: string, val: string) => {
        doc.fillColor(mutedColor).fontSize(9).font('Helvetica-Bold').text(label, 60, y);
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica').text(val, 200, y);
        y += 24;
      };

      drawField('Received From:', payment.customer_name || 'Customer');
      drawField('Invoice Applied:', invoice.invoice_number);
      drawField('Payment Method:', payment.payment_method.toUpperCase().replace('_', ' '));
      if (payment.transaction_reference) {
        drawField('Reference / Txn ID:', payment.transaction_reference);
      }
      drawField('Total Invoice Amount:', `${business.currency} ${Number(invoice.grand_total).toFixed(2)}`);
      drawField('Remaining Balance Due:', `${business.currency} ${Number(invoice.balance_due).toFixed(2)}`);

      // Big Amount Stamp
      doc.rect(40, 330, 515, 65).fill('#ecfdf5');
      doc.fillColor(greenColor).fontSize(12).font('Helvetica-Bold').text('AMOUNT RECEIVED', 60, 345);
      doc.fontSize(22).text(`${business.currency} ${Number(payment.amount).toFixed(2)}`, 60, 362);

      doc.fillColor(mutedColor).fontSize(9).font('Helvetica');
      doc.text(
        'This receipt confirms payment recording in BillFlow. It serves as an official accounting acknowledgment.',
        40,
        430,
        { width: 515 }
      );

      doc.end();
      doc.on('end', () => resolve());
      doc.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};
