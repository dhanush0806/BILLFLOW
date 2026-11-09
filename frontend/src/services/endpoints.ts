import { api } from './api';

export const AuthAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  forgotPassword: (data: { email: string }) => api.post('/auth/forgot-password', data),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

export const BusinessAPI = {
  getProfile: () => api.get('/business/profile'),
  updateProfile: (data: any) => api.put('/business/profile', data),
  getSettings: () => api.get('/business/settings'),
  updateSettings: (data: any) => api.put('/business/settings', data),
  completeSetup: (data: any) => api.post('/business/setup-wizard', data),
};

export const StaffAPI = {
  list: () => api.get('/staff'),
  create: (data: any) => api.post('/staff', data),
  updateStatus: (id: string, isActive: boolean) => api.put(`/staff/${id}/status`, { isActive }),
  getActivities: () => api.get('/staff/activities'),
};

export const CategoryAPI = {
  list: () => api.get('/categories'),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const ProductAPI = {
  list: (params?: any) => api.get('/products', { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  lookupBarcode: (code: string) => api.get(`/products/lookup/${code}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  archive: (id: string) => api.delete(`/products/${id}`),
  importCsv: (items: any[]) => api.post('/products/import-csv', { items }),
};

export const InventoryAPI = {
  getOverview: () => api.get('/inventory/overview'),
  getLowStock: () => api.get('/inventory/low-stock'),
  getOutOfStock: () => api.get('/inventory/out-of-stock'),
  getMovements: (params?: any) => api.get('/inventory/movements', { params }),
  getValuation: () => api.get('/inventory/valuation'),
  adjustStock: (data: {
    productId: string;
    adjustmentType: string;
    quantity: number;
    isAddition: boolean;
    reason: string;
  }) => api.post('/inventory/adjust', data),
};

export const SupplierAPI = {
  list: (params?: any) => api.get('/suppliers', { params }),
  getById: (id: string) => api.get(`/suppliers/${id}`),
  getPayments: (id: string) => api.get(`/suppliers/${id}/payments`),
  create: (data: any) => api.post('/suppliers', data),
  update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
  archive: (id: string) => api.delete(`/suppliers/${id}`),
  recordPayment: (id: string, data: any) => api.post(`/suppliers/${id}/payments`, data),
};

export const PurchaseAPI = {
  list: (params?: any) => api.get('/purchases', { params }),
  getById: (id: string) => api.get(`/purchases/${id}`),
  create: (data: any) => api.post('/purchases', data),
  receiveGoods: (id: string) => api.post(`/purchases/${id}/receive`),
};

export const PosAPI = {
  checkout: (data: any) => api.post('/pos/checkout', data),
};

export const ReturnAPI = {
  list: (params?: any) => api.get('/returns', { params }),
  getById: (id: string) => api.get(`/returns/${id}`),
  getEligibility: (invoiceId: string) => api.get(`/returns/eligibility/${invoiceId}`),
  create: (data: any) => api.post('/returns', data),
};

export const CustomerAPI = {
  list: (params?: any) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const InvoiceAPI = {
  list: (params?: any) => api.get('/invoices', { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  previewCalculation: (data: any) => api.post('/invoices/preview-calculation', data),
  create: (data: any) => api.post('/invoices', data),
  issue: (id: string) => api.post(`/invoices/${id}/issue`),
  cancel: (id: string) => api.post(`/invoices/${id}/cancel`),
  downloadPdfUrl: (id: string) => `/api/invoices/${id}/pdf`,
};

export const PaymentAPI = {
  list: (params?: any) => api.get('/payments', { params }),
  getById: (id: string) => api.get(`/payments/${id}`),
  record: (data: any) => api.post('/payments', data),
  reverse: (id: string) => api.post(`/payments/${id}/reverse`),
  downloadReceiptPdfUrl: (id: string) => `/api/payments/${id}/receipt-pdf`,
};

export const ExpenseAPI = {
  list: (params?: any) => api.get('/expenses', { params }),
  getById: (id: string) => api.get(`/expenses/${id}`),
  create: (data: any) => api.post('/expenses', data),
  update: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
};

export const ReportAPI = {
  getDashboard: (params?: { range?: string }) => api.get('/reports/dashboard', { params }),
  getDailySales: (days = 30) => api.get('/reports/daily-sales', { params: { days } }),
  getProductSales: (params?: { startDate?: string; endDate?: string }) => api.get('/reports/product-sales', { params }),
  getCategorySales: () => api.get('/reports/category-sales'),
  getTopSelling: (limit = 10) => api.get('/reports/top-selling', { params: { limit } }),
  getGrossProfit: () => api.get('/reports/gross-profit'),
  getCustomerBalances: () => api.get('/reports/customer-balances'),
  getSupplierBalances: () => api.get('/reports/supplier-balances'),
  getPurchases: () => api.get('/reports/purchases'),
  getReturns: () => api.get('/reports/returns'),
};

export const NotificationAPI = {
  list: () => api.get('/notifications'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Aliases for backward compatibility if any component references them
export const CatalogAPI = {
  listProducts: ProductAPI.list,
  createProduct: ProductAPI.create,
  updateProduct: ProductAPI.update,
  archiveProduct: ProductAPI.archive,
};
