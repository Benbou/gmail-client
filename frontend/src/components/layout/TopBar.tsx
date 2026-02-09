import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Menu, HelpCircle, Settings, Grip, Sun, Moon, Command } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import CommandPalette from '@/components/CommandPalette';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TopBarProps {
    onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuth();
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

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

    return (
        <TooltipProvider delayDuration={0}>
            <div className="h-16 border-b bg-background flex items-center justify-between px-4 gap-4">
                {/* Left: Menu & Logo */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={onMenuClick} className="shrink-0">
                        <Menu className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">Gmail</span>
                    </div>
                </div>

                {/* Center: Search */}
                <div className="flex-1 max-w-2xl">
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full group-focus-within:bg-white group-focus-within:shadow-sm transition-all">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Input
                            placeholder="Search mail"
                            className="pl-12 h-12 bg-secondary/50 border-0 focus-visible:ring-0 focus-visible:bg-background focus-visible:shadow-md transition-all text-base rounded-lg"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <Settings className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right: Actions & Profile */}
                <div className="flex items-center gap-1 shrink-0">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setCommandPaletteOpen(true)}
                                className="hidden sm:inline-flex"
                            >
                                <Command className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Command palette
                            <span className="ml-2 text-xs text-muted-foreground">⌘K</span>
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleTheme}
                                className="hidden sm:inline-flex"
                            >
                                {theme === 'dark' ? (
                                    <Sun className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                    <Moon className="h-5 w-5 text-muted-foreground" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
                                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Support</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="hidden sm:inline-flex"
                                onClick={() => navigate('/settings')}
                            >
                                <Settings className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Settings</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
                                <Grip className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Google Apps</TooltipContent>
                    </Tooltip>

                    <div className="ml-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 ring-offset-2 ring-primary transition-all">
                                    <AvatarImage src={user?.avatar_url} />
                                    <AvatarFallback>
                                        {getInitials(user?.name, user?.email)}
                                    </AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium">{user?.name || 'User'}</p>
                                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/settings')}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={toggleTheme}>
                                    {theme === 'dark' ? (
                                        <Sun className="mr-2 h-4 w-4" />
                                    ) : (
                                        <Moon className="mr-2 h-4 w-4" />
                                    )}
                                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={logout}>
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
            </div>
        </TooltipProvider>
    );
}
