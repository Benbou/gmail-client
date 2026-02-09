import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Outlet, useParams } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function MailView() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { id: emailId } = useParams<{ id?: string }>();
  const showDetailPanel = !!emailId;

  // Mobile: Show only list or detail
  if (isMobile && showDetailPanel) {
    return <Outlet context={{ mode: 'detail' }} />;
  }

  if (isMobile) {
    return <Outlet context={{ mode: 'list' }} />;
  }

  // Desktop: 3-panel resizable layout
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Email List Panel */}
      <ResizablePanel defaultSize={showDetailPanel ? 40 : 100} minSize={30}>
        <Outlet context={{ mode: 'list' }} />
      </ResizablePanel>

      {/* Email Detail Panel (conditional) */}
      {showDetailPanel && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={40}>
            <Outlet context={{ mode: 'detail' }} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
