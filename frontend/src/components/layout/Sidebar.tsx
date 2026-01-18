import * as React from "react"
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Inbox,
    Send,
    Archive,
    Clock,
    Settings,
    Plus,
    File,
    Trash2,
    AlertCircle,
    Star,
    Tag,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { cn } from "@/lib/utils"
import { useAuth } from '@/contexts/AuthContext';
import { labelsApi, emailsApi } from '@/lib/api';
import type { Label } from '@/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface SidebarProps {
    isCollapsed: boolean
}

export default function Sidebar({ isCollapsed }: SidebarProps) {
    const { accounts, user } = useAuth();
    const [labelsOpen, setLabelsOpen] = React.useState(true);

    const userId = user?.id || 'demo-user-id';
    const primaryAccount = accounts[0];

    // Fetch labels for the primary account
    const { data: labelsData, isLoading: labelsLoading } = useQuery({
        queryKey: ['labels', primaryAccount?.id],
        queryFn: async () => {
            if (!primaryAccount) return { labels: [] };
            const response = await labelsApi.list(primaryAccount.id);
            return response.data;
        },
        enabled: !!primaryAccount,
    });

    // Fetch unread count
    const { data: unreadData } = useQuery({
        queryKey: ['emails', 'unread-count', userId],
        queryFn: async () => {
            const response = await emailsApi.list({
                userId,
                is_read: false,
                is_archived: false,
                limit: 1,
            });
            return response.data;
        },
    });

    const unreadCount = unreadData?.pagination?.total || 0;
    const labels: Label[] = labelsData?.labels || [];
    const userLabels = labels.filter(l => l.type === 'user' && l.is_visible);

    return (
        <TooltipProvider delayDuration={0}>
            <div className={cn("flex flex-col h-full bg-background border-r transition-all duration-300", isCollapsed ? "w-[52px]" : "w-64")}>
                {/* Compose Button */}
                <div className={cn("p-4", isCollapsed ? "px-2" : "px-4")}>
                    <Button
                        className={cn(
                            "shadow-md transition-all duration-300",
                            isCollapsed ? "h-12 w-12 rounded-full p-0" : "h-14 w-36 rounded-2xl justify-start px-4 gap-3"
                        )}
                        size={isCollapsed ? "icon" : "lg"}
                        asChild
                    >
                        <NavLink to="/compose">
                            <Plus className="h-6 w-6" />
                            {!isCollapsed && <span className="text-base font-medium">Compose</span>}
                        </NavLink>
                    </Button>
                </div>

                {/* Navigation */}
                <ScrollArea className="flex-1">
                    <nav className="px-2 space-y-1 py-2">
                        <NavItem to="/inbox" icon={Inbox} label="Inbox" isCollapsed={isCollapsed} count={unreadCount > 0 ? unreadCount : undefined} />
                        <NavItem to="/starred" icon={Star} label="Starred" isCollapsed={isCollapsed} />
                        <NavItem to="/snoozed" icon={Clock} label="Snoozed" isCollapsed={isCollapsed} />
                        <NavItem to="/sent" icon={Send} label="Sent" isCollapsed={isCollapsed} />
                        <NavItem to="/drafts" icon={File} label="Drafts" isCollapsed={isCollapsed} />
                        <NavItem to="/spam" icon={AlertCircle} label="Spam" isCollapsed={isCollapsed} />
                        <NavItem to="/trash" icon={Trash2} label="Trash" isCollapsed={isCollapsed} />
                        <NavItem to="/archived" icon={Archive} label="All Mail" isCollapsed={isCollapsed} />

                        <Separator className="my-4 mx-2" />

                        {/* Labels Section */}
                        {!isCollapsed && (
                            <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
                                <CollapsibleTrigger asChild>
                                    <button className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                                        <span>Labels</span>
                                        {labelsOpen ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    {labelsLoading ? (
                                        <div className="px-4 py-2 space-y-2">
                                            <Skeleton className="h-6 w-full" />
                                            <Skeleton className="h-6 w-3/4" />
                                        </div>
                                    ) : userLabels.length > 0 ? (
                                        <div className="space-y-1">
                                            {userLabels.map((label) => (
                                                <LabelItem
                                                    key={label.id}
                                                    label={label}
                                                    isCollapsed={isCollapsed}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-2 text-sm text-muted-foreground">
                                            No custom labels
                                        </div>
                                    )}
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {isCollapsed && userLabels.length > 0 && (
                            <NavItem
                                to="/labels"
                                icon={Tag}
                                label="Labels"
                                isCollapsed={isCollapsed}
                            />
                        )}
                    </nav>
                </ScrollArea>

                {/* Settings */}
                <div className="p-2 border-t mt-auto">
                    <NavItem to="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} variant="ghost" />
                </div>
            </div>
        </TooltipProvider>
    );
}

interface NavItemProps {
    to: string
    icon: React.ElementType
    label: string
    isCollapsed: boolean
    count?: number
    variant?: "default" | "ghost"
}

function NavItem({ to, icon: Icon, label, isCollapsed, count, variant: _variant = "default" }: NavItemProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <NavLink
                    to={to}
                    className={({ isActive }) =>
                        cn(
                            "flex items-center gap-3 px-3 py-2 rounded-full transition-colors text-sm font-medium",
                            isCollapsed ? "justify-center px-2" : "",
                            isActive
                                ? "bg-secondary text-secondary-foreground font-bold"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )
                    }
                >
                    <Icon className="h-5 w-5" />
                    {!isCollapsed && (
                        <div className="flex flex-1 items-center justify-between">
                            <span>{label}</span>
                            {count !== undefined && count > 0 && (
                                <span className="text-xs font-semibold">{count}</span>
                            )}
                        </div>
                    )}
                </NavLink>
            </TooltipTrigger>
            {isCollapsed && (
                <TooltipContent side="right" className="flex items-center gap-4">
                    {label}
                    {count !== undefined && count > 0 && <span className="text-muted-foreground ml-auto">{count}</span>}
                </TooltipContent>
            )}
        </Tooltip>
    )
}

interface LabelItemProps {
    label: Label;
    isCollapsed: boolean;
}

function LabelItem({ label, isCollapsed }: LabelItemProps) {
    const labelColor = label.color || '#6b7280';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <NavLink
                    to={`/label/${label.id}`}
                    className={({ isActive }) =>
                        cn(
                            "flex items-center gap-3 px-3 py-2 rounded-full transition-colors text-sm font-medium",
                            isCollapsed ? "justify-center px-2" : "",
                            isActive
                                ? "bg-secondary text-secondary-foreground font-bold"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )
                    }
                >
                    <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: labelColor }}
                    />
                    {!isCollapsed && (
                        <div className="flex flex-1 items-center justify-between">
                            <span className="truncate">{label.name}</span>
                            {label.message_count > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    {label.message_count}
                                </span>
                            )}
                        </div>
                    )}
                </NavLink>
            </TooltipTrigger>
            {isCollapsed && (
                <TooltipContent side="right" className="flex items-center gap-4">
                    {label.name}
                    {label.message_count > 0 && (
                        <span className="text-muted-foreground ml-auto">
                            {label.message_count}
                        </span>
                    )}
                </TooltipContent>
            )}
        </Tooltip>
    );
}
