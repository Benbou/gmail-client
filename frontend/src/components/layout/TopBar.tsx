import { Search, RefreshCw, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function TopBar() {
    return (
        <div className="h-16 border-b bg-card flex items-center justify-between px-6">
            {/* Search */}
            <div className="flex-1 max-w-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search emails..."
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                    <RefreshCw className="h-5 w-5" />
                </Button>

                <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
