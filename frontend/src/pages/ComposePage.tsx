import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    ArrowLeft,
    Send,
    Clock,
    Trash2,
    Paperclip,
    ChevronDown,
    ChevronUp,
    Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { emailsApi, draftsApi } from '@/lib/api';
import RecipientInput from '@/components/email/RecipientInput';
import RichTextEditor from '@/components/email/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

const composeSchema = z.object({
    to: z.array(z.string().email()).min(1, 'At least one recipient is required'),
    cc: z.array(z.string().email()).optional(),
    bcc: z.array(z.string().email()).optional(),
    subject: z.string().optional(),
    body: z.string().min(1, 'Message body is required'),
    accountId: z.string().min(1, 'Please select a sending account'),
});

type ComposeFormData = z.infer<typeof composeSchema>;

export default function ComposePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const { accounts } = useAuth();

    const replyTo = searchParams.get('reply');
    const forwardId = searchParams.get('forward');
    const draftId = searchParams.get('draft');

    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<ComposeFormData>({
        resolver: zodResolver(composeSchema),
        defaultValues: {
            to: [],
            cc: [],
            bcc: [],
            subject: '',
            body: '',
            accountId: accounts[0]?.id || '',
        },
    });

    const { watch, setValue, handleSubmit, formState: { errors } } = form;
    const watchedValues = watch();

    // Fetch original email if replying or forwarding
    const { data: originalEmail } = useQuery({
        queryKey: ['email', replyTo || forwardId],
        queryFn: async () => {
            const id = replyTo || forwardId;
            const response = await emailsApi.get(id!);
            return response.data;
        },
        enabled: !!(replyTo || forwardId),
    });

    // Fetch draft if editing
    const { data: draft } = useQuery({
        queryKey: ['draft', draftId],
        queryFn: async () => {
            const response = await draftsApi.get(draftId!);
            return response.data;
        },
        enabled: !!draftId,
    });

    // Pre-fill form when replying or forwarding
    useEffect(() => {
        if (originalEmail) {
            if (replyTo) {
                setValue('to', originalEmail.from_email ? [originalEmail.from_email] : []);
                setValue(
                    'subject',
                    originalEmail.subject?.startsWith('Re:')
                        ? originalEmail.subject
                        : `Re: ${originalEmail.subject || ''}`
                );
                setValue(
                    'body',
                    `<br/><br/>On ${new Date(originalEmail.received_at).toLocaleString()}, ${originalEmail.from_name || originalEmail.from_email} wrote:<br/><blockquote style="margin-left: 1em; padding-left: 1em; border-left: 2px solid #ccc;">${originalEmail.body_html || originalEmail.body_text || ''}</blockquote>`
                );
            } else if (forwardId) {
                setValue(
                    'subject',
                    originalEmail.subject?.startsWith('Fwd:')
                        ? originalEmail.subject
                        : `Fwd: ${originalEmail.subject || ''}`
                );
                setValue(
                    'body',
                    `<br/><br/>---------- Forwarded message ----------<br/>From: ${originalEmail.from_name || ''} &lt;${originalEmail.from_email}&gt;<br/>Date: ${new Date(originalEmail.received_at).toLocaleString()}<br/>Subject: ${originalEmail.subject}<br/>To: ${originalEmail.to_emails?.join(', ')}<br/><br/>${originalEmail.body_html || originalEmail.body_text || ''}`
                );
            }
        }
    }, [originalEmail, replyTo, forwardId, setValue]);

    // Pre-fill form when loading draft
    useEffect(() => {
        if (draft) {
            setValue('to', draft.to_emails || []);
            setValue('cc', draft.cc_emails || []);
            setValue('bcc', draft.bcc_emails || []);
            setValue('subject', draft.subject || '');
            setValue('body', draft.body_html || draft.body_text || '');
            setValue('accountId', draft.gmail_account_id);
            if (draft.cc_emails?.length) setShowCc(true);
            if (draft.bcc_emails?.length) setShowBcc(true);
        }
    }, [draft, setValue]);

    // Auto-save draft (debounced)
    const saveDraft = useCallback(async () => {
        if (isSaving) return;

        const values = form.getValues();
        if (!values.accountId || (!values.to.length && !values.subject && !values.body)) {
            return;
        }

        setIsSaving(true);
        try {
            if (draftId) {
                await draftsApi.update(draftId, {
                    to_emails: values.to,
                    cc_emails: values.cc,
                    bcc_emails: values.bcc,
                    subject: values.subject,
                    body_html: values.body,
                });
            } else {
                const response = await draftsApi.create({
                    gmail_account_id: values.accountId,
                    to_emails: values.to,
                    cc_emails: values.cc,
                    bcc_emails: values.bcc,
                    subject: values.subject,
                    body_html: values.body,
                    in_reply_to: replyTo || undefined,
                });
                // Update URL with draft ID for future saves
                window.history.replaceState({}, '', `/compose?draft=${response.data.id}`);
            }
            setLastSavedAt(new Date());
        } catch (error) {
            console.error('Failed to save draft:', error);
        } finally {
            setIsSaving(false);
        }
    }, [draftId, form, isSaving, replyTo]);

    // Debounced auto-save
    useEffect(() => {
        const timeout = setTimeout(() => {
            saveDraft();
        }, 3000);
        return () => clearTimeout(timeout);
    }, [watchedValues.to, watchedValues.cc, watchedValues.bcc, watchedValues.subject, watchedValues.body]);

    // Send email mutation
    const sendMutation = useMutation({
        mutationFn: async (data: ComposeFormData) => {
            return emailsApi.send({
                gmail_account_id: data.accountId,
                to_emails: data.to,
                cc_emails: data.cc || [],
                bcc_emails: data.bcc || [],
                subject: data.subject || '',
                body_html: data.body,
                in_reply_to: replyTo || undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            toast.success('Email sent!');
            navigate('/inbox');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to send email');
        },
    });

    // Schedule email mutation
    const scheduleMutation = useMutation({
        mutationFn: async ({ data, scheduledAt }: { data: ComposeFormData; scheduledAt: string }) => {
            return emailsApi.schedule({
                gmail_account_id: data.accountId,
                to_emails: data.to,
                cc_emails: data.cc || [],
                bcc_emails: data.bcc || [],
                subject: data.subject || '',
                body_html: data.body,
                scheduled_at: scheduledAt,
                in_reply_to: replyTo || undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['emails'] });
            toast.success('Email scheduled!');
            navigate('/inbox');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to schedule email');
        },
    });

    // Delete draft mutation
    const deleteDraftMutation = useMutation({
        mutationFn: async () => {
            if (draftId) {
                return draftsApi.delete(draftId);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            toast.success('Draft deleted');
            navigate('/inbox');
        },
    });

    const onSubmit = (data: ComposeFormData) => {
        sendMutation.mutate(data);
    };

    const handleSchedule = (hours: number) => {
        const scheduledAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        const data = form.getValues();
        scheduleMutation.mutate({ data, scheduledAt });
    };

    const isLoading = sendMutation.isPending || scheduleMutation.isPending;

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
                                    onClick={() => navigate(-1)}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Back</TooltipContent>
                        </Tooltip>

                        <Separator orientation="vertical" className="h-6" />

                        <h1 className="font-medium">
                            {replyTo ? 'Reply' : forwardId ? 'Forward' : draftId ? 'Edit Draft' : 'New Message'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        {lastSavedAt && (
                            <span className="text-xs text-muted-foreground">
                                {isSaving ? 'Saving...' : `Saved at ${lastSavedAt.toLocaleTimeString()}`}
                            </span>
                        )}

                        <AlertDialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Discard</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Discard message?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete this draft.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteDraftMutation.mutate()}>
                                        Discard
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* Compose Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
                    <div className="p-4 space-y-4 border-b">
                        {/* From selector */}
                        {accounts.length > 1 && (
                            <div className="flex items-center gap-4">
                                <Label className="w-16 text-right text-muted-foreground">From</Label>
                                <Select
                                    value={watchedValues.accountId}
                                    onValueChange={(value) => setValue('accountId', value)}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* To field */}
                        <div className="flex items-start gap-4">
                            <Label className="w-16 text-right text-muted-foreground mt-2">To</Label>
                            <div className="flex-1 flex items-center gap-2">
                                <RecipientInput
                                    value={watchedValues.to}
                                    onChange={(value) => setValue('to', value)}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowCc(!showCc);
                                        setShowBcc(!showBcc);
                                    }}
                                >
                                    {showCc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    Cc/Bcc
                                </Button>
                            </div>
                        </div>
                        {errors.to && (
                            <p className="text-sm text-destructive ml-20">{errors.to.message}</p>
                        )}

                        {/* Cc field */}
                        {showCc && (
                            <div className="flex items-start gap-4">
                                <Label className="w-16 text-right text-muted-foreground mt-2">Cc</Label>
                                <RecipientInput
                                    value={watchedValues.cc || []}
                                    onChange={(value) => setValue('cc', value)}
                                    className="flex-1"
                                />
                            </div>
                        )}

                        {/* Bcc field */}
                        {showBcc && (
                            <div className="flex items-start gap-4">
                                <Label className="w-16 text-right text-muted-foreground mt-2">Bcc</Label>
                                <RecipientInput
                                    value={watchedValues.bcc || []}
                                    onChange={(value) => setValue('bcc', value)}
                                    className="flex-1"
                                />
                            </div>
                        )}

                        {/* Subject field */}
                        <div className="flex items-center gap-4">
                            <Label className="w-16 text-right text-muted-foreground">Subject</Label>
                            <Input
                                {...form.register('subject')}
                                placeholder="Subject"
                                className="flex-1 border-0 focus-visible:ring-0 px-0"
                            />
                        </div>
                    </div>

                    {/* Message body */}
                    <div className="flex-1 p-4">
                        <RichTextEditor
                            content={watchedValues.body}
                            onChange={(content) => setValue('body', content)}
                            className="min-h-[300px]"
                        />
                        {errors.body && (
                            <p className="text-sm text-destructive mt-2">{errors.body.message}</p>
                        )}
                    </div>

                    {/* Bottom toolbar */}
                    <div className="border-t p-4 flex items-center justify-between bg-background">
                        <div className="flex items-center gap-2">
                            <Button type="submit" disabled={isLoading}>
                                {sendMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                Send
                            </Button>

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" disabled={isLoading}>
                                        <Clock className="h-4 w-4 mr-2" />
                                        Schedule send
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48">
                                    <div className="space-y-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => handleSchedule(1)}
                                        >
                                            In 1 hour
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => handleSchedule(4)}
                                        >
                                            In 4 hours
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => handleSchedule(24)}
                                        >
                                            Tomorrow morning
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="w-full justify-start"
                                            onClick={() => handleSchedule(168)}
                                        >
                                            Next week
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" disabled>
                                        <Paperclip className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Attach file (coming soon)</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </form>
            </div>
        </TooltipProvider>
    );
}
