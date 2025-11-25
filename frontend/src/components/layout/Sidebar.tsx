import { NavLink } from 'react-router-dom';
import { Inbox, Send, Archive, Clock, Settings, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function Sidebar() {
    return (
        <div className="w-64 border-r bg-card flex flex-col">
            {/* Logo */}
            <div className="p-4 border-b">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    📧 <span>Gmail Client</span>
                </h1>
            </div>

            {/* Compose Button */}
            <div className="p-4">
                <Button className="w-full" size="lg" asChild>
                    <NavLink to="/compose">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Compose
                    </NavLink>
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-2 space-y-1">
                <NavLink
                    to="/inbox"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`
                    }
                >
                    <Inbox className="h-5 w-5" />
                    <span className="font-medium">Inbox</span>
                </NavLink>

                <NavLink
                    to="/sent"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`
                    }
                >
                    <Send className="h-5 w-5" />
                    <span className="font-medium">Sent</span>
                </NavLink>

                <NavLink
                    to="/archived"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`
                    }
                >
                    <Archive className="h-5 w-5" />
                    <span className="font-medium">Archived</span>
                </NavLink>

                <NavLink
                    to="/snoozed"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`
                    }
                >
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">Snoozed</span>
                </NavLink>

                <Separator className="my-2" />

                {/* Labels section */}
                <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                    Labels
                </div>

                {/* Placeholder for labels */}
                <div className="px-3 py-2 text-sm text-muted-foreground">
                    No custom labels yet
                </div>
            </nav>

            {/* Settings */}
            <div className="p-2 border-t">
                <Button variant="ghost" className="w-full justify-start" asChild>
                    <NavLink to="/settings">
                        <Settings className="mr-2 h-5 w-5" />
                        Settings
                    </NavLink>
                </Button>
            </div>
        </div>
    );
}
