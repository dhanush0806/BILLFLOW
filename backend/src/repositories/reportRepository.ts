import { query } from '../config/database';

export class ReportRepository {
  static async getDashboardMetrics(businessId: string, dateRange = '30d') {
    let dateFilter = "AND i.invoice_date >= CURRENT_DATE - INTERVAL '30 days'";
    let expenseDateFilter = "AND expense_date >= CURRENT_DATE - INTERVAL '30 days'";

    if (dateRange === 'today') {
      dateFilter = 'AND i.invoice_date = CURRENT_DATE';
      expenseDateFilter = 'AND expense_date = CURRENT_DATE';
    } else if (dateRange === '7d') {
      dateFilter = "AND i.invoice_date >= CURRENT_DATE - INTERVAL '7 days'";
      expenseDateFilter = "AND expense_date >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (dateRange === '3m') {
      dateFilter = "AND i.invoice_date >= CURRENT_DATE - INTERVAL '3 months'";
      expenseDateFilter = "AND expense_date >= CURRENT_DATE - INTERVAL '3 months'";
    } else if (dateRange === '1y') {
      dateFilter = "AND i.invoice_date >= DATE_TRUNC('year', CURRENT_DATE)";
      expenseDateFilter = "AND expense_date >= DATE_TRUNC('year', CURRENT_DATE)";
    } else if (dateRange === 'all') {
      dateFilter = '';
      expenseDateFilter = '';
    }

    // Today's specific metrics for quick retail overview
    const todayRes = await query(
      `SELECT 
         COUNT(*) AS today_bills,
         COALESCE(SUM(grand_total), 0) AS today_sales,
         COALESCE(SUM(paid_amount), 0) AS today_collected
       FROM invoices
       WHERE business_id = $1 AND invoice_date = CURRENT_DATE AND status != 'cancelled'`,
      [businessId]
    );

    const todayExpRes = await query(
      `SELECT COALESCE(SUM(amount), 0) AS today_expenses
       FROM expenses
       WHERE business_id = $1 AND expense_date = CURRENT_DATE`,
      [businessId]
    );

    // Current Month's sales
    const monthRes = await query(
      `SELECT 
         COUNT(*) AS monthly_bills,
         COALESCE(SUM(grand_total), 0) AS monthly_sales
       FROM invoices
       WHERE business_id = $1 
         AND invoice_date >= DATE_TRUNC('month', CURRENT_DATE) 
         AND status != 'cancelled'`,
      [businessId]
    );

    // Overall Invoice Metrics
    const invStatsRes = await query(
      `SELECT 
         COUNT(*) AS total_invoices,
         COALESCE(SUM(grand_total), 0) AS total_invoiced,
         COALESCE(SUM(paid_amount), 0) AS total_collected,
         COALESCE(SUM(balance_due), 0) AS pending_payments,
         COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
         COUNT(*) FILTER (WHERE status = 'partially_paid') AS partially_paid_count,
         COUNT(*) FILTER (WHERE status = 'overdue' OR (status IN ('issued', 'partially_paid') AND due_date < CURRENT_DATE)) AS overdue_count
       FROM invoices i
       WHERE i.business_id = $1 AND i.status != 'cancelled' ${dateFilter}`,
      [businessId]
    );

    // Expense Metrics
    const expStatsRes = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_expenses, COUNT(*) AS expense_count
       FROM expenses
       WHERE business_id = $1 ${expenseDateFilter}`,
      [businessId]
    );

    // Inventory & Products quick counts
    const prodStatsRes = await query(
      `SELECT 
         COUNT(*) AS total_products,
         COUNT(*) FILTER (WHERE stock_quantity <= 0) AS out_of_stock,
         COUNT(*) FILTER (WHERE stock_quantity > 0 AND stock_quantity <= minimum_stock) AS low_stock,
         COALESCE(SUM(stock_quantity * COALESCE(purchase_price, 0)), 0) AS total_inventory_cost
       FROM products
       WHERE business_id = $1 AND is_archived = FALSE`,
      [businessId]
    );

    // Payment Methods Breakdown (Cash, UPI, Card, etc.)
    const paymentMethodsRes = await query(
      `SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
       FROM payments
       WHERE business_id = $1 AND status = 'recorded'
       GROUP BY payment_method`,
      [businessId]
    );

    // Monthly Revenue vs Expenses Trend (last 6 months)
    const monthlyTrendRes = await query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
           date_trunc('month', CURRENT_DATE),
           '1 month'::interval
         )::date AS m_date
       ),
       rev AS (
         SELECT date_trunc('month', invoice_date)::date AS m_date, COALESCE(SUM(grand_total), 0) AS revenue
         FROM invoices
         WHERE business_id = $1 AND status != 'cancelled'
         GROUP BY 1
       ),
       exp AS (
         SELECT date_trunc('month', expense_date)::date AS m_date, COALESCE(SUM(amount), 0) AS expenses
         FROM expenses
         WHERE business_id = $1
         GROUP BY 1
       )
       SELECT 
         to_char(months.m_date, 'Mon YYYY') AS month_label,
         to_char(months.m_date, 'YYYY-MM') AS month_key,
         COALESCE(rev.revenue, 0) AS revenue,
         COALESCE(exp.expenses, 0) AS expenses,
         (COALESCE(rev.revenue, 0) - COALESCE(exp.expenses, 0)) AS net_profit
       FROM months
       LEFT JOIN rev ON rev.m_date = months.m_date
       LEFT JOIN exp ON exp.m_date = months.m_date
       ORDER BY months.m_date ASC`,
      [businessId]
    );

