# BillFlow – Retail Shop Management & POS Billing Software

**BillFlow Retail Management** is a dedicated, full-stack retail management and point-of-sale (POS) software built specifically for grocery shops, supermarkets, stationery shops, general stores, and retail outlets.

---

## Key Capabilities & Modules

BillFlow Retail is organized into **16 complete retail operational modules**:

### 1. Dashboard
- Real-time KPI summaries: Today's Sales, Monthly Sales, Total Bills, Total Products, and Low-Stock Alerts.
- Real-time PostgreSQL payment method breakdown (Cash vs UPI vs Card vs Split).
- Recent bills feed, recent purchase orders, and recent customer returns.

### 2. POS Billing Terminal (High Priority)
- Fast-paced retail billing interface designed for keyboard and mouse grocery counter workflows.
- Fast manual search by product name / SKU and intuitive category filter buttons. (No barcode scanning required).
- Quick product selection cards showing stock levels and unit prices.
- Shopping cart with instant quantity adjustment (+ / -) with stock bound checks.
- Item removal, real-time subtotal, configurable tax, and discount calculation.
- Walk-in customer default with 1-click modal to register new customers on the fly.
- Tender calculator (Cash received and change due).
- **Split Payments**: Collect partial amounts across Cash, UPI, and Card in a single transaction.
- Instant thermal receipt preview & print (58mm/80mm compatible).
- Atomic database transactions updating stock, ledger, and customer history on checkout.

### 3. Sales & Bill History
- Complete historical bill records with status badges (Paid, Partially Paid, Refunded, Cancelled).
- Full receipt details breakdown with cashier name and itemized tax.
- Instant PDF receipt download and thermal receipt re-printing.

### 4. Product Management
- Detailed retail product specifications: Name, SKU, Barcode, Category, Brand, Purchase Price, Selling Price, Unit (pcs, kg, liters, boxes), Current Stock, Minimum Stock, Tax Rate (%), and Image URL.
- Profit margin % calculated automatically.
- Bulk **CSV Import** and **CSV Export** for rapid catalog onboarding.
- Search, category filter, and active/inactive status toggle.

### 5. Category Management
- Categorize retail catalog (Grocery & Staples, Dairy & Beverages, Personal Care, Stationery, Household, etc.).
- Product count tracking per category.
- Add, edit, and delete categories with uniqueness constraints.

### 6. Inventory & Stock Valuation
- Real-time stock status tabs: All Stock, Low Stock, and Out of Stock.
- **Stock Adjustments**: Record manual inventory corrections with mandatory audit reasons (Damaged goods, Expired stock, Physical recount adjustment, Manual write-in).
- **Complete Stock Movement Audit Trail**: Every stock change (sale, purchase, return, adjustment) is permanently logged with before/after quantities and reference numbers.
- **Stock Valuation**: Total inventory units, total inventory cost value (Units × Purchase Price), and projected retail revenue (Units × Selling Price).

### 7. Purchase Management (Stock-in)
- Create multi-item purchase orders from registered suppliers.
- Add items with unit purchase price and quantity.
- Calculates subtotal, tax, and total purchase order value.
- **Transactional Stock Restocking**: Automatically increments inventory levels upon recording a purchase.
- Track supplier payment status (paid, partially paid, unpaid).

### 8. Supplier Management
- Manage vendor contact information, company name, phone, email, and tax/GSTIN ID.
- Real-time **Outstanding Balance Tracking** (Payables ledger).
- Record supplier payments directly against payables.
- View purchase order history per supplier.

### 9. Customer Management
- Maintain customer phone directory, email, address, and GSTIN/Tax ID.
- Dedicated support for **Walk-in Customers**.
- Customer profile with lifetime billed amount, total payments, and current outstanding credit balance.
- 1-click "New Bill at POS" button with pre-selected customer context.

### 10. Sales Returns & Refund Records
- Bill-level lookup to process product returns.
- **Strict Return Enforcement**: Validates that returned quantity never exceeds the remaining unreturned quantity for each item.
- Reason for return tracking (Damaged on arrival, Expired, Wrong item, Customer preference).
- **Resalable Stock Update**: Automatically returns good condition stock back to inventory while keeping damaged goods out of circulation.
- Refund payment method logging (Cash, UPI, Card, Store Credit).

### 11. Expense Management
- Categorize daily operational retail shop expenses:
  - **Rent**, **Electricity**, **Salary**, **Transport / Logistics**, **Internet**, **Maintenance**, **Supplies**, **Marketing**, and **Other**.
- Record payment method (Cash, UPI, Bank Transfer).
- Date range filtering and total expense aggregation.

### 12. Payment Management
- Centralized ledger of all customer payments and retail tenders.
- Filter by payment channel: Cash, UPI, Card, Bank Transfer, Split.
- Invoice balance synchronization and reversal safety.

