import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import CustomerHome from './pages/customer/CustomerHome';
import WorkerHome from './pages/worker/WorkerHome';
import OwnerHome from './pages/owner/OwnerHome';
import LandingPage from './pages/LandingPage';
import { OrderNotificationProvider } from './context/OrderNotificationContext';
import { SuperAdminAuthProvider } from './context/SuperAdminAuthContext';
import { ToastProvider } from './context/ToastContext';
import SuperAdminProtectedRoute from './components/SuperAdminProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SuperAdminLogin from './pages/super-admin/SuperAdminLogin';
import OwnerLogin from './pages/auth/OwnerLogin';
import WorkerLogin from './pages/auth/WorkerLogin';
import SuperAdminDashboardPage from './pages/super-admin/SuperAdminDashboardPage';
import ShopManagementPage from './pages/super-admin/ShopManagementPage';
import OwnerManagementPage from './pages/super-admin/OwnerManagementPage';
import SubscriptionPage from './pages/super-admin/SubscriptionPage';
import AnalyticsPage from './pages/super-admin/AnalyticsPage';
import QRManagementPage from './pages/super-admin/QRManagementPage';
import SettingsPage from './pages/super-admin/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <OrderNotificationProvider>
        <ToastProvider>
          <Routes>
            {/* Landing page - default route */}
            <Route path="/" element={<LandingPage />} />

            {/* Login routes */}
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route path="/worker/login" element={<WorkerLogin />} />
            <Route
              path="/super-admin/login"
              element={
                <SuperAdminAuthProvider>
                  <SuperAdminLogin />
                </SuperAdminAuthProvider>
              }
            />

            {/* Protected app routes */}
            <Route element={<AppLayout />}>
              <Route path="/customer" element={<CustomerHome />} />
              <Route
                path="/worker"
                element={
                  <RoleProtectedRoute role="worker">
                    <WorkerHome />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/owner"
                element={
                  <RoleProtectedRoute role="owner">
                    <OwnerHome />
                  </RoleProtectedRoute>
                }
              />
            </Route>

            {/* Super Admin Panel with nested routes */}
            <Route
              path="/super-admin"
              element={
                <SuperAdminAuthProvider>
                  <SuperAdminProtectedRoute>
                    <SuperAdminLayout />
                  </SuperAdminProtectedRoute>
                </SuperAdminAuthProvider>
              }
            >
              <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
              <Route path="dashboard" element={<SuperAdminDashboardPage />} />
              <Route path="shops" element={<ShopManagementPage />} />
              <Route path="owners" element={<OwnerManagementPage />} />
              <Route path="subscriptions" element={<SubscriptionPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="qr-codes" element={<QRManagementPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </OrderNotificationProvider>
    </BrowserRouter>
  );
}
