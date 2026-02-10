import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  X, Archive, Trash2, Star, Clock, MoreVertical, Reply, Forward,
  Mail, MailOpen, Printer, ExternalLink, ChevronDown,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';

interface EmailDetailPanelProps {
  emailId: string;
  accountId: string;
  onClose: () => void;
}

export default function EmailDetailPanel({ emailId, accountId, onClose }: EmailDetailPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['email', emailId, accountId],
    queryFn: async () => {
      const response = await emailsApi.get(emailId, accountId);
      return response.data;
    },
    enabled: !!emailId && !!accountId,
  });

  const email = data;

  // Mark as read when viewing
  const markReadMutation = useMutation({
    mutationFn: (isRead: boolean) => emailsApi.markRead(emailId, accountId, isRead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', emailId] });
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });

  useEffect(() => {
    if (email && !email.is_read && !markReadMutation.isPending) {
      markReadMutation.mutate(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email?.id, email?.is_read]);

  const starMutation = useMutation({
    mutationFn: (isStarred: boolean) => emailsApi.star(emailId, accountId, isStarred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', emailId] });
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success(email?.is_starred ? 'Removed from starred' : 'Added to starred');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => emailsApi.archive(emailId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('Email archived');
      onClose();
    },
    onError: () => {
      toast.error('Failed to archive email');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => emailsApi.trash(emailId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('Email deleted');
      onClose();
    },
    onError: () => {
      toast.error('Failed to delete email');
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: (until: string) => emailsApi.snooze(emailId, accountId, until),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('Email snoozed');
      onClose();
    },
  });

  const handleSnooze = (hours: number) => {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    snoozeMutation.mutate(until);
  };

  const getInitials = (name?: string, emailAddr?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return emailAddr?.charAt(0).toUpperCase() || '?';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-3/4" />
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Email not found</p>
          <Button variant="link" onClick={onClose} className="mt-2">
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const sanitizedHtml = email.body_html
    ? DOMPurify.sanitize(email.body_html)
    : null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="h-12 border-b flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
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
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Clock className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Snooze</TooltipContent>
              </Tooltip>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleSnooze(3)}>Later today (3h)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSnooze(24)}>Tomorrow</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSnooze(48)}>In 2 days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSnooze(168)}>Next week</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => markReadMutation.mutate(!email.is_read)}
                  disabled={markReadMutation.isPending}
                >
                  {email.is_read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{email.is_read ? 'Mark unread' : 'Mark read'}</TooltipContent>
            </Tooltip>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
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
              <DropdownMenuItem onClick={() => markReadMutation.mutate(!email.is_read)}>
                {email.is_read ? <Mail className="h-4 w-4 mr-2" /> : <MailOpen className="h-4 w-4 mr-2" />}
                {email.is_read ? 'Mark as unread' : 'Mark as read'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Email content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Subject */}
            <div className="flex items-start justify-between mb-6">
              <h1 className="text-xl font-semibold flex-1 mr-4">
                {email.subject || '(no subject)'}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => starMutation.mutate(!email.is_starred)}
                className={email.is_starred ? 'text-yellow-500' : ''}
              >
                <Star className="h-5 w-5" fill={email.is_starred ? 'currentColor' : 'none'} />
              </Button>
            </div>

            {/* Labels */}
            {email.label_ids && email.label_ids.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {email.label_ids.map((labelId: string) => (
                  <Badge key={labelId} variant="secondary">{labelId}</Badge>
                ))}
              </div>
            )}

            {/* Sender info */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {getInitials(email.from_name, email.from_email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{email.from_name || email.from_email}</span>
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
              <span className="text-sm text-muted-foreground shrink-0">
                {formatDate(email.received_at)}
              </span>
            </div>

            {/* Email body */}
            <div className="mb-6">
              {sanitizedHtml ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
              ) : (
                <div className="whitespace-pre-wrap">
                  {email.body_text || email.snippet}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Reply/Forward actions */}
        <div className="p-4 border-t shrink-0">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/compose?reply=${emailId}&account=${accountId}`)}>
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline" onClick={() => navigate(`/compose?forward=${emailId}&account=${accountId}`)}>
              <Forward className="h-4 w-4 mr-2" />
              Forward
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
