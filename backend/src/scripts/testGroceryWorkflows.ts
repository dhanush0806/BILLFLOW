import { pool } from '../config/database';
import { PosRepository } from '../repositories/posRepository';
import { PurchaseRepository } from '../repositories/purchaseRepository';
import { ReturnRepository } from '../repositories/returnRepository';
import { InvoiceRepository } from '../repositories/invoiceRepository';
import { ProductRepository } from '../repositories/productRepository';

export async function runGroceryWorkflowsTest() {
  console.log('🧪 Starting Automated Grocery Shop Billing & Management System Verification...\n');
  const client = await pool.connect();

  try {
    // 0. Ensure schema migrations have run
    console.log('Step 0: Locating active test business...');
    const bizRes = await client.query('SELECT id, name, currency FROM businesses LIMIT 1');
    if (bizRes.rowCount === 0) {
      throw new Error('No business found in database. Please run npm run seed first.');
    }
    const businessId = bizRes.rows[0].id;
    const currency = bizRes.rows[0].currency || '₹';

    const userRes = await client.query('SELECT id, full_name, role FROM users WHERE business_id = $1 LIMIT 1', [businessId]);
    const userId = userRes.rows[0]?.id;

    console.log(`✅ Business: "${bizRes.rows[0].name}" (${businessId}) | Staff User: ${userRes.rows[0]?.full_name}\n`);

    // STEP 1: Add a dedicated test product with known stock
    console.log('--- TEST 1: PRODUCT & INITIAL STOCK ---');
    const testSku = `TEST-${Date.now().toString().slice(-6)}`;
    const testBarcode = `890${Date.now().toString().slice(-7)}`;
    const initialStock = 50;
    const testProduct = await ProductRepository.create(
      businessId,
      {
        name: `Test Organic Wheat Flour (${testSku})`,
        sku: testSku,
        barcode: testBarcode,
        purchasePrice: 40,
        sellingPrice: 65,
        unit: 'kg',
        stockQuantity: initialStock,
        minimumStock: 10,
        taxRate: 5,
      },
      userId
    );
    console.log(`✅ Created test product "${testProduct.name}"`);
    console.log(`   Initial stock: ${initialStock} kg | Barcode: ${testBarcode} | Selling Price: ${currency}65.00`);

    // STEP 2 & 3: POS Bill Creation, Invoice Generation, Payment Saving & Stock Deduction
    console.log('\n--- TEST 2 & 3: POS BILL, STOCK DEDUCTION & PAYMENT LEDGER ---');
    const sellQty = 5;
    const checkoutResult = await PosRepository.checkout(
      businessId,
      {
        customerName: 'Suresh Kumar',
        customerPhone: '+91 98888 77777',
        items: [
          {
            productId: testProduct.id,
            name: testProduct.name,
            quantity: sellQty,
            unitPrice: 65,
            taxRate: 5,
          },
        ],
        paymentMethod: 'cash',
        tenderedCash: 400,
      },
      userId
    );

    const invoice = checkoutResult.invoice;
    console.log(`✅ Sale completed! Bill #${invoice.invoice_number}`);
    console.log(`   Subtotal: ${currency}${invoice.subtotal} | Tax: ${currency}${invoice.tax_amount} | Grand Total: ${currency}${invoice.grand_total}`);

    // Verify payment record in database
    const payRes = await client.query('SELECT * FROM payments WHERE invoice_id = $1', [invoice.id]);
    if (payRes.rowCount === 0) {
      throw new Error('❌ Payment was NOT saved in database!');
    }
    console.log(`✅ Payment verified: ${payRes.rows[0].payment_number} (${currency}${payRes.rows[0].amount} via ${payRes.rows[0].payment_method})`);

    // Verify stock deduction
    const pAfterSale = await ProductRepository.findById(businessId, testProduct.id);
    const stockAfterSale = parseFloat(pAfterSale!.stock_quantity as any);
    const expectedStockAfterSale = initialStock - sellQty;
    if (Math.abs(stockAfterSale - expectedStockAfterSale) > 0.01) {
      throw new Error(`❌ Stock deduction failed! Expected ${expectedStockAfterSale}, got ${stockAfterSale}`);
    }
    console.log(`✅ Stock accurately deducted: ${initialStock} -> ${stockAfterSale} kg (-${sellQty} kg)`);

    // Verify stock movement
    const movSaleRes = await client.query(
      "SELECT * FROM stock_movements WHERE reference_id = $1 AND movement_type = 'sale'",
      [invoice.id]
    );
    if (movSaleRes.rowCount === 0) {
      throw new Error('❌ Stock movement log was NOT created for sale!');
    }
    console.log(`✅ Stock movement logged: ${movSaleRes.rows[0].movement_type} (${movSaleRes.rows[0].quantity_change} units)`);

    // Verify negative stock prevention
    console.log('\n--- VERIFYING NEGATIVE STOCK PREVENTION ---');
    try {
      await PosRepository.checkout(
        businessId,
        {
          items: [{ productId: testProduct.id, name: testProduct.name, quantity: 9999, unitPrice: 65 }],
          paymentMethod: 'cash',
        },
        userId
      );
      throw new Error('❌ Negative stock test failed! Overdrawn sale was unexpectedly allowed.');
    } catch (err: any) {
      if (err.message.includes('Insufficient stock')) {
        console.log(`✅ Negative stock successfully blocked: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // STEP 4: Purchase Order & Goods Receiving Workflow
    console.log('\n--- TEST 4: PURCHASES & GOODS RECEIVING WORKFLOW ---');
    const supRes = await client.query('SELECT id, name FROM suppliers WHERE business_id = $1 LIMIT 1', [businessId]);
    if (supRes.rowCount === 0) {
      throw new Error('No suppliers found in database.');
    }
    const supplierId = supRes.rows[0].id;
    const purchaseQty = 20;

    // A: Create purchase with status = 'ordered' (goods not yet received)
    const po = await PurchaseRepository.create(
      businessId,
      {
        supplierId,
        purchaseDate: new Date().toISOString().split('T')[0],
        status: 'ordered',
        items: [
          {
            productId: testProduct.id,
            productName: testProduct.name,
            quantity: purchaseQty,
            unitCost: 42,
            taxRate: 5,
          },
        ],
        notes: 'Verification purchase order',
      },
      userId
    );
    console.log(`✅ Purchase order created with status = '${po.status}': ${po.purchase_number}`);

    // Verify stock has NOT increased yet while ordered
    const pOrdered = await ProductRepository.findById(businessId, testProduct.id);
    if (Math.abs(parseFloat(pOrdered!.stock_quantity as any) - stockAfterSale) > 0.01) {
      throw new Error('❌ Stock increased prematurely for an unreceived purchase order!');
    }
    console.log(`✅ Stock unchanged before shipment arrival: ${stockAfterSale} kg`);

    // B: Receive goods
    await PurchaseRepository.receiveGoods(businessId, po.id, userId);
    const pReceived = await ProductRepository.findById(businessId, testProduct.id);
    const stockAfterReceive = parseFloat(pReceived!.stock_quantity as any);
    const expectedAfterReceive = stockAfterSale + purchaseQty;
    if (Math.abs(stockAfterReceive - expectedAfterReceive) > 0.01) {
      throw new Error(`❌ Stock did not increase after goods received! Expected ${expectedAfterReceive}, got ${stockAfterReceive}`);
    }
    console.log(`✅ Goods received! Stock increased: ${stockAfterSale} -> ${stockAfterReceive} kg (+${purchaseQty} kg)`);

    // C: Verify stock cannot be added twice
    try {
      await PurchaseRepository.receiveGoods(businessId, po.id, userId);
      throw new Error('❌ Double-receiving was allowed!');
    } catch (err: any) {
      if (err.message.includes('already been received')) {
        console.log(`✅ Duplicate receipt successfully prevented: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // STEP 5: Sales Return & Resalable Stock Restoration
    console.log('\n--- TEST 5: SALES RETURNS & RESALABLE REFUND RESTORATION ---');
    const returnQty = 2;
    const returnRecord = await ReturnRepository.createReturn(
      businessId,
      {
        invoiceId: invoice.id,
        returnDate: new Date().toISOString().split('T')[0],
        reason: 'Customer requested refund for unopened bag',
        refundMethod: 'cash',
        items: [
          {
            productId: testProduct.id,
            productName: testProduct.name,
            quantity: returnQty,
            unitPrice: 65,
            refundAmount: returnQty * 65,
            isResalable: true,
          },
        ],
      },
      userId
    );
    console.log(`✅ Sales return processed: ${returnRecord.return_number}`);
    console.log(`   Refund Amount: ${currency}${returnRecord.total_refund_amount} via ${returnRecord.refund_method}`);

    // Verify stock restored for resalable item
    const pAfterReturn = await ProductRepository.findById(businessId, testProduct.id);
    const stockAfterReturn = parseFloat(pAfterReturn!.stock_quantity as any);
    const expectedAfterReturn = stockAfterReceive + returnQty;
    if (Math.abs(stockAfterReturn - expectedAfterReturn) > 0.01) {
      throw new Error(`❌ Stock restoration failed! Expected ${expectedAfterReturn}, got ${stockAfterReturn}`);
    }
    console.log(`✅ Stock restored to inventory: ${stockAfterReceive} -> ${stockAfterReturn} kg (+${returnQty} kg)`);

    // STEP 6: Reopen and verify original bill remains untampered
    console.log('\n--- TEST 6: REOPEN HISTORICAL INVOICE INTEGRITY ---');
    const reopenedInvoice = await InvoiceRepository.findById(businessId, invoice.id);
    if (!reopenedInvoice) {
      throw new Error('❌ Failed to retrieve historical invoice!');
    }
    if (reopenedInvoice.invoice_number !== invoice.invoice_number) {
      throw new Error('❌ Invoice number mismatch!');
    }
    console.log(`✅ Historical invoice retrieved intact: ${reopenedInvoice.invoice_number}`);
    console.log(`   Customer: ${reopenedInvoice.customer_name}`);
    console.log(`   Billed Items: ${reopenedInvoice.items?.length} item(s)`);
    console.log(`   Grand Total: ${currency}${reopenedInvoice.grand_total}`);
    console.log(`   Cashier: ${reopenedInvoice.cashier_name || 'Counter Staff'}`);

    console.log('\n===========================================================');
    console.log('🎉 ALL 6 GROCERY SHOP WORKFLOWS VERIFIED SUCCESSFULLY!');
    console.log('===========================================================');
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runGroceryWorkflowsTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Workflow test failed:', err);
      process.exit(1);
    });
}
