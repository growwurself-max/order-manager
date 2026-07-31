import { Outlet } from 'react-router-dom';
import ToastProvider from '../context/ToastContext';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-bg-warm">
      <ToastProvider>
        <main>
          <Outlet />
        </main>
      </ToastProvider>
    </div>
  );
}