### 13. Reports & Analytics (100% PostgreSQL Powered)
- 9 Analytical Retail Reports:
  1. **Daily Sales Report**: Day-by-day sales turnover, bill count, and visual revenue charts.
  2. **Gross Profit & Margin Report**: Sales Revenue minus Cost of Goods Sold (COGS) with gross margin percentages.
  3. **Top Selling Products**: Ranked by units sold and revenue generated.
  4. **Product-wise Sales**: Complete breakdown of each item's sales volume.
  5. **Category-wise Sales**: Revenue distribution across store departments.
  6. **Customer Balances**: Accounts receivable aging list.
  7. **Supplier Payables**: Outstanding balances owed to suppliers.
  8. **Purchase Orders Summary**: Monthly restocking expenses and orders.
  9. **Sales Returns Summary**: Total units refunded, reason breakdown, and cash refunds issued.

### 14. Staff Management & Granular RBAC
- Role-based access control with two retail roles:
  - **Admin (Store Manager)**: Full access to all 16 modules, financial reports, shop settings, purchases, suppliers, and staff management.
  - **Cashier**: Scoped access restricted to POS Billing, Sales history, Customer lookup, Catalog view, and Returns. Automatically redirected away from sensitive financial metrics and settings.
- Staff account creation, active/inactive toggle, and audit log history.

### 15. Notifications
- System-generated low-stock alerts, out-of-stock notices, and business notifications.

### 16. Shop Settings
- Configure store profile: Shop Name, Phone, Email, Physical Address, Currency (default: ₹).
- GSTIN / Tax ID and Tax configuration.
- **POS Receipt Customization**: Custom receipt header note, footer greeting, and store policy.
- Invoice & bill numbering prefix and sequence customization.
- Global low-stock threshold trigger.

---

## Tech Stack & Architecture

- **Backend**: Node.js, Express, TypeScript, `pg` (PostgreSQL Client with raw SQL, parameterized queries, and ACID transactions). **No Prisma or ORM used.**
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Security**: JWT authentication, bcrypt password hashing, input validation via Zod schemas, SQL injection prevention via parameterized queries, and CORS protection.

---

## Project Structure

```
BILLFLOW/
├── backend/
│   ├── src/
│   │   ├── config/             # PostgreSQL connection pool & env config
│   │   ├── controllers/        # Route controllers for all 16 retail modules
│   │   ├── db/
│   │   │   ├── migrations/     # 001_initial_schema.sql, 002_retail_shop_transform.sql
│   │   │   ├── migrate.ts      # Multi-migration sequential runner
│   │   │   └── seed.ts         # Realistic retail seed data (Metro Supermarket)
│   │   ├── middleware/         # JWT auth, requireAdmin role guard, rate limiting
│   │   ├── repositories/       # Raw SQL queries with parameterized inputs & transactions
│   │   ├── routes/             # Express API routes
│   │   ├── services/           # Business logic, auth, receipt generators
│   │   ├── types/              # Retail TypeScript types
│   │   ├── utils/              # Decimal-safe math and receipt formatters
│   │   ├── validators/         # Zod validation schemas
│   │   ├── app.ts              # Express application setup
│   │   └── server.ts           # Server entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/         # POS cart, modals, badges, Sidebar, tables
│   │   ├── context/            # AuthContext, ThemeContext, ToastContext
│   │   ├── layouts/            # DashboardLayout
│   │   ├── pages/              # All 16 retail module views (PosPage, InventoryPage, etc.)
│   │   ├── routes/             # AppRoutes with RequireAuth & RequireAdmin guards
│   │   ├── services/           # Axios endpoints for all retail APIs
│   │   ├── types/              # Retail data models
│   │   ├── utils/              # Decimal math and currency formatters
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Setup & Running Guide

### 1. Database Initialization
Ensure your PostgreSQL server is running and create the `billflow` database:
```sql
CREATE DATABASE billflow;
```

### 2. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create or verify `.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   DB_NAME=billflow
   JWT_SECRET=your_super_secret_jwt_key_2026
   CORS_ORIGIN=http://localhost:5173
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run migrations (applies `001_initial_schema.sql` and `002_retail_shop_transform.sql`):
   ```bash
   npm run migrate
   ```
5. Seed realistic retail store data (categories, products with barcodes, suppliers, POs, bills, expenses):
   ```bash
   npm run seed
   ```
6. Start the backend development server:
   ```bash
   npm run dev
   ```
   API runs at `http://localhost:5000/api`.

---

### 3. Frontend Setup
1. In another terminal, navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create or verify `.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## Pre-Configured Retail Accounts (Seeded)

Sign in with either of the following accounts:

| Role | Account Email | Password | Access Privileges |
|---|---|---|---|
| **Shop Owner / Admin** | `priya@metrogadgets.shop` | `Password123!` | Complete access to all 16 retail modules, dashboard, reports, suppliers, purchases, staff, and shop settings |
| **Cashier / Staff** | `cashier@metrogadgets.shop` | `Password123!` | Point of Sale (POS) billing terminal, fast product search, bill creation, payment recording, and sales receipt printing |
| **Cashier (Evening)** | `anand@metrogadgets.shop` | `Password123!` | Point of Sale (POS) billing terminal, fast product search, bill creation, payment recording, and sales receipt printing |
