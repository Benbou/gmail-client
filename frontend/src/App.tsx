import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import MailView from '@/components/layout/MailView';
import LoginPage from '@/pages/LoginPage';
import InboxPage from '@/pages/InboxPage';
import ComposePage from '@/pages/ComposePage';
import SettingsPage from '@/pages/SettingsPage';
import DraftsPage from '@/pages/DraftsPage';
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

// Backward compat: redirect /email/:id to /inbox?id=:id
function EmailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/inbox?id=${id}`} replace />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="gmail-client-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Login route (outside of AppLayout) */}
              <Route path="login" element={<LoginPage />} />

              {/* Main app routes */}
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/inbox" replace />} />

                {/* Mail routes with 3-panel layout */}
                <Route element={<MailView />}>
                  <Route path="inbox" element={<InboxPage />} />
                  <Route path="sent" element={<InboxPage filter="sent" />} />
                  <Route path="starred" element={<InboxPage filter="starred" />} />
                  <Route path="snoozed" element={<InboxPage filter="snoozed" />} />
                  <Route path="spam" element={<InboxPage filter="spam" />} />
                  <Route path="trash" element={<InboxPage filter="trash" />} />
                  <Route path="archived" element={<InboxPage filter="archived" />} />
                  <Route path="drafts" element={<DraftsPage />} />
                  <Route path="label/:labelId" element={<InboxPage />} />
                </Route>

                {/* Full-page routes (outside 3-panel) */}
                <Route path="compose" element={<ComposePage />} />
                <Route path="settings" element={<SettingsPage />} />

                {/* Backward compat redirect */}
                <Route path="email/:id" element={<EmailRedirect />} />
              </Route>

              {/* Catch all - redirect to inbox */}
              <Route path="*" element={<Navigate to="/inbox" replace />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
