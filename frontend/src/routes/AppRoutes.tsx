import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../layouts/DashboardLayout';

// Page Imports
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { BusinessSetupPage } from '../pages/BusinessSetupPage';

// Retail Shop Pages
import { DashboardPage } from '../pages/DashboardPage';
import { PosPage } from '../pages/PosPage';
import { SalesPage } from '../pages/SalesPage';
import { InvoiceDetailsPage } from '../pages/InvoiceDetailsPage';
import { ProductsPage } from '../pages/ProductsPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { InventoryPage } from '../pages/InventoryPage';
import { PurchasesPage } from '../pages/PurchasesPage';
import { SuppliersPage } from '../pages/SuppliersPage';
import { CustomersPage } from '../pages/CustomersPage';
import { CustomerDetailsPage } from '../pages/CustomerDetailsPage';
import { ReturnsPage } from '../pages/ReturnsPage';
import { ExpensesPage } from '../pages/ExpensesPage';
import { PaymentsPage } from '../pages/PaymentsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { StaffPage } from '../pages/StaffPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { ShopSettingsPage } from '../pages/ShopSettingsPage';
import { NotFoundPage } from '../pages/NotFoundPage';

// Route Guards
const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm font-semibold text-slate-500">
        Loading BillFlow Retail...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Admin only guard
const RequireAdmin: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm font-semibold text-slate-500">
        Checking permissions...
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/pos" replace />;
  }

  return children;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Business Setup Wizard */}
      <Route
        path="/setup-wizard"
        element={
          <RequireAuth>
            <RequireAdmin>
              <BusinessSetupPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      {/* Retail Store Terminal & Dashboard Layout */}
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        {/* Core Retail POS & Operations */}
        <Route
          path="/dashboard"
          element={
            <RequireAdmin>
              <DashboardPage />
            </RequireAdmin>
          }
        />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales/:id" element={<InvoiceDetailsPage />} />
        <Route path="/invoices" element={<Navigate to="/sales" replace />} />
        <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailsPage />} />
        <Route path="/returns" element={<ReturnsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Admin-only Retail Modules */}
        <Route
          path="/purchases"
          element={
            <RequireAdmin>
              <PurchasesPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/suppliers"
          element={
            <RequireAdmin>
              <SuppliersPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/expenses"
          element={
            <RequireAdmin>
              <ExpensesPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireAdmin>
              <ReportsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/staff"
          element={
            <RequireAdmin>
              <StaffPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAdmin>
              <ShopSettingsPage />
            </RequireAdmin>
          }
        />
        <Route path="/settings/profile" element={<Navigate to="/settings" replace />} />
        <Route path="/settings/invoice" element={<Navigate to="/settings" replace />} />
        <Route path="/settings/user" element={<Navigate to="/settings" replace />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
