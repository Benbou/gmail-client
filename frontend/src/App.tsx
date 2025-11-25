import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout';
import InboxPage from '@/pages/InboxPage';
import EmailDetailPage from '@/pages/EmailDetailPage';
import ComposePage from '@/pages/ComposePage';
import SettingsPage from '@/pages/SettingsPage';
import '@/index.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/inbox" replace />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="email/:id" element={<EmailDetailPage />} />
            <Route path="compose" element={<ComposePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
