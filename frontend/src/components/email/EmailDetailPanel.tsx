import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { X, Archive, Trash2, Star, Clock, MoreVertical, Reply, Forward } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EmailDetailPanel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['email', id],
    queryFn: async () => {
      const response = await emailsApi.get(id!);
      return response.data;
    },
    enabled: !!id,
  });

  const archiveMutation = useMutation({
    mutationFn: () => emailsApi.archive(id!),
    onSuccess: () => {
      toast.success('Email archived');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      navigate(-1);
    },
    onError: () => {
      toast.error('Failed to archive email');
    },
  });

  const email = data?.email;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-3/4" />
        </div>
        <div className="p-6 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Email not found</p>
          <Button variant="link" onClick={() => navigate(-1)} className="mt-2">
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold truncate">{email.subject || '(No subject)'}</h2>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
          >
            <Archive className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Star className={email.is_starred ? "h-4 w-4 fill-yellow-400 text-yellow-400" : "h-4 w-4"} />
          </Button>
          <Button variant="ghost" size="icon">
            <Clock className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Email content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Sender info */}
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{email.from_name || email.from_email}</div>
                <div className="text-sm text-muted-foreground">{email.from_email}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(email.date), 'PPp')}
              </div>
            </div>
          </div>

          {/* Email body */}
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body_html || email.body_text || '' }}
          />
        </div>
      </ScrollArea>

      {/* Reply/Forward actions */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button>
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline">
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}
