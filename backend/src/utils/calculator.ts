/**
 * Accurate financial decimal arithmetic helper.
 * Uses integer cents (scaled by 100) or high precision rounding
 * to prevent floating-point anomalies (e.g., 0.1 + 0.2 = 0.30000000000000004).
 */

export const roundMoney = (val: number): number => {
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

export interface InvoiceCalculationInput {
  items: Array<{
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    tax_rate?: number;
  }>;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  tax_rate?: number;
  other_charges?: number;
  paid_amount?: number;
}

export interface CalculatedItem {
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

export interface InvoiceCalculationResult {
  items: CalculatedItem[];
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  tax_amount: number;
  other_charges: number;
  grand_total: number;
  paid_amount: number;
  balance_due: number;
}

export const calculateInvoiceFinancials = (input: InvoiceCalculationInput): InvoiceCalculationResult => {
  let subtotal = 0;
  const calculatedItems: CalculatedItem[] = [];

  for (const item of input.items) {
    const qty = Math.max(0, item.quantity || 0);
    const price = Math.max(0, item.unit_price || 0);
    const rawLine = roundMoney(qty * price);
    const itemDiscount = Math.min(rawLine, roundMoney(item.discount_amount || 0));
    const itemTaxable = Math.max(0, roundMoney(rawLine - itemDiscount));
    const itemTaxRate = Math.max(0, item.tax_rate || 0);
    const itemTax = roundMoney((itemTaxable * itemTaxRate) / 100);
    const lineTotal = roundMoney(itemTaxable + itemTax);

    subtotal = roundMoney(subtotal + rawLine);
    calculatedItems.push({
      quantity: qty,
      unit_price: price,
      discount_amount: itemDiscount,
      tax_rate: itemTaxRate,
      tax_amount: itemTax,
      line_total: lineTotal,
    });
  }

  // Invoice-level discount
  let invoiceDiscount = 0;
  if (input.discount_type === 'percentage') {
    const pct = Math.min(100, Math.max(0, input.discount_value || 0));
    invoiceDiscount = roundMoney((subtotal * pct) / 100);
  } else if (input.discount_type === 'fixed') {
    invoiceDiscount = Math.min(subtotal, Math.max(0, roundMoney(input.discount_value || 0)));
  }

  const taxableAmount = Math.max(0, roundMoney(subtotal - invoiceDiscount));
  const invoiceTaxRate = Math.max(0, input.tax_rate || 0);
  const taxAmount = roundMoney((taxableAmount * invoiceTaxRate) / 100);
  const otherCharges = Math.max(0, roundMoney(input.other_charges || 0));

  const grandTotal = roundMoney(taxableAmount + taxAmount + otherCharges);
  const paidAmount = Math.max(0, roundMoney(input.paid_amount || 0));
  const balanceDue = Math.max(0, roundMoney(grandTotal - paidAmount));

  return {
    items: calculatedItems,
    subtotal,
    discount_amount: invoiceDiscount,
    taxable_amount: taxableAmount,
    tax_amount: taxAmount,
    other_charges: otherCharges,
    grand_total: grandTotal,
    paid_amount: paidAmount,
    balance_due: balanceDue,
  };
};
