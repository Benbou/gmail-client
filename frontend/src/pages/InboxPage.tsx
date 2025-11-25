import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { emailsApi } from '@/lib/api';
import type { Email, EmailListParams } from '@/types';
import EmailListItem from '@/components/email/EmailListItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function InboxPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();

    const page = parseInt(searchParams.get('page') || '1');
    const userId = 'demo-user-id'; // TODO: Get from auth context

    // Fetch emails
    const { data, isLoading, error } = useQuery({
        queryKey: ['emails', { userId, page, is_archived: false }],
        queryFn: async () => {
            const params: EmailListParams = {
                userId,
                page,
                limit: 50,
                is_archived: false,
                sort: 'received_at',
                order: 'desc',
            };
            const response = await emailsApi.list(params);
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
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">Inbox</h2>
                {data && (
                    <p className="text-sm text-muted-foreground mt-1">
                        {data.pagination.total} messages
                    </p>
                )}
            </div>

            {/* Email List */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-4 space-y-4">
                        {[...Array(10)].map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
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
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <p className="text-xl font-medium">No emails</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Your inbox is empty
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between">
                    <Button
                        variant="outline"
                        disabled={page === 1}
                        onClick={() => setSearchParams({ page: String(page - 1) })}
                    >
                        Previous
                    </Button>

                    <span className="text-sm text-muted-foreground">
                        Page {page} of {data.pagination.totalPages}
                    </span>

                    <Button
                        variant="outline"
                        disabled={page === data.pagination.totalPages}
                        onClick={() => setSearchParams({ page: String(page + 1) })}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
