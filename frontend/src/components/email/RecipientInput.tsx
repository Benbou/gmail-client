import { useState, useRef, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface RecipientInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    className?: string;
}

export default function RecipientInput({
    value,
    onChange,
    placeholder = 'Add recipients',
    className,
}: RecipientInputProps) {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const addEmail = (email: string) => {
        const trimmedEmail = email.trim().toLowerCase();
        if (trimmedEmail && isValidEmail(trimmedEmail) && !value.includes(trimmedEmail)) {
            onChange([...value, trimmedEmail]);
        }
        setInputValue('');
    };

    const removeEmail = (emailToRemove: string) => {
        onChange(value.filter((email) => email !== emailToRemove));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            e.preventDefault();
            if (inputValue) {
                addEmail(inputValue);
            }
        } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
            removeEmail(value[value.length - 1]);
        }
    };

    const handleBlur = () => {
        if (inputValue) {
            addEmail(inputValue);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const emails = pastedText.split(/[,;\s]+/).filter(Boolean);
        const validEmails = emails.filter(
            (email) => isValidEmail(email) && !value.includes(email.toLowerCase())
        );
        if (validEmails.length > 0) {
            onChange([...value, ...validEmails.map((e) => e.toLowerCase())]);
        }
    };

    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-1 min-h-10 px-3 py-2 rounded-md border border-input bg-background cursor-text',
                className
            )}
            onClick={() => inputRef.current?.focus()}
        >
            {value.map((email) => (
                <Badge
                    key={email}
                    variant="secondary"
                    className="gap-1 pr-1"
                >
                    {email}
                    <button
                        type="button"
                        className="ml-1 rounded-full hover:bg-muted p-0.5"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeEmail(email);
                        }}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            ))}
            <Input
                ref={inputRef}
                type="email"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onPaste={handlePaste}
                placeholder={value.length === 0 ? placeholder : ''}
                className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
        </div>
    );
}
