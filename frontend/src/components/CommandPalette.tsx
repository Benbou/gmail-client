import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Inbox,
    Send,
    Archive,
    File,
    Settings,
    Plus,
    Search,
    Star,
    Trash2,
    Clock,
    Sun,
    Moon,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';

interface CommandPaletteProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();

    const isOpen = controlledOpen !== undefined ? controlledOpen : open;
    const setIsOpen = onOpenChange || setOpen;

    // Handle keyboard shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen(!isOpen);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [isOpen, setIsOpen]);

    const runCommand = useCallback((command: () => void) => {
        setIsOpen(false);
        command();
    }, [setIsOpen]);

    return (
        <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Quick Actions">
                    <CommandItem
                        onSelect={() => runCommand(() => navigate('/compose'))}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Compose new email</span>
                        <CommandShortcut>C</CommandShortcut>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => {
                            const searchInput = document.querySelector('input[placeholder="Search mail"]') as HTMLInputElement;
                            searchInput?.focus();
                        })}
                    >
                        <Search className="mr-2 h-4 w-4" />
                        <span>Search emails</span>
                        <CommandShortcut>/</CommandShortcut>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Navigation">
                    <CommandItem
                        onSelect={() => runCommand(() => navigate('/inbox'))}
                    >
                        <Inbox className="mr-2 h-4 w-4" />
                        <span>Go to Inbox</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => navigate('/starred'))}
                    >
                        <Star className="mr-2 h-4 w-4" />
                        <span>Go to Starred</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => navigate('/snoozed'))}
                    >
                        <Clock className="mr-2 h-4 w-4" />
                        <span>Go to Snoozed</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => navigate('/sent'))}
                    >
                        <Send className="mr-2 h-4 w-4" />
                        <span>Go to Sent</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => navigate('/drafts'))}
                    >
                        <File className="mr-2 h-4 w-4" />
                        <span>Go to Drafts</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => navigate('/archived'))}
                    >
                        <Archive className="mr-2 h-4 w-4" />
                        <span>Go to All Mail</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => navigate('/trash'))}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Go to Trash</span>
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => navigate('/settings'))}
                    >
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Open Settings</span>
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Theme">
                    <CommandItem
                        onSelect={() => runCommand(() => setTheme('light'))}
                    >
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light mode</span>
                        {theme === 'light' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
                    </CommandItem>
                    <CommandItem
                        onSelect={() => runCommand(() => setTheme('dark'))}
                    >
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark mode</span>
                        {theme === 'dark' && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
                    </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Keyboard Shortcuts">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex justify-between">
                                <span>Compose</span>
                                <kbd className="bg-muted px-1.5 rounded text-xs">C</kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Archive</span>
                                <kbd className="bg-muted px-1.5 rounded text-xs">E</kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Reply</span>
                                <kbd className="bg-muted px-1.5 rounded text-xs">R</kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Forward</span>
                                <kbd className="bg-muted px-1.5 rounded text-xs">F</kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Delete</span>
                                <kbd className="bg-muted px-1.5 rounded text-xs">#</kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Star</span>
                                <kbd className="bg-muted px-1.5 rounded text-xs">S</kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Search</span>
                                <kbd className="bg-muted px-1.5 rounded text-xs">/</kbd>
                            </div>
                            <div className="flex justify-between">
                                <span>Command</span>
                                <kbd className="bg-muted px-1.5 rounded text-xs">⌘K</kbd>
                            </div>
                        </div>
                    </div>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
