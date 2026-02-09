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
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { cn } from "@/lib/utils"
import { useAuth } from '@/contexts/AuthContext';
import { useAccountStore } from '@/stores/accountStore';
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
import AccountSwitcher from './AccountSwitcher';

interface SidebarProps {
    isCollapsed: boolean
}

export default function Sidebar({ isCollapsed }: SidebarProps) {
    const { accounts, user } = useAuth();
    const { selectedAccountId } = useAccountStore();
    const [labelsOpen, setLabelsOpen] = React.useState(true);

    const userId = user?.id || 'demo-user-id';

    // Fetch labels for selected account or all accounts
    const { data: labelsData, isLoading: labelsLoading } = useQuery({
        queryKey: ['labels', selectedAccountId, accounts.map(a => a.id).join(',')],
        queryFn: async () => {
            if (selectedAccountId) {
                // Single account mode
                const response = await labelsApi.list(selectedAccountId);
                return { type: 'single' as const, data: response.data.labels };
            } else if (accounts.length > 0) {
                // All accounts mode - fetch labels for each
                const labelPromises = accounts.map(async (acc) => {
                    const response = await labelsApi.list(acc.id);
                    return {
                        accountId: acc.id,
                        accountEmail: acc.email,
                        labels: response.data.labels,
                    };
                });
                const allLabels = await Promise.all(labelPromises);
                return { type: 'multi' as const, data: allLabels };
            }
            return { type: 'none' as const, data: [] };
        },
        enabled: accounts.length > 0,
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

    return (
        <TooltipProvider delayDuration={0}>
            <div className={cn("flex flex-col h-full bg-sidebar border-sidebar-border transition-all duration-300", isCollapsed ? "w-[52px]" : "w-64")}>
                {/* Account Switcher */}
                <div className={cn("p-4 border-b border-sidebar-border", isCollapsed ? "px-2" : "px-4")}>
                    <AccountSwitcher isCollapsed={isCollapsed} />
                </div>

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

                        <Separator className="my-4 mx-2 bg-sidebar-border" />

                        {/* Labels Section */}
                        {!isCollapsed && (
                            <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
                                <CollapsibleTrigger asChild>
                                    <button className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-sidebar-muted-foreground uppercase tracking-wider hover:text-sidebar-foreground transition-colors">
                                        <span>Labels</span>
                                        {labelsOpen ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    {labelsLoading && (
                                        <div className="px-4 py-2 space-y-2">
                                            <Skeleton className="h-6 w-full" />
                                            <Skeleton className="h-6 w-3/4" />
                                        </div>
                                    )}

                                    {/* Multi-account mode */}
                                    {labelsData?.type === 'multi' && labelsData.data.map((accountLabels) => {
                                        const userLabels = accountLabels.labels.filter((l: Label) => l.type === 'user' && l.is_visible);
                                        if (userLabels.length === 0) return null;

                                        return (
                                            <div key={accountLabels.accountId} className="mb-2">
                                                <div className="text-xs text-sidebar-muted-foreground px-4 py-1 font-medium">
                                                    {accountLabels.accountEmail.split('@')[0]}
                                                </div>
                                                <div className="space-y-1">
                                                    {userLabels.map((label: Label) => (
                                                        <LabelItem
                                                            key={`${accountLabels.accountId}-${label.id}`}
                                                            label={label}
                                                            isCollapsed={isCollapsed}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Single account mode */}
                                    {labelsData?.type === 'single' && (
                                        <>
                                            {labelsData.data.filter((l: Label) => l.type === 'user' && l.is_visible).length > 0 ? (
                                                <div className="space-y-1">
                                                    {labelsData.data
                                                        .filter((l: Label) => l.type === 'user' && l.is_visible)
                                                        .map((label: Label) => (
                                                            <LabelItem
                                                                key={label.id}
                                                                label={label}
                                                                isCollapsed={isCollapsed}
                                                            />
                                                        ))}
                                                </div>
                                            ) : (
                                                <div className="px-4 py-2 text-sm text-sidebar-muted-foreground">
                                                    No custom labels
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* No accounts */}
                                    {labelsData?.type === 'none' && (
                                        <div className="px-4 py-2 text-sm text-sidebar-muted-foreground">
                                            Connect a Gmail account
                                        </div>
                                    )}
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {/* In collapsed mode, labels are accessible by expanding the sidebar */}
                    </nav>
                </ScrollArea>

                {/* Settings */}
                <div className="p-2 border-t border-sidebar-border mt-auto">
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
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
                    {count !== undefined && count > 0 && <span className="text-sidebar-muted-foreground ml-auto">{count}</span>}
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
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
                                <span className="text-xs text-sidebar-muted-foreground">
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
                        <span className="text-sidebar-muted-foreground ml-auto">
                            {label.message_count}
                        </span>
                    )}
                </TooltipContent>
            )}
        </Tooltip>
    );
}
