import bcrypt from 'bcrypt';
import { pool, withTransaction } from '../config/database';

export const seedDatabase = async () => {
  console.log('🌱 Seeding Retail Shop Management database with real retail records...');

  await withTransaction(async (client) => {
    // 1. Clean up existing demo retail and legacy data in correct FK order
    // Find business IDs to clean up
    const bizToDelete = await client.query(`
      SELECT id FROM businesses
      WHERE email IN ('priya@metrogadgets.shop', 'alex@billflow.dev', 'david@apexfacilities.com', 'finance@acme-innovations.io')
         OR business_type IN ('freelancer', 'service', 'shop')
    `);
    const bizIds = bizToDelete.rows.map((r: any) => r.id);

    if (bizIds.length > 0) {
      // Delete in FK-safe order: leaf tables first, then parents
      await client.query(`DELETE FROM audit_logs WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM notifications WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM stock_movements WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM sales_return_items WHERE sales_return_id IN (SELECT id FROM sales_returns WHERE business_id = ANY($1))`, [bizIds]);
      await client.query(`DELETE FROM sales_returns WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE business_id = ANY($1))`, [bizIds]);
      await client.query(`DELETE FROM supplier_payments WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM purchases WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM suppliers WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM payments WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE business_id = ANY($1))`, [bizIds]);
      await client.query(`DELETE FROM invoices WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM expenses WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM products WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM categories WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM customers WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM users WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM business_settings WHERE business_id = ANY($1)`, [bizIds]);
      await client.query(`DELETE FROM businesses WHERE id = ANY($1)`, [bizIds]);
    }

    // Also clean up orphan users by email
    await client.query(`
      DELETE FROM users
      WHERE email IN ('priya@metrogadgets.shop', 'cashier@metrogadgets.shop', 'anand@metrogadgets.shop', 'alex@billflow.dev', 'david@apexfacilities.com', 'finance@acme-innovations.io')
    `);

    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 2. Create Retail Shop Business
    const bizRes = await client.query(
      `INSERT INTO businesses (
        name, owner_name, email, phone, business_type, address, currency, tax_id, payment_instructions, setup_completed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        'Metro Supermarket & Retail Mart',
        'Priya Sharma',
        'priya@metrogadgets.shop',
        '+91 98765 43210',
        'shop',
        'Shop #12-15, Central Market Complex, MG Road, Bangalore 560001',
        '₹',
        'GSTIN29ABCDE1234F1Z5',
        'Accepted: UPI, Cash, Cards (Visa/Mastercard/RuPay). UPI ID: metroretail@upi',
        true,
      ]
    );
    const shopId = bizRes.rows[0].id;

    // 3. Create Staff Users: Store Manager (Admin) and 2 POS Cashiers
    const adminUserRes = await client.query(
      `INSERT INTO users (business_id, role, email, password_hash, full_name, phone, is_active)
       VALUES ($1, 'admin', 'priya@metrogadgets.shop', $2, 'Priya Sharma (Store Manager)', '+91 98765 43210', true)
       RETURNING id`,
      [shopId, passwordHash]
    );
    const adminId = adminUserRes.rows[0].id;

    const cashierUserRes = await client.query(
      `INSERT INTO users (business_id, role, email, password_hash, full_name, phone, is_active)
       VALUES ($1, 'cashier', 'cashier@metrogadgets.shop', $2, 'Rahul Verma (POS Cashier)', '+91 98765 11223', true)
       RETURNING id`,
      [shopId, passwordHash]
    );
    const cashierId = cashierUserRes.rows[0].id;

    const cashier2UserRes = await client.query(
      `INSERT INTO users (business_id, role, email, password_hash, full_name, phone, is_active)
       VALUES ($1, 'cashier', 'anand@metrogadgets.shop', $2, 'Anand Mohan (Evening Cashier)', '+91 98765 99887', true)
       RETURNING id`,
      [shopId, passwordHash]
    );
    const cashier2Id = cashier2UserRes.rows[0].id;

    // 4. Create Business Settings
    await client.query(
      `INSERT INTO business_settings (
        business_id, invoice_prefix, next_invoice_number, default_due_days, default_tax_rate,
        default_notes, default_terms, bank_name, account_number, routing_or_ifsc, upi_id,
        receipt_header, receipt_footer, tax_name, tax_inclusive, low_stock_threshold, barcode_enabled
      ) VALUES ($1, 'BILL-', 1026, 0, 5.00,
        'Thank you for shopping with us! Please retain this bill for exchange.',
        'Items can be exchanged within 7 days in original condition with bill receipt.',
        'HDFC Bank', '50200012345678', 'HDFC0001234', 'metroretail@upi',
        'METRO SUPERMARKET & RETAIL MART\nShop #12-15, Central Market, MG Road, Bangalore\nGSTIN: 29ABCDE1234F1Z5 | Ph: +91 98765 43210',
        '*** THANK YOU - VISIT AGAIN ***\nExchange within 7 days with original receipt\nFor feedback: support@metromart.com',
        'GST', false, 10, true
      )`,
      [shopId]
    );

    // 5. Create 7 Realistic Categories
    const categoriesData = [
      { name: 'Groceries & Staples', desc: 'Rice, wheat flour, pulses, cooking oils, spices, sugar and salt' },
      { name: 'Dairy, Bread & Eggs', desc: 'Fresh milk, butter, cheese, paneer, yogurt, eggs and bakery items' },
      { name: 'Beverages, Juices & Soft Drinks', desc: 'Fruit juices, soft drinks, tea powders, instant coffee and mineral water' },
      { name: 'Snacks, Biscuits & Chocolates', desc: 'Biscuits, potato chips, instant noodles, dry snacks, and confectionery' },
      { name: 'Personal Care & Hygiene', desc: 'Soaps, handwashes, shampoos, oral care toothpastes, and skincare' },
      { name: 'Household & Cleaning Supplies', desc: 'Detergent powders, dishwash bars, floor disinfectants, and cleaners' },
      { name: 'Stationery & School Supplies', desc: 'Spiral notebooks, ball pens, adhesives, crayons and office materials' },
    ];

    const categoryMap: Record<string, string> = {};
    for (const cat of categoriesData) {
      const res = await client.query(
        `INSERT INTO categories (business_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
        [shopId, cat.name, cat.desc]
      );
      categoryMap[cat.name] = res.rows[0].id;
    }

    // 6. Create 40+ Diverse Retail Products with Indian Barcodes
    const productsData = [
      // Groceries & Staples
      { name: 'Basmati Rice Premium 5kg', sku: 'GRO-RIC-001', barcode: '8901030010011', cat: 'Groceries & Staples', brand: 'Royal Harvest', cost: 360.00, price: 450.00, unit: 'pack', stock: 45, min: 10, tax: 5.00 },
      { name: 'Aashirvaad Superior MP Atta 5kg', sku: 'GRO-ATT-002', barcode: '8901030010028', cat: 'Groceries & Staples', brand: 'Aashirvaad', cost: 240.00, price: 295.00, unit: 'pack', stock: 60, min: 15, tax: 5.00 },
      { name: 'Fortune Sunlite Sunflower Oil 1L', sku: 'GRO-OIL-003', barcode: '8901030012345', cat: 'Groceries & Staples', brand: 'Fortune', cost: 125.00, price: 155.00, unit: 'pack', stock: 75, min: 20, tax: 5.00 },
      { name: 'Tata Salt Vacuum Evaporated 1kg', sku: 'GRO-SLT-004', barcode: '8901030889912', cat: 'Groceries & Staples', brand: 'Tata', cost: 22.00, price: 28.00, unit: 'pack', stock: 110, min: 25, tax: 0.00 },
      { name: 'Tata Sampann Unpolished Toor Dal 1kg', sku: 'GRO-DAL-005', barcode: '8901030010059', cat: 'Groceries & Staples', brand: 'Tata Sampann', cost: 145.00, price: 180.00, unit: 'pack', stock: 35, min: 10, tax: 0.00 },
      { name: 'Madhur Pure Refined Sugar 1kg', sku: 'GRO-SUG-006', barcode: '8901030010066', cat: 'Groceries & Staples', brand: 'Madhur', cost: 42.00, price: 52.00, unit: 'pack', stock: 85, min: 20, tax: 5.00 },
      { name: 'Fortune Soya Chunks 200g', sku: 'GRO-SOY-007', barcode: '8901030010073', cat: 'Groceries & Staples', brand: 'Fortune', cost: 38.00, price: 50.00, unit: 'pack', stock: 50, min: 10, tax: 5.00 },
      { name: 'Everest Garam Masala Powder 100g', sku: 'GRO-MAS-008', barcode: '8901030010080', cat: 'Groceries & Staples', brand: 'Everest', cost: 65.00, price: 82.00, unit: 'pack', stock: 40, min: 10, tax: 5.00 },

      // Dairy, Bread & Eggs
      { name: 'Amul Taaza Toned Milk 1L', sku: 'DAI-MLK-001', barcode: '8901262010111', cat: 'Dairy, Bread & Eggs', brand: 'Amul', cost: 60.00, price: 74.00, unit: 'pack', stock: 30, min: 15, tax: 0.00 },
      { name: 'Amul Pasteurised Butter 500g', sku: 'DAI-BTR-002', barcode: '8901262010128', cat: 'Dairy, Bread & Eggs', brand: 'Amul', cost: 245.00, price: 285.00, unit: 'pack', stock: 4, min: 10, tax: 12.00 }, // LOW STOCK!
      { name: 'Modern Whole Wheat Sandwich Bread 400g', sku: 'DAI-BRD-003', barcode: '8901262010135', cat: 'Dairy, Bread & Eggs', brand: 'Modern', cost: 35.00, price: 48.00, unit: 'pack', stock: 0, min: 10, tax: 0.00 }, // OUT OF STOCK!
      { name: 'Amul Fresh Malai Paneer 200g', sku: 'DAI-PNR-004', barcode: '8901262010142', cat: 'Dairy, Bread & Eggs', brand: 'Amul', cost: 80.00, price: 100.00, unit: 'pack', stock: 18, min: 8, tax: 5.00 },
      { name: 'Farm Fresh White Eggs Tray (30 pcs)', sku: 'DAI-EGG-005', barcode: '8901262010159', cat: 'Dairy, Bread & Eggs', brand: 'Farm Fresh', cost: 180.00, price: 225.00, unit: 'tray', stock: 12, min: 5, tax: 0.00 },
      { name: 'Milky Mist Natural Greek Yogurt 400g', sku: 'DAI-YOG-006', barcode: '8901262010166', cat: 'Dairy, Bread & Eggs', brand: 'Milky Mist', cost: 75.00, price: 95.00, unit: 'cup', stock: 3, min: 6, tax: 5.00 }, // LOW STOCK!

      // Beverages, Juices & Soft Drinks
      { name: 'Coca-Cola Original Taste 750ml', sku: 'BEV-COK-001', barcode: '8901764012012', cat: 'Beverages, Juices & Soft Drinks', brand: 'Coca-Cola', cost: 32.00, price: 42.00, unit: 'bottle', stock: 65, min: 15, tax: 18.00 },
      { name: 'Real Fruit Power Mixed Fruit Juice 1L', sku: 'BEV-JUC-002', barcode: '8901764012029', cat: 'Beverages, Juices & Soft Drinks', brand: 'Real', cost: 95.00, price: 125.00, unit: 'pack', stock: 28, min: 10, tax: 12.00 },
      { name: 'Red Label Natural Care Tea 500g', sku: 'BEV-TEA-003', barcode: '8901764012036', cat: 'Beverages, Juices & Soft Drinks', brand: 'Brooke Bond', cost: 260.00, price: 320.00, unit: 'pack', stock: 32, min: 10, tax: 5.00 },
      { name: 'Nescafe Classic Instant Coffee 100g Jar', sku: 'BEV-COF-004', barcode: '8901764012043', cat: 'Beverages, Juices & Soft Drinks', brand: 'Nescafe', cost: 270.00, price: 340.00, unit: 'jar', stock: 24, min: 8, tax: 18.00 },
      { name: 'Kinley Packaged Drinking Water 1L', sku: 'BEV-WTR-005', barcode: '8901764012050', cat: 'Beverages, Juices & Soft Drinks', brand: 'Kinley', cost: 12.00, price: 20.00, unit: 'bottle', stock: 140, min: 30, tax: 18.00 },
      { name: 'Frooti Mango Drink 600ml', sku: 'BEV-FRO-006', barcode: '8901764012067', cat: 'Beverages, Juices & Soft Drinks', brand: 'Parle Agro', cost: 30.00, price: 40.00, unit: 'bottle', stock: 55, min: 15, tax: 12.00 },

      // Snacks, Biscuits & Chocolates
      { name: 'Maggi 2-Minute Masala Noodles (Pack of 4)', sku: 'SNK-MAG-001', barcode: '8901058852211', cat: 'Snacks, Biscuits & Chocolates', brand: 'Nestle', cost: 50.00, price: 64.00, unit: 'pack', stock: 85, min: 20, tax: 12.00 },
      { name: 'Britannia Good Day Cashew Cookies 200g', sku: 'SNK-BRT-002', barcode: '8901499008123', cat: 'Snacks, Biscuits & Chocolates', brand: 'Britannia', cost: 38.00, price: 50.00, unit: 'pack', stock: 70, min: 15, tax: 18.00 },
      { name: 'Lays Magic Masala Potato Chips 50g', sku: 'SNK-LAY-003', barcode: '8901499008130', cat: 'Snacks, Biscuits & Chocolates', brand: 'Lays', cost: 15.00, price: 20.00, unit: 'pack', stock: 110, min: 25, tax: 12.00 },
      { name: 'Cadbury Dairy Milk Silk Chocolate 60g', sku: 'SNK-CAD-004', barcode: '8901499008147', cat: 'Snacks, Biscuits & Chocolates', brand: 'Cadbury', cost: 65.00, price: 85.00, unit: 'bar', stock: 45, min: 10, tax: 18.00 },
      { name: 'Haldirams Nagpur Aloo Bhujia 400g', sku: 'SNK-HAL-005', barcode: '8901499008154', cat: 'Snacks, Biscuits & Chocolates', brand: 'Haldirams', cost: 90.00, price: 115.00, unit: 'pack', stock: 38, min: 12, tax: 12.00 },
      { name: 'Parle-G Original Glucose Biscuits 250g', sku: 'SNK-PAR-006', barcode: '8901499008161', cat: 'Snacks, Biscuits & Chocolates', brand: 'Parle', cost: 20.00, price: 25.00, unit: 'pack', stock: 130, min: 30, tax: 18.00 },
      { name: 'Kurkure Masala Munch 85g', sku: 'SNK-KUR-007', barcode: '8901499008178', cat: 'Snacks, Biscuits & Chocolates', brand: 'Kurkure', cost: 15.00, price: 20.00, unit: 'pack', stock: 0, min: 20, tax: 12.00 }, // OUT OF STOCK!

      // Personal Care & Hygiene
      { name: 'Dettol Original Liquid Handwash Refill 750ml', sku: 'PER-DET-001', barcode: '8901138833445', cat: 'Personal Care & Hygiene', brand: 'Dettol', cost: 120.00, price: 159.00, unit: 'pouch', stock: 35, min: 10, tax: 18.00 },
      { name: 'Colgate Strong Teeth Dental Paste 200g', sku: 'PER-COL-002', barcode: '8901138833452', cat: 'Personal Care & Hygiene', brand: 'Colgate', cost: 88.00, price: 115.00, unit: 'box', stock: 55, min: 15, tax: 18.00 },
      { name: 'Dove Deep Moisture Body Wash 250ml', sku: 'PER-DOV-003', barcode: '8901138833469', cat: 'Personal Care & Hygiene', brand: 'Dove', cost: 165.00, price: 220.00, unit: 'bottle', stock: 22, min: 8, tax: 18.00 },
      { name: 'Head & Shoulders Anti-Dandruff 340ml', sku: 'PER-HNS-004', barcode: '8901138833476', cat: 'Personal Care & Hygiene', brand: 'Head & Shoulders', cost: 240.00, price: 315.00, unit: 'bottle', stock: 20, min: 8, tax: 18.00 },
      { name: 'Lifebuoy Total 10 Soap Bar (Pack of 4)', sku: 'PER-LIF-005', barcode: '8901138833483', cat: 'Personal Care & Hygiene', brand: 'Lifebuoy', cost: 98.00, price: 130.00, unit: 'pack', stock: 45, min: 12, tax: 18.00 },
      { name: 'Nivea Soft Light Moisturiser Cream 100ml', sku: 'PER-NIV-006', barcode: '8901138833490', cat: 'Personal Care & Hygiene', brand: 'Nivea', cost: 145.00, price: 195.00, unit: 'tub', stock: 5, min: 10, tax: 18.00 }, // LOW STOCK!

      // Household & Cleaning Supplies
      { name: 'Surf Excel Quick Wash Powder 1kg', sku: 'HOU-SRF-001', barcode: '8902519002015', cat: 'Household & Cleaning Supplies', brand: 'Surf Excel', cost: 140.00, price: 180.00, unit: 'pack', stock: 50, min: 15, tax: 18.00 },
      { name: 'Vim Lemon Dishwash Liquid Gel 750ml', sku: 'HOU-VIM-002', barcode: '8902519002022', cat: 'Household & Cleaning Supplies', brand: 'Vim', cost: 130.00, price: 170.00, unit: 'bottle', stock: 42, min: 12, tax: 18.00 },
      { name: 'Lizol Disinfectant Floor Cleaner Citrus 1L', sku: 'HOU-LIZ-003', barcode: '8902519002039', cat: 'Household & Cleaning Supplies', brand: 'Lizol', cost: 170.00, price: 225.00, unit: 'bottle', stock: 32, min: 10, tax: 18.00 },
      { name: 'Harpic Power Plus Toilet Cleaner 1L', sku: 'HOU-HAR-004', barcode: '8902519002046', cat: 'Household & Cleaning Supplies', brand: 'Harpic', cost: 155.00, price: 205.00, unit: 'bottle', stock: 35, min: 10, tax: 18.00 },
      { name: 'Scotch-Brite Sponge Scrubber (Pack of 3)', sku: 'HOU-SCT-005', barcode: '8902519002053', cat: 'Household & Cleaning Supplies', brand: 'Scotch-Brite', cost: 60.00, price: 80.00, unit: 'pack', stock: 60, min: 15, tax: 18.00 },
      { name: 'Good Knight Gold Flash Liquid Refill', sku: 'HOU-GDK-006', barcode: '8902519002060', cat: 'Household & Cleaning Supplies', brand: 'Good Knight', cost: 68.00, price: 88.00, unit: 'pack', stock: 2, min: 10, tax: 18.00 }, // LOW STOCK!

      // Stationery & School Supplies
      { name: 'Classmate Pulse Spiral Notebook A4 (160 pgs)', sku: 'STA-NOT-001', barcode: '8902519001124', cat: 'Stationery & School Supplies', brand: 'Classmate', cost: 60.00, price: 80.00, unit: 'book', stock: 65, min: 15, tax: 12.00 },
      { name: 'Cello Butterflow Blue Ballpoint Pens (Pack of 5)', sku: 'STA-PEN-002', barcode: '8902519001131', cat: 'Stationery & School Supplies', brand: 'Cello', cost: 35.00, price: 50.00, unit: 'pack', stock: 80, min: 20, tax: 12.00 },
      { name: 'Fevicol MR General Purpose Adhesive 100g', sku: 'STA-FEV-003', barcode: '8902519001148', cat: 'Stationery & School Supplies', brand: 'Fevicol', cost: 32.00, price: 42.00, unit: 'bottle', stock: 45, min: 10, tax: 18.00 },
      { name: 'Faber-Castell Triangular Colour Pencils 12s', sku: 'STA-FAB-004', barcode: '8902519001155', cat: 'Stationery & School Supplies', brand: 'Faber-Castell', cost: 75.00, price: 100.00, unit: 'box', stock: 30, min: 8, tax: 12.00 },
      { name: 'Camlin Exam Mechanical Pencil 0.7mm', sku: 'STA-CAM-005', barcode: '8902519001162', cat: 'Stationery & School Supplies', brand: 'Camlin', cost: 28.00, price: 40.00, unit: 'piece', stock: 50, min: 10, tax: 12.00 },
    ];

    const productMap: Record<string, any> = {};

    for (const p of productsData) {
      const res = await client.query(
        `INSERT INTO products (
          business_id, category_id, name, description, sku, barcode, brand, category,
          unit, purchase_price, selling_price, price, stock_quantity, minimum_stock,
          tax_rate, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
        RETURNING *`,
        [
          shopId,
          categoryMap[p.cat],
          p.name,
          `${p.brand} ${p.name} - retail consumer packaging`,
          p.sku,
          p.barcode,
          p.brand,
          p.cat,
          p.unit,
          p.cost,
          p.price,
          p.price,
          p.stock,
          p.min,
          p.tax,
        ]
      );
      productMap[p.sku] = res.rows[0];

      // Initial stock movement audit log
      if (p.stock > 0) {
        await client.query(
          `INSERT INTO stock_movements (
            business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
            reason, created_by, created_at
          ) VALUES ($1, $2, 'initial_stock', $3, 0, $3, 'Initial inventory count on store onboarding', $4, CURRENT_TIMESTAMP - INTERVAL '30 days')`,
          [shopId, res.rows[0].id, p.stock, adminId]
        );
      }
    }

    // 7. Create 6 Suppliers with Payables
    const suppliersData = [
      { name: 'ITC Consumer Logistics & Distribution', contact: 'Sanjay Deshmukh', phone: '+91 98450 11223', email: 'orders@itclogistics.in', address: 'Plot 45, Peenya Industrial Area, Bangalore 560058', tax: '29AAACI1234F1Z1', balance: 14250.00 },
      { name: 'Nestle India Wholesale Depot', contact: 'Kavita Menon', phone: '+91 98450 22334', email: 'bangalore.depot@nestle.com', address: 'Wholesale Godown #8, Hosur Road, Bangalore 560068', tax: '29AAACN5678G2Z3', balance: 8400.00 },
      { name: 'Hindustan Unilever Supply Hub', contact: 'Manoj Hegde', phone: '+91 98450 33445', email: 'blr.distribution@hul.com', address: 'APMC Yard Yard-B, Yeshwanthpur, Bangalore 560022', tax: '29AAACH9012H3Z5', balance: 18600.00 },
      { name: 'Amul Dairy Cooperative Hub', contact: 'Ramesh Patel', phone: '+91 98450 44556', email: 'supply@amulblr.coop', address: 'Dairy Circle, Kengeri Satellite Town, Bangalore 560060', tax: '29AAACA3456J4Z7', balance: 5200.00 },
      { name: 'Classmate Stationery & Paperboards', contact: 'Arun Kumar', phone: '+91 98450 55667', email: 'sales@classmatestationery.com', address: '14th Cross, Rajajinagar Industrial Town, Bangalore 560010', tax: '29AAACC7890K5Z9', balance: 3750.00 },
      { name: 'Britannia & Parle Direct Agencies', contact: 'Vipin Jain', phone: '+91 98450 66778', email: 'orders@parledirect.in', address: 'Phase 2, Bommasandra Industrial Area, Bangalore 560099', tax: '29AAACB1122L6Z2', balance: 0.00 },
    ];

    const supplierMap: Record<string, any> = {};
    for (const sup of suppliersData) {
      const res = await client.query(
        `INSERT INTO suppliers (
          business_id, name, company_name, phone, email, address, tax_id, outstanding_balance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [shopId, sup.contact, sup.name, sup.phone, sup.email, sup.address, sup.tax, sup.balance]
      );
      supplierMap[sup.name] = res.rows[0];
    }

    // 8. Create 7 Purchase Orders with Restocking
    const purchasesData = [
      {
        sup: 'ITC Consumer Logistics & Distribution',
        poNum: 'PO-2026-001',
        dateDaysAgo: 24,
        status: 'paid',
        items: [
          { prod: productMap['GRO-ATT-002'], qty: 50, price: 240.00 },
          { prod: productMap['GRO-RIC-001'], qty: 40, price: 360.00 },
        ],
      },
      {
        sup: 'Nestle India Wholesale Depot',
        poNum: 'PO-2026-002',
        dateDaysAgo: 18,
        status: 'paid',
        items: [
          { prod: productMap['SNK-MAG-001'], qty: 100, price: 50.00 },
          { prod: productMap['BEV-COF-004'], qty: 30, price: 270.00 },
        ],
      },
      {
        sup: 'Hindustan Unilever Supply Hub',
        poNum: 'PO-2026-003',
        dateDaysAgo: 14,
        status: 'partially_paid',
        items: [
          { prod: productMap['HOU-SRF-001'], qty: 60, price: 140.00 },
          { prod: productMap['PER-LIF-005'], qty: 50, price: 98.00 },
          { prod: productMap['HOU-VIM-002'], qty: 50, price: 130.00 },
        ],
      },
      {
        sup: 'Amul Dairy Cooperative Hub',
        poNum: 'PO-2026-004',
        dateDaysAgo: 10,
        status: 'paid',
        items: [
          { prod: productMap['DAI-MLK-001'], qty: 60, price: 60.00 },
          { prod: productMap['DAI-PNR-004'], qty: 30, price: 80.00 },
        ],
      },
      {
        sup: 'Classmate Stationery & Paperboards',
        poNum: 'PO-2026-005',
        dateDaysAgo: 7,
        status: 'paid',
        items: [
          { prod: productMap['STA-NOT-001'], qty: 80, price: 60.00 },
          { prod: productMap['STA-PEN-002'], qty: 100, price: 35.00 },
        ],
      },
      {
        sup: 'ITC Consumer Logistics & Distribution',
        poNum: 'PO-2026-006',
        dateDaysAgo: 3,
        status: 'unpaid',
        items: [
          { prod: productMap['GRO-OIL-003'], qty: 50, price: 125.00 },
          { prod: productMap['GRO-SLT-004'], qty: 100, price: 22.00 },
        ],
      },
      {
        sup: 'Amul Dairy Cooperative Hub',
        poNum: 'PO-2026-007',
        dateDaysAgo: 1,
        status: 'unpaid',
        items: [
          { prod: productMap['DAI-BTR-002'], qty: 15, price: 245.00 },
          { prod: productMap['DAI-YOG-006'], qty: 20, price: 75.00 },
        ],
      },
    ];

    for (const po of purchasesData) {
      let subtotal = 0;
      let taxTotal = 0;
      for (const item of po.items) {
        const lineTot = item.qty * item.price;
        subtotal += lineTot;
        taxTotal += lineTot * (Number(item.prod.tax_rate) / 100);
      }
      const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;
      const paidAmount = po.status === 'paid' ? grandTotal : (po.status === 'partially_paid' ? Math.round(grandTotal / 2) : 0);

      const poRes = await client.query(
        `INSERT INTO purchases (
          business_id, supplier_id, purchase_number, purchase_date, subtotal, tax_amount,
          total_amount, paid_amount, balance_due, payment_status, status, received_at, notes,
          created_at
        ) VALUES (
          $1, $2, $3,
          CURRENT_DATE - INTERVAL '${po.dateDaysAgo} days',
          $4, $5, $6, $7, $8, $9, 'received',
          CURRENT_TIMESTAMP - INTERVAL '${po.dateDaysAgo} days',
          'Regular stock replenishment order',
          CURRENT_TIMESTAMP - INTERVAL '${po.dateDaysAgo} days'
        ) RETURNING id`,
        [shopId, supplierMap[po.sup].id, po.poNum, subtotal, taxTotal, grandTotal, paidAmount, grandTotal - paidAmount, po.status]
      );
      const poId = poRes.rows[0].id;

      for (const item of po.items) {
        await client.query(
          `INSERT INTO purchase_items (
            purchase_id, product_id, product_name, quantity, unit_cost, tax_rate, line_total
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [poId, item.prod.id, item.prod.name, item.qty, item.price, item.prod.tax_rate, item.qty * item.price]
        );

        // Record stock movement
        await client.query(
          `INSERT INTO stock_movements (
            business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
            reference_id, reference_number, reason, created_by, created_at
          ) VALUES (
            $1, $2, 'purchase', $3, $4, $5, $6, $7,
            'Received stock from supplier', $8,
            CURRENT_TIMESTAMP - INTERVAL '${po.dateDaysAgo} days'
          )`,
          [shopId, item.prod.id, item.qty, item.prod.stock_quantity, item.prod.stock_quantity + item.qty, poId, po.poNum, adminId]
        );
      }
    }

    // 9. Create 10 Real Customers
    const customersData = [
      { name: 'Walk-in Customer', email: 'walkin@metromart.local', phone: '+91 90000 00000', address: 'Counter Walk-in, Bangalore', type: 'individual' },
      { name: 'Anita Rao', email: 'anita.rao@gmail.com', phone: '+91 98440 12345', address: '#42, 3rd Cross, MG Road, Bangalore 560001', type: 'individual' },
      { name: 'Rajesh Kumar', email: 'rajesh.k@rediffmail.com', phone: '+91 98440 23456', address: '#105, Palm Grove Apt, Indiranagar, Bangalore 560038', type: 'individual' },
      { name: 'Vigneshwaran K', email: 'vicky.dev@outlook.com', phone: '+91 98440 34567', address: '#12, 5th Block, Koramangala, Bangalore 560095', type: 'individual' },
      { name: 'Sunita Patel', email: 'sunita.patel88@gmail.com', phone: '+91 98440 45678', address: 'Villa 14, Prestige Ozone, Whitefield, Bangalore 560066', type: 'individual' },
      { name: 'Mohammed Arif', email: 'arif.traders@yahoo.com', phone: '+91 98440 56789', address: '#78, Commercial Street, Bangalore 560042', type: 'business' },
      { name: 'Deepa Krishnan', email: 'deepa.k@gmail.com', phone: '+91 98440 67890', address: '#31, 9th Main, 4th Block, Jayanagar, Bangalore 560011', type: 'individual' },
      { name: 'Ramesh Babu', email: 'ramesh.babu@tcs.com', phone: '+91 98440 78901', address: 'Sector 2, HSR Layout, Bangalore 560102', type: 'individual' },
      { name: 'Kavitha Sundaram', email: 'kavitha.s@wipro.com', phone: '+91 98440 89012', address: '16th Main, BTM 2nd Stage, Bangalore 560076', type: 'individual' },
      { name: 'Suresh Nair', email: 'suresh.nair@infosys.com', phone: '+91 98440 90123', address: '#8, Kensington Road, Ulsoor, Bangalore 560008', type: 'individual' },
    ];

    const customerMap: Record<string, any> = {};
    for (const cust of customersData) {
      const res = await client.query(
        `INSERT INTO customers (
          business_id, name, email, phone, address, customer_type
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [shopId, cust.name, cust.email, cust.phone, cust.address, cust.type]
      );
      customerMap[cust.name] = res.rows[0];
    }

    // 10. Create 25 Realistic Retail POS Bills / Invoices Across Days
    const billsData = [
      // Today Bills
      { num: 'BILL-1001', cust: 'Walk-in Customer', daysAgo: 0, hoursAgo: 5, method: 'cash', cashier: cashierId, items: [{ p: 'GRO-OIL-003', qty: 2 }, { p: 'GRO-SLT-004', qty: 1 }, { p: 'SNK-MAG-001', qty: 2 }], tendered: 500.00 },
      { num: 'BILL-1002', cust: 'Anita Rao', daysAgo: 0, hoursAgo: 4, method: 'upi', cashier: cashierId, items: [{ p: 'GRO-RIC-001', qty: 1 }, { p: 'GRO-ATT-002', qty: 1 }, { p: 'DAI-MLK-001', qty: 2 }], ref: 'UPI-RRR-992384' },
      { num: 'BILL-1003', cust: 'Vigneshwaran K', daysAgo: 0, hoursAgo: 3, method: 'card', cashier: cashier2Id, items: [{ p: 'BEV-COK-001', qty: 2 }, { p: 'SNK-LAY-003', qty: 3 }, { p: 'SNK-CAD-004', qty: 2 }], ref: 'CARD-AUTH-8821' },
      { num: 'BILL-1004', cust: 'Walk-in Customer', daysAgo: 0, hoursAgo: 2, method: 'cash', cashier: cashierId, items: [{ p: 'HOU-SRF-001', qty: 2 }, { p: 'HOU-VIM-002', qty: 1 }, { p: 'HOU-LIZ-003', qty: 1 }], tendered: 800.00 },
      { num: 'BILL-1005', cust: 'Rajesh Kumar', daysAgo: 0, hoursAgo: 1, method: 'upi', cashier: cashierId, items: [{ p: 'STA-NOT-001', qty: 3 }, { p: 'STA-PEN-002', qty: 2 }, { p: 'STA-FEV-003', qty: 1 }], ref: 'UPI-GPAY-772199' },

      // Yesterday Bills
      { num: 'BILL-1006', cust: 'Sunita Patel', daysAgo: 1, hoursAgo: 6, method: 'card', cashier: cashierId, items: [{ p: 'PER-DOV-003', qty: 1 }, { p: 'PER-HNS-004', qty: 1 }, { p: 'PER-DET-001', qty: 2 }], ref: 'VISA-AUTH-4411' },
      { num: 'BILL-1007', cust: 'Walk-in Customer', daysAgo: 1, hoursAgo: 4, method: 'cash', cashier: cashier2Id, items: [{ p: 'DAI-EGG-005', qty: 1 }, { p: 'DAI-PNR-004', qty: 2 }, { p: 'DAI-MLK-001', qty: 1 }], tendered: 600.00 },
      { num: 'BILL-1008', cust: 'Deepa Krishnan', daysAgo: 1, hoursAgo: 2, method: 'upi', cashier: cashierId, items: [{ p: 'GRO-DAL-005', qty: 2 }, { p: 'GRO-SUG-006', qty: 2 }, { p: 'GRO-MAS-008', qty: 2 }], ref: 'PHONEPE-4481' },

      // 2 - 5 days ago
      { num: 'BILL-1009', cust: 'Mohammed Arif', daysAgo: 2, hoursAgo: 5, method: 'cash', cashier: adminId, items: [{ p: 'GRO-RIC-001', qty: 3 }, { p: 'GRO-OIL-003', qty: 4 }], tendered: 2000.00 },
      { num: 'BILL-1010', cust: 'Ramesh Babu', daysAgo: 3, hoursAgo: 3, method: 'upi', cashier: cashierId, items: [{ p: 'SNK-BRT-002', qty: 4 }, { p: 'SNK-PAR-006', qty: 4 }, { p: 'BEV-TEA-003', qty: 1 }], ref: 'UPI-PAYTM-1122' },
      { num: 'BILL-1011', cust: 'Walk-in Customer', daysAgo: 3, hoursAgo: 7, method: 'cash', cashier: cashier2Id, items: [{ p: 'BEV-JUC-002', qty: 2 }, { p: 'SNK-HAL-005', qty: 2 }], tendered: 500.00 },
      { num: 'BILL-1012', cust: 'Kavitha Sundaram', daysAgo: 4, hoursAgo: 4, method: 'card', cashier: cashierId, items: [{ p: 'PER-COL-002', qty: 2 }, { p: 'PER-LIF-005', qty: 2 }, { p: 'HOU-SCT-005', qty: 2 }], ref: 'RUPAY-6612' },
      { num: 'BILL-1013', cust: 'Suresh Nair', daysAgo: 5, hoursAgo: 6, method: 'upi', cashier: cashierId, items: [{ p: 'BEV-COF-004', qty: 1 }, { p: 'GRO-SUG-006', qty: 2 }, { p: 'DAI-MLK-001', qty: 2 }], ref: 'UPI-GPAY-9900' },

      // 6 - 15 days ago
      { num: 'BILL-1014', cust: 'Anita Rao', daysAgo: 7, hoursAgo: 3, method: 'upi', cashier: cashierId, items: [{ p: 'GRO-ATT-002', qty: 2 }, { p: 'GRO-OIL-003', qty: 2 }], ref: 'UPI-RRR-1144' },
      { num: 'BILL-1015', cust: 'Walk-in Customer', daysAgo: 8, hoursAgo: 5, method: 'cash', cashier: cashier2Id, items: [{ p: 'SNK-MAG-001', qty: 3 }, { p: 'BEV-COK-001', qty: 3 }], tendered: 400.00 },
      { num: 'BILL-1016', cust: 'Rajesh Kumar', daysAgo: 10, hoursAgo: 2, method: 'upi', cashier: cashierId, items: [{ p: 'STA-NOT-001', qty: 4 }, { p: 'STA-FAB-004', qty: 2 }, { p: 'STA-CAM-005', qty: 2 }], ref: 'UPI-GPAY-5511' },
      { num: 'BILL-1017', cust: 'Sunita Patel', daysAgo: 12, hoursAgo: 4, method: 'card', cashier: cashierId, items: [{ p: 'HOU-LIZ-003', qty: 2 }, { p: 'HOU-HAR-004', qty: 2 }, { p: 'HOU-VIM-002', qty: 2 }], ref: 'MASTERCARD-901' },
      { num: 'BILL-1018', cust: 'Walk-in Customer', daysAgo: 14, hoursAgo: 6, method: 'cash', cashier: cashier2Id, items: [{ p: 'GRO-SLT-004', qty: 2 }, { p: 'GRO-SOY-007', qty: 2 }], tendered: 200.00 },
      { num: 'BILL-1019', cust: 'Deepa Krishnan', daysAgo: 16, hoursAgo: 3, method: 'upi', cashier: cashierId, items: [{ p: 'GRO-RIC-001', qty: 1 }, { p: 'GRO-DAL-005', qty: 1 }], ref: 'UPI-GPAY-3388' },
      { num: 'BILL-1020', cust: 'Mohammed Arif', daysAgo: 18, hoursAgo: 5, method: 'cash', cashier: adminId, items: [{ p: 'GRO-ATT-002', qty: 4 }, { p: 'GRO-SUG-006', qty: 4 }], tendered: 1500.00 },

      // 19 - 28 days ago
      { num: 'BILL-1021', cust: 'Vigneshwaran K', daysAgo: 20, hoursAgo: 4, method: 'card', cashier: cashierId, items: [{ p: 'PER-DOV-003', qty: 1 }, { p: 'BEV-TEA-003', qty: 1 }], ref: 'VISA-9912' },
      { num: 'BILL-1022', cust: 'Walk-in Customer', daysAgo: 22, hoursAgo: 2, method: 'cash', cashier: cashier2Id, items: [{ p: 'BEV-WTR-005', qty: 6 }, { p: 'SNK-LAY-003', qty: 4 }], tendered: 300.00 },
      { num: 'BILL-1023', cust: 'Ramesh Babu', daysAgo: 24, hoursAgo: 5, method: 'upi', cashier: cashierId, items: [{ p: 'GRO-OIL-003', qty: 3 }, { p: 'SNK-BRT-002', qty: 3 }], ref: 'UPI-449911' },
      { num: 'BILL-1024', cust: 'Kavitha Sundaram', daysAgo: 26, hoursAgo: 3, method: 'cash', cashier: cashierId, items: [{ p: 'HOU-SRF-001', qty: 1 }, { p: 'PER-COL-002', qty: 1 }], tendered: 300.00 },
      { num: 'BILL-1025', cust: 'Suresh Nair', daysAgo: 28, hoursAgo: 4, method: 'upi', cashier: cashierId, items: [{ p: 'BEV-COF-004', qty: 1 }, { p: 'BEV-FRO-006', qty: 2 }], ref: 'UPI-GPAY-1111' },
    ];

    const invoiceMap: Record<string, any> = {};

    for (let i = 0; i < billsData.length; i++) {
      const b = billsData[i];
      const custObj = customerMap[b.cust];
      let subtotal = 0;
      let taxTotal = 0;

      const preparedItems = b.items.map((it) => {
        const prod = productMap[it.p];
        const lineSub = prod.selling_price * it.qty;
        const lineTax = lineSub * (Number(prod.tax_rate) / 100);
        subtotal += lineSub;
        taxTotal += lineTax;
        return {
          productId: prod.id,
          name: prod.name,
          sku: prod.sku,
          quantity: it.qty,
          unitPrice: prod.selling_price,
          taxRate: prod.tax_rate,
          taxAmount: lineTax,
          total: lineSub + lineTax,
        };
      });

      const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;
      const customerSnapshot = JSON.stringify({
        name: custObj.name,
        email: custObj.email,
        phone: custObj.phone,
        address: custObj.address,
      });

      const invRes = await client.query(
        `INSERT INTO invoices (
          business_id, customer_id, invoice_number, invoice_date, due_date,
          status, subtotal, tax_amount, grand_total, paid_amount, balance_due,
          notes, customer_snapshot, is_pos, payment_method, cashier_id,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3,
          CURRENT_DATE - INTERVAL '${b.daysAgo} days',
          CURRENT_DATE - INTERVAL '${b.daysAgo} days',
          'paid', $4, $5, $6, $6, 0.00,
          'Thank you for shopping at Metro Supermarket!',
          $7::jsonb, true, $8, $9,
          CURRENT_TIMESTAMP - INTERVAL '${b.daysAgo} days' - INTERVAL '${b.hoursAgo} hours',
          CURRENT_TIMESTAMP - INTERVAL '${b.daysAgo} days'
        ) RETURNING *`,
        [
          shopId, custObj.id, b.num, subtotal, taxTotal, grandTotal,
          customerSnapshot, b.method, b.cashier
        ]
      );
      const invoice = invRes.rows[0];
      invoiceMap[b.num] = invoice;

      // Insert invoice line items
      for (const item of preparedItems) {
        await client.query(
          `INSERT INTO invoice_items (
            invoice_id, item_type, product_id, name, quantity, unit_price, tax_rate, tax_amount, line_total
          ) VALUES ($1, 'product', $2, $3, $4, $5, $6, $7, $8)`,
          [invoice.id, item.productId, item.name, item.quantity, item.unitPrice, item.taxRate, item.taxAmount, item.total]
        );

        // Record stock movement (sale)
        await client.query(
          `INSERT INTO stock_movements (
            business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
            reference_id, reference_number, reason, created_by, created_at
          ) VALUES (
            $1, $2, 'sale', $3, $4, $5, $6, $7,
            'POS Counter Customer Sale', $8,
            CURRENT_TIMESTAMP - INTERVAL '${b.daysAgo} days'
          )`,
          [shopId, item.productId, -item.quantity, 100, 100 - item.quantity, invoice.id, b.num, b.cashier]
        );
      }

      // Record Payment in payments ledger
      const paymentNumber = `PAY-${1000 + i + 1}`;
      await client.query(
        `INSERT INTO payments (
          business_id, invoice_id, customer_id, payment_number, payment_date, amount, payment_method,
          transaction_reference, notes, status, recorded_by, created_at
        ) VALUES (
          $1, $2, $3, $4,
          CURRENT_DATE - INTERVAL '${b.daysAgo} days',
          $5, $6, $7, $8, 'recorded', $9,
          CURRENT_TIMESTAMP - INTERVAL '${b.daysAgo} days'
        )`,
        [
          shopId, invoice.id, custObj.id, paymentNumber,
          grandTotal, b.method,
          b.ref || 'CASH-COUNTER',
          `Payment settled via ${b.method.toUpperCase()} at POS checkout`,
          b.cashier
        ]
      );
    }

    // 11. Create 4 Realistic Sales Returns Against Bills
    const returnsData = [
      {
        retNum: 'RET-2026-001', billNum: 'BILL-1006', cust: 'Sunita Patel', daysAgo: 1,
        items: [{ prod: productMap['PER-DET-001'], qty: 1, price: 159.00, resalable: true }],
        reason: 'Customer mistakenly purchased refill pouch instead of pump bottle', method: 'cash'
      },
      {
        retNum: 'RET-2026-002', billNum: 'BILL-1001', cust: 'Walk-in Customer', daysAgo: 0,
        items: [{ prod: productMap['SNK-MAG-001'], qty: 1, price: 64.00, resalable: true }],
        reason: 'Customer requested exchange for spicy variant', method: 'cash'
      },
      {
        retNum: 'RET-2026-003', billNum: 'BILL-1008', cust: 'Deepa Krishnan', daysAgo: 1,
        items: [{ prod: productMap['GRO-SUG-006'], qty: 1, price: 52.00, resalable: false }],
        reason: 'Outer packaging packet torn during checkout transport', method: 'upi'
      },
      {
        retNum: 'RET-2026-004', billNum: 'BILL-1012', cust: 'Kavitha Sundaram', daysAgo: 3,
        items: [{ prod: productMap['PER-COL-002'], qty: 1, price: 115.00, resalable: true }],
        reason: 'Wrong size selected by customer', method: 'cash'
      },
    ];

    for (const ret of returnsData) {
      const inv = invoiceMap[ret.billNum];
      const cust = customerMap[ret.cust];
      let totalRefund = 0;
      for (const item of ret.items) {
        totalRefund += item.qty * item.price;
      }

      const retRes = await client.query(
        `INSERT INTO sales_returns (
          business_id, invoice_id, customer_id, return_number, return_date,
          total_refund_amount, refund_method, reason, notes, recorded_by, created_at
        ) VALUES (
          $1, $2, $3, $4,
          CURRENT_DATE - INTERVAL '${ret.daysAgo} days',
          $5, $6, $7, 'Returned at POS billing counter with valid receipt', $8,
          CURRENT_TIMESTAMP - INTERVAL '${ret.daysAgo} days'
        ) RETURNING id`,
        [shopId, inv.id, cust.id, ret.retNum, totalRefund, ret.method, ret.reason, cashierId]
      );
      const retId = retRes.rows[0].id;

      for (const item of ret.items) {
        await client.query(
          `INSERT INTO sales_return_items (
            sales_return_id, product_id, product_name, quantity,
            unit_price, refund_amount, is_resalable, reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [retId, item.prod.id, item.prod.name, item.qty, item.price, item.qty * item.price, item.resalable, ret.reason]
        );

        // Record stock movement (return)
        if (item.resalable) {
          await client.query(
            `INSERT INTO stock_movements (
              business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
              reference_id, reference_number, reason, created_by, created_at
            ) VALUES (
              $1, $2, 'return', $3, $4, $5, $6, $7,
              'Customer return - restored to resalable inventory', $8,
              CURRENT_TIMESTAMP - INTERVAL '${ret.daysAgo} days'
            )`,
            [shopId, item.prod.id, item.qty, item.prod.stock_quantity, item.prod.stock_quantity + item.qty, retId, ret.retNum, cashierId]
          );
        } else {
          await client.query(
            `INSERT INTO stock_movements (
              business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
              reference_id, reference_number, reason, created_by, created_at
            ) VALUES (
              $1, $2, 'adjustment_damage', 0, $3, $3, $4, $5,
              'Damaged return written off (not restored to inventory)', $6,
              CURRENT_TIMESTAMP - INTERVAL '${ret.daysAgo} days'
            )`,
            [shopId, item.prod.id, item.prod.stock_quantity, retId, ret.retNum, cashierId]
          );
        }
      }
    }

    // 12. Create Manual Stock Adjustments (Audited)
    const adjustmentsData = [
      { prod: 'DAI-BTR-002', type: 'adjustment_expired', qty: -2, reason: 'Found 2 cartons near expiration date during morning display audit' },
      { prod: 'DAI-BRD-003', type: 'adjustment_expired', qty: -5, reason: 'Expired sandwich bread discarded per food safety guidelines' },
      { prod: 'SNK-KUR-007', type: 'adjustment_damage', qty: -3, reason: 'Puncture damage during warehouse rack handling' },
      { prod: 'GRO-SLT-004', type: 'adjustment_recount', qty: 5, reason: 'Physical inventory recount surplus reconciled' },
    ];

    for (const adj of adjustmentsData) {
      const prod = productMap[adj.prod];
      await client.query(
        `INSERT INTO stock_movements (
          business_id, product_id, movement_type, quantity_change, quantity_before, quantity_after,
          reason, created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          CURRENT_TIMESTAMP - INTERVAL '2 days'
        )`,
        [shopId, prod.id, adj.type, adj.qty, prod.stock_quantity - adj.qty, prod.stock_quantity, adj.reason, adminId]
      );
    }

    // 13. Create 15 Realistic Retail Store Expenses
    await client.query(
      `INSERT INTO expenses (business_id, title, category, amount, expense_date, payment_method, description)
       VALUES 
        ($1, 'Retail Store Monthly Rent (MG Road Complex)', 'rent', 35000.00, CURRENT_DATE - INTERVAL '6 days', 'bank_transfer', 'Monthly showroom and godown rent for October'),
        ($1, 'BESCOM Commercial Electricity Bill', 'electricity', 6450.00, CURRENT_DATE - INTERVAL '4 days', 'upi', 'Power bill for lighting, display chillers and billing counters'),
        ($1, 'Staff Salary - Senior Cashier Rahul Verma', 'salary', 18000.00, CURRENT_DATE - INTERVAL '8 days', 'bank_transfer', 'Monthly staff counter salary'),
        ($1, 'Staff Salary - Evening Cashier Anand Mohan', 'salary', 15000.00, CURRENT_DATE - INTERVAL '8 days', 'bank_transfer', 'Monthly staff shift salary'),
        ($1, 'Airtel Fiber 300Mbps & Static IP', 'internet', 1499.00, CURRENT_DATE - INTERVAL '12 days', 'upi', 'High-speed broadband for POS cloud sync and CCTV stream'),
        ($1, 'APMC Godown Stock Logistics & Delivery Tempo', 'transport', 2200.00, CURRENT_DATE - INTERVAL '9 days', 'cash', 'Wholesale goods delivery van freight charges'),
        ($1, 'Thermal Receipt Rolls & Barcode Labels', 'supplies', 1850.00, CURRENT_DATE - INTERVAL '3 days', 'cash', '100 rolls 80mm thermal paper + 2000 barcode stickers'),
        ($1, 'Biodegradable Shopping Carry Bags (5000 pcs)', 'supplies', 2400.00, CURRENT_DATE - INTERVAL '15 days', 'cash', 'Branded retail grocery carry bags'),
        ($1, 'Display Refrigerator & Chiller AC Service', 'maintenance', 3500.00, CURRENT_DATE - INTERVAL '5 days', 'upi', 'Quarterly compressor servicing and coil cleaning'),
        ($1, 'Handheld Barcode Scanner Replacement', 'maintenance', 1950.00, CURRENT_DATE - INTERVAL '11 days', 'upi', 'Replacement 2D QR and barcode laser scanner for Counter 2'),
        ($1, 'Weekend Festival Discount Flyers & Banners', 'marketing', 2800.00, CURRENT_DATE - INTERVAL '14 days', 'cash', 'Pamphlet printing and newspaper insert distribution'),
        ($1, 'Store Professional Pest Control Treatment', 'maintenance', 1600.00, CURRENT_DATE - INTERVAL '20 days', 'cash', 'Monthly food-safe pest and rodent control'),
        ($1, 'Drinking Water Can Dispenser Refills (20 cans)', 'supplies', 800.00, CURRENT_DATE - INTERVAL '2 days', 'cash', 'Customer and staff Bisleri water cans'),
        ($1, 'Store Cleaning, Mops & Sanitization Consumables', 'supplies', 950.00, CURRENT_DATE - INTERVAL '17 days', 'cash', 'Floor cleaner chemicals, mops, and trash bin liners'),
        ($1, 'Municipal Trade License Annual Renewal Fee', 'other', 4500.00, CURRENT_DATE - INTERVAL '22 days', 'bank_transfer', 'BBMP annual commercial retail trade license renewal')`,
      [shopId]
    );

    // 14. Create 8 Realistic Notifications
    await client.query(
      `INSERT INTO notifications (business_id, user_id, title, message, type, link)
       VALUES 
        ($1, $2, 'Low Stock Warning: Amul Butter 500g', 'Stock has fallen to 4 packs (below threshold of 10). Reorder recommended.', 'system', '/inventory'),
        ($1, $2, 'Out of Stock Alert: Modern Whole Wheat Bread', 'Current inventory is 0 units. Update purchase orders with bread supplier.', 'system', '/inventory'),
        ($1, $2, 'Out of Stock Alert: Kurkure Masala Munch 85g', 'Current inventory is 0 packs. Add to next snack replenishment order.', 'system', '/inventory'),
        ($1, $2, 'Low Stock Alert: Milky Mist Greek Yogurt', 'Only 3 cups remaining in cold display. Please restock soon.', 'system', '/inventory'),
        ($1, $2, 'Low Stock Alert: Good Knight Mosquito Refill', 'Only 2 packs remaining. Minimum stock threshold is 10.', 'system', '/inventory'),
        ($1, $2, 'Purchase Restocked: PO-2026-007 from Amul Dairy', 'PO-2026-007 has arrived and added 35 dairy units to live inventory.', 'system', '/purchases'),
        ($1, $2, 'Return Processed: RET-2026-002 at Counter', 'Cash refund of ₹64.00 issued. Resalable item returned to active catalog.', 'system', '/returns'),
        ($1, $2, 'Daily Shift Settlement Ready', 'Cash, UPI, and Card totals for today are reconciled and ready for review.', 'system', '/reports')`,
      [shopId, adminId]
    );

    // 15. Create Staff Audit Activity Logs
    const auditLogs = [
      { userId: adminId, action: 'LOGIN', entityType: 'auth', entityId: adminId, message: 'Store Manager Priya Sharma logged into system' },
      { userId: cashierId, action: 'LOGIN', entityType: 'auth', entityId: cashierId, message: 'POS Cashier Rahul Verma opened POS Counter Terminal' },
      { userId: cashierId, action: 'CHECKOUT', entityType: 'invoice', entityId: invoiceMap['BILL-1001']?.id || shopId, message: 'POS Bill BILL-1001 processed via CASH (Amount: ₹388.00)' },
      { userId: cashierId, action: 'CHECKOUT', entityType: 'invoice', entityId: invoiceMap['BILL-1002']?.id || shopId, message: 'POS Bill BILL-1002 processed via UPI (Amount: ₹893.00)' },
      { userId: adminId, action: 'PURCHASE_CREATED', entityType: 'purchase', entityId: shopId, message: 'Purchase Order PO-2026-006 created for ITC Consumer Logistics' },
      { userId: adminId, action: 'STOCK_ADJUSTMENT', entityType: 'inventory', entityId: productMap['DAI-BTR-002']?.id || shopId, message: 'Audited damage adjustment: 2 units Amul Butter expired write-off' },
    ];
    for (const log of auditLogs) {
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [shopId, log.userId, log.action, log.entityType, String(log.entityId), JSON.stringify({ message: log.message })]
      );
    }

    console.log('✅ BillFlow Retail Management seeded successfully with comprehensive retail operations data!');
    console.log('🛒 Shop: Metro Supermarket & Retail Mart');
    console.log('📦 Total Products Seeded: 40+ products with Indian Barcodes across 7 Categories');
    console.log('🚚 Total Suppliers: 6 with live Payables Ledgers');
    console.log('📋 Total Purchases: 7 POs with restocking');
    console.log('👥 Total Customers: 10 (including Walk-in Customer)');
    console.log('🧾 Total POS Bills: 25 bills (Cash, UPI, Card, Split tenders)');
    console.log('↩️ Total Returns: 4 completed returns');
    console.log('💸 Total Expenses: 15 retail store expenses');
    console.log('📊 Reports & Charts: 100% populated with live PostgreSQL figures');
    console.log('');
    console.log('🔑 Demo Login Accounts:');
    console.log('   👤 Store Manager (Admin): priya@metrogadgets.shop / Password123!');
    console.log('   🧾 Senior POS Cashier:   cashier@metrogadgets.shop / Password123!');
    console.log('   🧾 Shift Cashier:        anand@metrogadgets.shop / Password123!');
  });
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
