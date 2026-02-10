import { useState } from 'react';
import { format } from 'date-fns';
import {
    Mail,
    Trash2,
    Plus,
    Sun,
    Moon,
    Monitor,
    Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import type { GmailAccount } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export default function SettingsPage() {
    const { user, accounts, connectGmail, disconnectGmail } = useAuth();
    const { theme, setTheme } = useTheme();

    return (
        <div className="h-full bg-background">
            <ScrollArea className="h-full">
                <div className="max-w-4xl mx-auto p-6">
                    <h1 className="text-2xl font-bold mb-6">Settings</h1>

                    <Tabs defaultValue="accounts" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="accounts">Accounts</TabsTrigger>
                            <TabsTrigger value="appearance">Appearance</TabsTrigger>
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                        </TabsList>

                        {/* Accounts Tab */}
                        <TabsContent value="accounts" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Connected Gmail Accounts</CardTitle>
                                    <CardDescription>
                                        Manage your connected Gmail accounts. Sync is handled automatically.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {accounts.length === 0 ? (
                                        <div className="text-center py-6 text-muted-foreground">
                                            <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No Gmail accounts connected</p>
                                            <p className="text-sm">Connect a Gmail account to get started</p>
                                        </div>
                                    ) : (
                                        accounts.map((account) => (
                                            <AccountCard
                                                key={account.id}
                                                account={account}
                                                onDisconnect={() => disconnectGmail(account.id)}
                                            />
                                        ))
                                    )}

                                    <Separator />

                                    <Button onClick={connectGmail} className="w-full">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Connect Gmail Account
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Appearance Tab */}
                        <TabsContent value="appearance" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Theme</CardTitle>
                                    <CardDescription>
                                        Select your preferred color theme
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4">
                                        <ThemeOption
                                            icon={Sun}
                                            label="Light"
                                            value="light"
                                            current={theme}
                                            onClick={() => setTheme('light')}
                                        />
                                        <ThemeOption
                                            icon={Moon}
                                            label="Dark"
                                            value="dark"
                                            current={theme}
                                            onClick={() => setTheme('dark')}
                                        />
                                        <ThemeOption
                                            icon={Monitor}
                                            label="System"
                                            value="system"
                                            current={theme}
                                            onClick={() => setTheme('system')}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Display Preferences</CardTitle>
                                    <CardDescription>
                                        Customize how emails are displayed
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Compact view</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Show more emails per page
                                            </p>
                                        </div>
                                        <Switch />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Show email snippets</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Display preview text in email list
                                            </p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>
                                    <Separator />
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Keyboard shortcuts</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Enable keyboard navigation
                                            </p>
                                        </div>
                                        <Switch defaultChecked />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Profile Tab */}
                        <TabsContent value="profile" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Profile Information</CardTitle>
                                    <CardDescription>
                                        Manage your profile details
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            defaultValue={user?.name || ''}
                                            placeholder="Your name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            defaultValue={user?.email || ''}
                                            disabled
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            This is your primary account email
                                        </p>
                                    </div>
                                    <Button>Save Changes</Button>
                                </CardContent>
                            </Card>

                            <Card className="border-destructive">
                                <CardHeader>
                                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                                    <CardDescription>
                                        Irreversible actions
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive">
                                                Delete Account
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete your
                                                    account and remove all your data from our servers.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                    Delete Account
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </ScrollArea>
        </div>
    );
}

interface AccountCardProps {
    account: GmailAccount;
    onDisconnect: () => void;
}

function AccountCard({ account, onDisconnect }: AccountCardProps) {
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        try {
            await onDisconnect();
            toast.success('Account disconnected');
        } catch {
            toast.error('Failed to disconnect account');
        } finally {
            setIsDisconnecting(false);
        }
    };

    const statusBadge = () => {
        if (!account.is_active) return <Badge variant="secondary" className="text-xs">Inactive</Badge>;
        switch (account.sync_status) {
            case 'connected': return <Badge variant="default" className="text-xs">Connected</Badge>;
            case 'connecting': return <Badge variant="secondary" className="text-xs">Connecting...</Badge>;
            case 'authenticationError': return <Badge variant="destructive" className="text-xs">Auth Error</Badge>;
            default: return <Badge variant="default" className="text-xs">Active</Badge>;
        }
    };

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="font-medium">{account.email}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {statusBadge()}
                        <span>Connected {format(new Date(account.created_at), 'MMM d, yyyy')}</span>
                    </div>
                </div>
            </div>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect {account.email}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the Gmail account from your connected accounts.
                            Your emails will no longer be accessible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDisconnect}
                            disabled={isDisconnecting}
                        >
                            {isDisconnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Disconnect
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

interface ThemeOptionProps {
    icon: React.ElementType;
    label: string;
    value: string;
    current: string;
    onClick: () => void;
}

function ThemeOption({ icon: Icon, label, value, current, onClick }: ThemeOptionProps) {
    const isActive = current === value;

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted/50'
            }`}
        >
            <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${isActive ? '' : 'text-muted-foreground'}`}>
                {label}
            </span>
        </button>
    );
}
