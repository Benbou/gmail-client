import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    ArrowLeft,
    Archive,
    Trash2,
    Clock,
    Star,
    Reply,
    Forward,
    MoreVertical,
    Mail,
    MailOpen,
    Paperclip,
    Printer,
    ExternalLink,
    ChevronDown,
} from 'lucide-react';
import { emailsApi } from '@/lib/api';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

export default function EmailDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch email details
    const { data: email, isLoading, error } = useQuery({
        queryKey: ['email', id],
        queryFn: async () => {
            const response = await emailsApi.get(id!);
            return response.data;
        },
        enabled: !!id,
    });

    // Mark as read mutation
    const markReadMutation = useMutation({
        mutationFn: (isRead: boolean) => emailsApi.update(id!, { is_read: isRead }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['email', id] });
            queryClient.invalidateQueries({ queryKey: ['emails'] });
        },
    });

    // Star mutation
    const starMutation = useMutation({
        mutationFn: (isStarred: boolean) => emailsApi.update(id!, { is_starred: isStarred }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['email', id] });
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            toast.success(email?.is_starred ? 'Removed from starred' : 'Added to starred');
        },
    });

    // Archive mutation
    const archiveMutation = useMutation({
        mutationFn: () => emailsApi.archive(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            toast.success('Email archived');
            navigate('/inbox');
        },
        onError: () => {
            toast.error('Failed to archive email');
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: () => emailsApi.delete(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            toast.success('Email deleted');
            navigate('/inbox');
        },
        onError: () => {
            toast.error('Failed to delete email');
        },
    });

    // Snooze mutation
    const snoozeMutation = useMutation({
        mutationFn: (until: string) => emailsApi.snooze(id!, until),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            toast.success('Email snoozed');
            navigate('/inbox');
        },
    });

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onArchive: () => archiveMutation.mutate(),
        onDelete: () => deleteMutation.mutate(),
        onReply: () => navigate(`/compose?reply=${id}`),
        onForward: () => navigate(`/compose?forward=${id}`),
        onMarkRead: () => markReadMutation.mutate(!email?.is_read),
        onStar: () => starMutation.mutate(!email?.is_starred),
    });

    // Mark as read when viewing
    if (email && !email.is_read && !markReadMutation.isPending) {
        markReadMutation.mutate(true);
    }

    const getInitials = (name?: string, email?: string) => {
        if (name) {
            return name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        return email?.charAt(0).toUpperCase() || '?';
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return format(date, 'MMM d, yyyy \'at\' h:mm a');
    };

    const handleSnooze = (hours: number) => {
        const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        snoozeMutation.mutate(until);
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-destructive">Failed to load email</p>
                    <Button variant="link" onClick={() => navigate('/inbox')}>
                        Back to inbox
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={0}>
            <div className="h-full flex flex-col bg-background">
                {/* Toolbar */}
                <div className="h-12 border-b flex items-center justify-between px-4 bg-background sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate('/inbox')}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Back to inbox</TooltipContent>
                        </Tooltip>

                        <Separator orientation="vertical" className="h-6" />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => archiveMutation.mutate()}
                                    disabled={archiveMutation.isPending}
                                >
                                    <Archive className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Archive (e)</TooltipContent>
                        </Tooltip>

                        <AlertDialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Delete (#)</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete email?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. The email will be moved to trash.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Clock className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Snooze</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleSnooze(3)}>
                                    Later today (3 hours)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSnooze(24)}>
                                    Tomorrow
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSnooze(48)}>
                                    In 2 days
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSnooze(168)}>
                                    Next week
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => markReadMutation.mutate(!email?.is_read)}
                                    disabled={markReadMutation.isPending}
                                >
                                    {email?.is_read ? (
                                        <Mail className="h-5 w-5" />
                                    ) : (
                                        <MailOpen className="h-5 w-5" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {email?.is_read ? 'Mark as unread' : 'Mark as read'}
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.print()}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open in Gmail
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => markReadMutation.mutate(!email?.is_read)}
                            >
                                {email?.is_read ? (
                                    <>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Mark as unread
                                    </>
                                ) : (
                                    <>
                                        <MailOpen className="h-4 w-4 mr-2" />
                                        Mark as read
                                    </>
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Email Content */}
                <ScrollArea className="flex-1">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            <Skeleton className="h-8 w-3/4" />
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-32" />
                                </div>
                            </div>
                            <Skeleton className="h-64 w-full" />
                        </div>
                    ) : email ? (
                        <div className="p-6">
                            {/* Subject */}
                            <div className="flex items-start justify-between mb-6">
                                <h1 className="text-2xl font-semibold flex-1 mr-4">
                                    {email.subject || '(no subject)'}
                                </h1>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => starMutation.mutate(!email.is_starred)}
                                    className={email.is_starred ? 'text-yellow-500' : ''}
                                >
                                    <Star
                                        className="h-5 w-5"
                                        fill={email.is_starred ? 'currentColor' : 'none'}
                                    />
                                </Button>
                            </div>

                            {/* Labels */}
                            {email.label_ids && email.label_ids.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {email.label_ids.map((labelId: string) => (
                                        <Badge key={labelId} variant="secondary">
                                            {labelId}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Sender info */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-start gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback>
                                            {getInitials(email.from_name, email.from_email)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">
                                                {email.from_name || email.from_email}
                                            </span>
                                            {email.from_name && (
                                                <span className="text-sm text-muted-foreground">
                                                    &lt;{email.from_email}&gt;
                                                </span>
                                            )}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                                                    to {email.to_emails?.join(', ') || 'me'}
                                                    <ChevronDown className="h-3 w-3" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-80">
                                                <div className="p-3 space-y-2 text-sm">
                                                    <div className="flex">
                                                        <span className="text-muted-foreground w-16">From:</span>
                                                        <span>{email.from_email}</span>
                                                    </div>
                                                    <div className="flex">
                                                        <span className="text-muted-foreground w-16">To:</span>
                                                        <span>{email.to_emails?.join(', ')}</span>
                                                    </div>
                                                    {email.cc_emails && email.cc_emails.length > 0 && (
                                                        <div className="flex">
                                                            <span className="text-muted-foreground w-16">Cc:</span>
                                                            <span>{email.cc_emails.join(', ')}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex">
                                                        <span className="text-muted-foreground w-16">Date:</span>
                                                        <span>{formatDate(email.received_at)}</span>
                                                    </div>
                                                </div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {formatDate(email.received_at)}
                                </span>
                            </div>

                            {/* Email body */}
                            <div className="mb-6">
                                {email.body_html ? (
                                    <div
                                        className="prose prose-sm max-w-none dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: email.body_html }}
                                    />
                                ) : (
                                    <div className="whitespace-pre-wrap">
                                        {email.body_text || email.snippet}
                                    </div>
                                )}
                            </div>

                            {/* Attachments */}
                            {email.attachments && email.attachments.length > 0 && (
                                <div className="border rounded-lg p-4 mb-6">
                                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Paperclip className="h-4 w-4" />
                                        {email.attachments.length} Attachment
                                        {email.attachments.length > 1 ? 's' : ''}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {email.attachments.map((attachment: any, index: number) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2 p-2 border rounded hover:bg-accent cursor-pointer"
                                            >
                                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm truncate">
                                                    {attachment.filename || `Attachment ${index + 1}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reply/Forward actions */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/compose?reply=${id}`)}
                                >
                                    <Reply className="h-4 w-4 mr-2" />
                                    Reply
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(`/compose?forward=${id}`)}
                                >
                                    <Forward className="h-4 w-4 mr-2" />
                                    Forward
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </ScrollArea>
            </div>
        </TooltipProvider>
    );
}
