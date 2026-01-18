import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { File, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { draftsApi } from '@/lib/api';
import type { Draft } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
import { toast } from 'sonner';

export default function DraftsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const userId = user?.id || 'demo-user-id';

    // Fetch drafts
    const { data, isLoading, error } = useQuery({
        queryKey: ['drafts', userId],
        queryFn: async () => {
            const response = await draftsApi.list(userId);
            return response.data;
        },
    });

    // Delete draft mutation
    const deleteMutation = useMutation({
        mutationFn: (draftId: string) => draftsApi.delete(draftId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            toast.success('Draft deleted');
        },
        onError: () => {
            toast.error('Failed to delete draft');
        },
    });

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-destructive">Failed to load drafts</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        {(error as any).message}
                    </p>
                </div>
            </div>
        );
    }

    const drafts: Draft[] = data?.drafts || [];

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Header */}
            <div className="h-12 border-b flex items-center px-4 bg-background sticky top-0 z-10">
                <h1 className="font-medium flex items-center gap-2">
                    <File className="h-5 w-5" />
                    Drafts
                </h1>
            </div>

            {/* Drafts List */}
            <ScrollArea className="flex-1">
                {isLoading ? (
                    <div className="p-4 space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : drafts.length > 0 ? (
                    <div>
                        {drafts.map((draft) => (
                            <DraftItem
                                key={draft.id}
                                draft={draft}
                                onEdit={() => navigate(`/compose?draft=${draft.id}`)}
                                onDelete={() => deleteMutation.mutate(draft.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full py-20">
                        <div className="text-center">
                            <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-xl font-medium">No drafts</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Drafts you create will appear here
                            </p>
                            <Button
                                className="mt-4"
                                onClick={() => navigate('/compose')}
                            >
                                Compose new email
                            </Button>
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

interface DraftItemProps {
    draft: Draft;
    onEdit: () => void;
    onDelete: () => void;
}

function DraftItem({ draft, onEdit, onDelete }: DraftItemProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            return format(date, 'h:mm a');
        }
        return format(date, 'MMM d');
    };

    const recipients = draft.to_emails?.join(', ') || 'No recipients';
    const subject = draft.subject || '(no subject)';
    const preview = draft.body_text?.slice(0, 100) || '';

    return (
        <div
            className="flex items-center px-4 py-3 border-b hover:bg-muted/50 cursor-pointer group"
            onClick={onEdit}
        >
            <div className="flex items-center gap-3 mr-4">
                <Checkbox
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-destructive font-medium">Draft</span>
                    <span className="text-sm text-muted-foreground truncate">
                        {recipients}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{subject}</span>
                    {preview && (
                        <span className="text-sm text-muted-foreground truncate">
                            - {preview}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                    {formatDate(draft.last_saved_at || draft.updated_at)}
                </span>
                <div className="hidden group-hover:flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete draft?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete}>
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </div>
    );
}
