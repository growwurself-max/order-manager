import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ToastProvider } from '../context/ToastContext';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-bg-warm flex flex-col">
      <ToastProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '16px',
              padding: '16px 20px',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: {
              style: {
                background: '#10B981',
                color: '#fff',
              },
            },
            error: {
              style: {
                background: '#EF4444',
                color: '#fff',
              },
            },
          }}
        />
        <Header />
        <main className="flex-1">
          <Outlet />
        </main> 
        <Footer />
        <div className="fixed bottom-4 right-4 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xs px-3 py-1.5 rounded-full border border-border-warm text-[10px] font-semibold text-text-muted tracking-wider uppercase pointer-events-none shadow-xs">
          Made by SHA
        </div>
      </ToastProvider>
    </div>
  );
}
