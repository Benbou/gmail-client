import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, HelpCircle, Settings, Sun, Moon, Command } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import CommandPalette from '@/components/CommandPalette';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function TopBar() {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <TooltipProvider delayDuration={0}>
            <header className="sticky top-0 flex shrink-0 items-center justify-between border-b bg-background px-4 h-14 gap-4">
                {/* Left: Sidebar trigger */}
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
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

                {/* Right: Actions */}
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
                </div>

                <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
            </header>
        </TooltipProvider>
    );
}
