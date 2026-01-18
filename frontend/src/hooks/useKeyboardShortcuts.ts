import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutHandlers {
    onCompose?: () => void;
    onArchive?: () => void;
    onDelete?: () => void;
    onReply?: () => void;
    onForward?: () => void;
    onMarkRead?: () => void;
    onStar?: () => void;
    onSearch?: () => void;
    onCommandPalette?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers = {}) {
    const navigate = useNavigate();

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Ignore if user is typing in an input field
        const target = event.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            // Only allow Cmd/Ctrl+K for command palette even in inputs
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                handlers.onCommandPalette?.();
            }
            return;
        }

        // Cmd/Ctrl + K: Command palette
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault();
            handlers.onCommandPalette?.();
            return;
        }

        // Single key shortcuts (only when not in input)
        switch (event.key.toLowerCase()) {
            case 'c':
                // Compose new email
                if (!event.metaKey && !event.ctrlKey) {
                    event.preventDefault();
                    if (handlers.onCompose) {
                        handlers.onCompose();
                    } else {
                        navigate('/compose');
                    }
                }
                break;
            case 'e':
                // Archive
                event.preventDefault();
                handlers.onArchive?.();
                break;
            case '#':
            case 'delete':
            case 'backspace':
                // Delete (Shift+3 = #)
                if (event.key === '#' || event.shiftKey) {
                    event.preventDefault();
                    handlers.onDelete?.();
                }
                break;
            case 'r':
                // Reply
                event.preventDefault();
                handlers.onReply?.();
                break;
            case 'f':
                // Forward
                event.preventDefault();
                handlers.onForward?.();
                break;
            case 'i':
            case 'u':
                // Mark as read (i) / unread (u)
                event.preventDefault();
                handlers.onMarkRead?.();
                break;
            case 's':
                // Star
                event.preventDefault();
                handlers.onStar?.();
                break;
            case '/':
                // Focus search
                event.preventDefault();
                handlers.onSearch?.();
                break;
            case 'escape':
                // Go back to inbox
                navigate('/inbox');
                break;
        }
    }, [handlers, navigate]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
