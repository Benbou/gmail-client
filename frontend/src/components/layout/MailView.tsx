import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Outlet, useSearchParams } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import EmailDetailPanel from '@/components/email/EmailDetailPanel';

export default function MailView() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedEmailId = searchParams.get('id');

  const handleCloseEmail = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('id');
    setSearchParams(newParams);
  };

  // Mobile: Show only detail when email selected
  if (isMobile && selectedEmailId) {
    return <EmailDetailPanel emailId={selectedEmailId} onClose={handleCloseEmail} />;
  }

  // Mobile: Show only list
  if (isMobile) {
    return <Outlet />;
  }

  // Desktop: resizable layout
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Email List Panel */}
      <ResizablePanel defaultSize={selectedEmailId ? 40 : 100} minSize={30}>
        <Outlet />
      </ResizablePanel>

      {/* Email Detail Panel (conditional) */}
      {selectedEmailId && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={40}>
            <EmailDetailPanel emailId={selectedEmailId} onClose={handleCloseEmail} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
