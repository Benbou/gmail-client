import { useNavigate } from 'react-router-dom';
import { Mail, Archive, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Email } from '@/types';

interface EmailListItemProps {
    email: Email;
    onArchive: () => void;
    onToggleRead: () => void;
}

export default function EmailListItem({
    email,
    onArchive,
    onToggleRead,
}: EmailListItemProps) {
    const navigate = useNavigate();

    const timeAgo = email.received_at
        ? formatDistanceToNow(new Date(email.received_at), { addSuffix: true })
        : '';

    return (
        <Card
            className={`m-4 p-4 cursor-pointer hover:shadow-md transition-shadow ${email.is_read ? 'bg-background' : 'bg-accent/10 border-primary/20'
                }`}
            onClick={() => navigate(`/email/${email.id}`)}
        >
            <div className="flex items-start gap-4">
                {/* Read/Unread Indicator */}
                <div className="flex-shrink-0 pt-1">
                    {!email.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                </div>

                {/* Email Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`font-semibold ${!email.is_read ? 'font-bold' : ''}`}>
                                    {email.from_name || email.from_email}
                                </span>
                            </div>

                            <h3 className={`text-sm mt-1 ${!email.is_read ? 'font-semibold' : ''}`}>
                                {email.subject || '(no subject)'}
                            </h3>

                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {email.snippet}
                            </p>
                        </div>

                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {timeAgo}
                            </span>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onArchive();
                                    }}
                                >
                                    <Archive className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
