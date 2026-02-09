import { useSearchParams } from 'react-router-dom';
import { Star, Archive, Trash2, Mail, MailOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAccountStore } from '@/stores/accountStore';
import type { Email } from '@/types';

interface EmailListItemProps {
    email: Email;
    onArchive: () => void;
    onToggleRead: () => void;
    onDelete?: () => void;
}

export default function EmailListItem({
    email,
    onArchive,
    onToggleRead,
    onDelete,
}: EmailListItemProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const { selectedAccountId } = useAccountStore();
    const isSelected = searchParams.get('id') === email.id;
    const showAccountBadge = !selectedAccountId; // Only show in unified inbox

    const date = new Date(email.received_at || new Date());
    const isToday = new Date().toDateString() === date.toDateString();
    const displayDate = isToday ? format(date, 'h:mm a') : format(date, 'MMM d');

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className={cn(
                    "group flex items-center gap-4 px-4 py-2 border-b cursor-pointer transition-colors hover:shadow-sm relative",
                    isSelected
                        ? "bg-accent"
                        : email.is_read ? "bg-background hover:bg-muted/50" : "bg-background font-semibold hover:bg-muted/50"
                )}
                onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('id', email.id);
                    setSearchParams(newParams);
                }}
            >
                {/* Selection & Star */}
                <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox className="opacity-30 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-yellow-400">
                        <Star className="h-5 w-5" />
                    </Button>
                </div>

                {/* Sender */}
                <div className="w-48 shrink-0 flex items-center gap-2">
                    <span className={cn("truncate", !email.is_read && "font-bold text-foreground")}>
                        {email.from_name || email.from_email}
                    </span>
                    {showAccountBadge && email.gmail_accounts?.account_email && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs shrink-0">
                                    {email.gmail_accounts.account_email.split('@')[0]}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{email.gmail_accounts.account_email}</TooltipContent>
                        </Tooltip>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex items-center gap-2 truncate text-muted-foreground">
                    <span className={cn("text-foreground truncate", !email.is_read && "font-bold")}>
                        {email.subject || '(no subject)'}
                    </span>
                    <span className="shrink-0">-</span>
                    <span className="truncate">
                        {email.snippet}
                    </span>
                </div>

                {/* Date / Actions */}
                <div className="w-24 shrink-0 flex justify-end">
                    {/* Date (Visible by default, hidden on hover) */}
                    <span className={cn(
                        "text-xs font-medium group-hover:hidden",
                        !email.is_read ? "text-foreground" : "text-muted-foreground"
                    )}>
                        {displayDate}
                    </span>

                    {/* Actions (Hidden by default, visible on hover) */}
                    <div className="hidden group-hover:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={onArchive}
                                >
                                    <Archive className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Archive</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={onToggleRead}
                                >
                                    {email.is_read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{email.is_read ? 'Mark as unread' : 'Mark as read'}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:text-destructive"
                                    onClick={onDelete}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
