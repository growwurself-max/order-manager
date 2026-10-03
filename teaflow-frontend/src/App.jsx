import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import { OrderNotificationProvider } from './context/OrderNotificationContext';
import { SuperAdminAuthProvider } from './context/SuperAdminAuthContext';
import { ToastProvider } from './context/ToastContext';
import { ShopProvider } from './context/ShopContext';
import SuperAdminProtectedRoute from './components/SuperAdminProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';

// Route-level code splitting. Each portal loads only what it needs, so opening
// the customer menu no longer downloads the owner dashboard, worker app and the
// whole super-admin panel first.
const CustomerHome = lazy(() => import('./pages/customer/CustomerHome'));
const WorkerHome = lazy(() => import('./pages/worker/WorkerHome'));
const OwnerHome = lazy(() => import('./pages/owner/OwnerHome'));
const OwnerLogin = lazy(() => import('./pages/auth/OwnerLogin'));
const WorkerLogin = lazy(() => import('./pages/auth/WorkerLogin'));
const SuperAdminLayout = lazy(() => import('./layouts/SuperAdminLayout'));
const SuperAdminLogin = lazy(() => import('./pages/super-admin/SuperAdminLogin'));
const SuperAdminDashboardPage = lazy(() => import('./pages/super-admin/SuperAdminDashboardPage'));
const ShopManagementPage = lazy(() => import('./pages/super-admin/ShopManagementPage'));
const OwnerManagementPage = lazy(() => import('./pages/super-admin/OwnerManagementPage'));
const SubscriptionPage = lazy(() => import('./pages/super-admin/SubscriptionPage'));
const AnalyticsPage = lazy(() => import('./pages/super-admin/AnalyticsPage'));
const QRManagementPage = lazy(() => import('./pages/super-admin/QRManagementPage'));
const SettingsPage = lazy(() => import('./pages/super-admin/SettingsPage'));

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <OrderNotificationProvider>
        <ToastProvider>
          <ShopProvider>
            <Suspense fallback={<RouteFallback />}>
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
            </Suspense>
          </ShopProvider>
        </ToastProvider>
      </OrderNotificationProvider>
    </BrowserRouter>
  );
}
