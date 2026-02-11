import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import TopBar from './TopBar';
import {
    SidebarInset,
    SidebarProvider,
} from '@/components/ui/sidebar';

export default function AppLayout() {
    return (
        <SidebarProvider
            style={
                {
                    '--sidebar-width': '280px',
                } as React.CSSProperties
            }
        >
            <AppSidebar />
            <SidebarInset>
                <TopBar />
                <div className="flex-1 overflow-hidden">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