    // Recent 5 Bills
    const recentInvoicesRes = await query(
      `SELECT i.id, i.invoice_number, i.invoice_date, i.status, i.grand_total, i.balance_due,
              i.payment_method, COALESCE(c.name, 'Walk-in Customer') AS customer_name
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.business_id = $1
       ORDER BY i.invoice_date DESC, i.created_at DESC
       LIMIT 5`,
      [businessId]
    );

    // Recent 5 Purchases
    const recentPurchasesRes = await query(
      `SELECT p.id, p.purchase_number, p.purchase_date, p.total_amount, p.payment_status,
              s.name AS supplier_name, s.company_name AS supplier_company
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.business_id = $1
       ORDER BY p.purchase_date DESC, p.created_at DESC
       LIMIT 5`,
      [businessId]
    );

    // Recent 5 Returns
    const recentReturnsRes = await query(
      `SELECT sr.id, sr.return_number, sr.return_date, sr.total_refund_amount,
              sr.refund_method, sr.reason, i.invoice_number
       FROM sales_returns sr
       JOIN invoices i ON i.id = sr.invoice_id
       WHERE sr.business_id = $1
       ORDER BY sr.return_date DESC, sr.created_at DESC
       LIMIT 5`,
      [businessId]
    );

    return {
      today: { ...todayRes.rows[0], today_expenses: Number(todayExpRes.rows[0]?.today_expenses || 0) },
      month: monthRes.rows[0],
      invoices: invStatsRes.rows[0],
      expenses: expStatsRes.rows[0],
      products: prodStatsRes.rows[0],
      monthlyTrend: monthlyTrendRes.rows,
      paymentMethods: paymentMethodsRes.rows,
      recentInvoices: recentInvoicesRes.rows,
      recentPurchases: recentPurchasesRes.rows,
      recentReturns: recentReturnsRes.rows,
    };
  }

  // Daily Sales Report
  static async getDailySalesReport(businessId: string, days = 30) {
    const res = await query(
      `SELECT 
         i.invoice_date AS sale_date,
         to_char(i.invoice_date, 'YYYY-MM-DD') AS date_label,
         COUNT(*) AS total_bills,
         COALESCE(SUM(i.subtotal), 0) AS subtotal,
         COALESCE(SUM(i.tax_amount), 0) AS total_tax,
         COALESCE(SUM(i.discount_amount), 0) AS total_discount,
         COALESCE(SUM(i.grand_total), 0) AS total_sales,
         COALESCE(SUM(i.paid_amount), 0) AS total_collected
       FROM invoices i
       WHERE i.business_id = $1 
         AND i.invoice_date >= CURRENT_DATE - ($2 || ' days')::interval
         AND i.status != 'cancelled'
       GROUP BY i.invoice_date
       ORDER BY i.invoice_date DESC`,
      [businessId, days]
    );
    return res.rows;
  }

  // Product-wise Sales Report
  static async getProductSalesReport(businessId: string, startDate?: string, endDate?: string) {
    let where = 'WHERE i.business_id = $1 AND i.status != \'cancelled\'';
    const params: any[] = [businessId];
    let idx = 2;

    if (startDate) {
      where += ` AND i.invoice_date >= $${idx}`;
      params.push(startDate);
      idx++;
    }
    if (endDate) {
      where += ` AND i.invoice_date <= $${idx}`;
      params.push(endDate);
      idx++;
    }

    const res = await query(
      `SELECT 
         p.id AS product_id,
         p.name AS product_name,
         p.sku,
         p.barcode,
         p.category,
         COALESCE(p.purchase_price, 0) AS unit_cost,
         COALESCE(SUM(ii.quantity), 0) AS units_sold,
         COALESCE(SUM(ii.line_total), 0) AS total_sales,
         COALESCE(SUM(ii.quantity * COALESCE(p.purchase_price, 0)), 0) AS total_cogs,
         (COALESCE(SUM(ii.line_total), 0) - COALESCE(SUM(ii.quantity * COALESCE(p.purchase_price, 0)), 0)) AS gross_profit
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       JOIN products p ON p.id = ii.product_id
       ${where}
       GROUP BY p.id, p.name, p.sku, p.barcode, p.category, p.purchase_price
       ORDER BY total_sales DESC`,
      params
    );
    return res.rows;
  }

  // Category-wise Sales Report
  static async getCategorySalesReport(businessId: string) {
    const res = await query(
      `SELECT 
         COALESCE(p.category, 'Uncategorized') AS category_name,
         COUNT(DISTINCT ii.invoice_id) AS bills_count,
         COALESCE(SUM(ii.quantity), 0) AS units_sold,
         COALESCE(SUM(ii.line_total), 0) AS total_sales
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       JOIN products p ON p.id = ii.product_id
       WHERE i.business_id = $1 AND i.status != 'cancelled'
       GROUP BY p.category
       ORDER BY total_sales DESC`,
      [businessId]
    );
    return res.rows;
  }

  // Top Selling Products
  static async getTopSellingProducts(businessId: string, limit = 10) {
    const res = await query(
      `SELECT 
         p.name AS product_name,
         p.sku,
         p.barcode,
         p.category,
         COALESCE(SUM(ii.quantity), 0) AS units_sold,
         COALESCE(SUM(ii.line_total), 0) AS revenue
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       JOIN products p ON p.id = ii.product_id
       WHERE i.business_id = $1 AND i.status != 'cancelled'
       GROUP BY p.id, p.name, p.sku, p.barcode, p.category
       ORDER BY units_sold DESC
       LIMIT $2`,
      [businessId, limit]
    );
    return res.rows;
  }

  // Gross Profit Overview (Sales Revenue - Cost of Goods Sold)
  static async getGrossProfitOverview(businessId: string) {
    const profitRes = await query(
      `SELECT 
         COALESCE(SUM(ii.line_total), 0) AS total_revenue,
         COALESCE(SUM(ii.quantity * COALESCE(p.purchase_price, 0)), 0) AS total_cogs,
         (COALESCE(SUM(ii.line_total), 0) - COALESCE(SUM(ii.quantity * COALESCE(p.purchase_price, 0)), 0)) AS gross_profit,
         CASE 
           WHEN COALESCE(SUM(ii.line_total), 0) > 0 THEN 
             ROUND(((COALESCE(SUM(ii.line_total), 0) - COALESCE(SUM(ii.quantity * COALESCE(p.purchase_price, 0)), 0)) / SUM(ii.line_total) * 100), 2)
           ELSE 0 
         END AS gross_profit_margin_pct
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       JOIN products p ON p.id = ii.product_id
       WHERE i.business_id = $1 AND i.status != 'cancelled'`,
      [businessId]
    );

    const expRes = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM expenses WHERE business_id = $1`,
      [businessId]
    );

    const row = profitRes.rows[0] || {};
    const totalExpenses = Number(expRes.rows[0]?.total_expenses || 0);
    const grossProfit = Number(row.gross_profit || 0);
    const netProfit = grossProfit - totalExpenses;
    const totalRev = Number(row.total_revenue || 0);

    return {
      ...row,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      net_profit_margin_pct: totalRev > 0 ? Math.round((netProfit / totalRev) * 10000) / 100 : 0,
    };
  }

  // Customer Balances (Credit ledger)
  static async getCustomerBalances(businessId: string) {
    const res = await query(
      `SELECT 
         c.id, c.name, c.phone, c.email,
         COUNT(i.id) AS total_bills,
         COALESCE(SUM(i.grand_total), 0) AS total_spent,
         COALESCE(SUM(i.balance_due), 0) AS outstanding_balance
       FROM customers c
       JOIN invoices i ON i.customer_id = c.id
       WHERE c.business_id = $1 AND i.status != 'cancelled'
       GROUP BY c.id
       HAVING COALESCE(SUM(i.balance_due), 0) > 0
       ORDER BY outstanding_balance DESC`,
      [businessId]
    );
    return res.rows;
  }

  // Supplier Balances (Accounts Payable)
  static async getSupplierBalances(businessId: string) {
    const res = await query(
      `SELECT 
         s.id, s.name, s.company_name, s.phone, s.email,
         s.outstanding_balance,
         COUNT(p.id) AS total_purchases,
         COALESCE(SUM(p.total_amount), 0) AS total_purchased
       FROM suppliers s
       LEFT JOIN purchases p ON p.supplier_id = s.id
       WHERE s.business_id = $1 AND s.is_archived = FALSE
       GROUP BY s.id
       ORDER BY s.outstanding_balance DESC`,
      [businessId]
    );
    return res.rows;
  }

  // Purchase Summary Report
  static async getPurchaseReport(businessId: string) {
    const res = await query(
      `SELECT 
         p.purchase_date,
         p.purchase_number,
         s.name AS supplier_name,
         s.company_name,
         p.total_amount,
         p.paid_amount,
         p.balance_due,
         p.payment_status
       FROM purchases p
       JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.business_id = $1
       ORDER BY p.purchase_date DESC, p.created_at DESC`,
      [businessId]
    );
    return res.rows;
  }

  // Return Summary Report
  static async getReturnReport(businessId: string) {
    const res = await query(
      `SELECT 
         sr.return_date,
         sr.return_number,
         i.invoice_number,
         COALESCE(c.name, 'Walk-in Customer') AS customer_name,
         sr.total_refund_amount,
         sr.refund_method,
         sr.reason
       FROM sales_returns sr
       JOIN invoices i ON i.id = sr.invoice_id
       LEFT JOIN customers c ON c.id = sr.customer_id
       WHERE sr.business_id = $1
       ORDER BY sr.return_date DESC, sr.created_at DESC`,
      [businessId]
    );
    return res.rows;
  }
}
