import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar isCollapsed={isCollapsed} />

            <div className="flex-1 flex flex-col min-w-0">
                <TopBar onMenuClick={() => setIsCollapsed(!isCollapsed)} />

                <main className="flex-1 overflow-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
