import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useParams } from 'react-router-dom';
import {
    RotateCw,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Inbox,
    Send,
    Star,
    Clock,
    AlertCircle,
    Trash2,
    Archive,
    Tag,
} from 'lucide-react';
import { emailsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Email, EmailListParams } from '@/types';
import EmailListItem from '@/components/email/EmailListItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'sonner';

type FilterType = 'sent' | 'starred' | 'snoozed' | 'spam' | 'trash' | 'archived';

interface InboxPageProps {
    filter?: FilterType;
}

const filterConfig: Record<FilterType | 'inbox' | 'label', { icon: React.ElementType; title: string }> = {
    inbox: { icon: Inbox, title: 'Inbox' },
    sent: { icon: Send, title: 'Sent' },
    starred: { icon: Star, title: 'Starred' },
    snoozed: { icon: Clock, title: 'Snoozed' },
    spam: { icon: AlertCircle, title: 'Spam' },
    trash: { icon: Trash2, title: 'Trash' },
    archived: { icon: Archive, title: 'All Mail' },
    label: { icon: Tag, title: 'Label' },
};

export default function InboxPage({ filter }: InboxPageProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const { labelId } = useParams<{ labelId?: string }>();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const page = parseInt(searchParams.get('page') || '1');
    const userId = user?.id || 'demo-user-id';

    // Determine the current view
    const currentView = labelId ? 'label' : (filter || 'inbox');
    const config = filterConfig[currentView];
    const Icon = config.icon;

    // Build query params based on filter
    const queryParams = useMemo(() => {
        const params: EmailListParams = {
            userId,
            page,
            limit: 50,
            sort: 'received_at',
            order: 'desc',
        };

        switch (filter) {
            case 'sent':
                // For sent emails, we'd filter by the sender being the user
                // This requires backend support - for now just filter
                params.label_id = 'SENT';
                break;
            case 'starred':
                params.is_starred = true;
                params.is_archived = false;
                break;
            case 'snoozed':
                params.label_id = 'SNOOZED';
                break;
            case 'spam':
                params.label_id = 'SPAM';
                break;
            case 'trash':
                params.label_id = 'TRASH';
                break;
            case 'archived':
                // All mail - no filters
                break;
            default:
                // Inbox - not archived
                params.is_archived = false;
                break;
        }

        if (labelId) {
            params.label_id = labelId;
            params.is_archived = undefined; // Show all emails with this label
        }

        return params;
    }, [filter, labelId, page, userId]);

    // Fetch emails
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['emails', queryParams],
        queryFn: async () => {
            const response = await emailsApi.list(queryParams);
            return response.data;
        },
    });

    // Archive mutation
    const archiveMutation = useMutation({
        mutationFn: (emailId: string) => emailsApi.archive(emailId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            toast.success('Email archived');
        },
        onError: () => {
            toast.error('Failed to archive email');
        },
    });

    // Mark read mutation
    const markReadMutation = useMutation({
        mutationFn: ({ emailId, is_read }: { emailId: string; is_read: boolean }) =>
            emailsApi.update(emailId, { is_read }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (emailId: string) => emailsApi.delete(emailId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            toast.success('Email deleted');
        },
        onError: () => {
            toast.error('Failed to delete email');
        },
    });

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-destructive">Failed to load emails</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        {(error as any).message}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="h-12 border-b flex items-center justify-between px-4 bg-background sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Checkbox />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-4 p-0">
                                    <span className="sr-only">Select options</span>
                                    <span className="text-xs">▼</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem>All</DropdownMenuItem>
                                <DropdownMenuItem>None</DropdownMenuItem>
                                <DropdownMenuItem>Read</DropdownMenuItem>
                                <DropdownMenuItem>Unread</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()}>
                        <RotateCw className="h-4 w-4" />
                    </Button>

                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                    </Button>

                    {/* Page title */}
                    <div className="hidden md:flex items-center gap-2 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{config.title}</span>
                    </div>
                </div>

                {/* Pagination */}
                {data && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                            {data.emails?.length > 0
                                ? `${(page - 1) * 50 + 1}-${Math.min(page * 50, data.pagination.total)} of ${data.pagination.total}`
                                : '0 emails'}
                        </span>
                        <div className="flex items-center">
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={page === 1}
                                onClick={() => setSearchParams({ page: String(page - 1) })}
                                className="h-8 w-8"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                disabled={page === data.pagination.totalPages}
                                onClick={() => setSearchParams({ page: String(page + 1) })}
                                className="h-8 w-8"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Email List */}
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="p-4 space-y-4">
                        {[...Array(10)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : data?.emails && data.emails.length > 0 ? (
                    <div>
                        {data.emails.map((email: Email) => (
                            <EmailListItem
                                key={email.id}
                                email={email}
                                onArchive={() => archiveMutation.mutate(email.id)}
                                onToggleRead={() =>
                                    markReadMutation.mutate({
                                        emailId: email.id,
                                        is_read: !email.is_read,
                                    })
                                }
                                onDelete={() => deleteMutation.mutate(email.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full py-20">
                        <div className="text-center">
                            <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-xl font-medium">No emails</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                {currentView === 'inbox'
                                    ? 'Your inbox is empty'
                                    : `No emails in ${config.title.toLowerCase()}`}
                            </p>
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
