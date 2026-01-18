import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    Mail,
    RefreshCw,
    Trash2,
    Plus,
    Sun,
    Moon,
    Monitor,
    Loader2,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { accountsApi, syncApi } from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';
import type { GmailAccount, SyncLog } from '@/types';
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
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="accounts">Accounts</TabsTrigger>
                            <TabsTrigger value="sync">Sync</TabsTrigger>
                            <TabsTrigger value="appearance">Appearance</TabsTrigger>
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                        </TabsList>

                        {/* Accounts Tab */}
                        <TabsContent value="accounts" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Connected Gmail Accounts</CardTitle>
                                    <CardDescription>
                                        Manage your connected Gmail accounts
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

                        {/* Sync Tab */}
                        <TabsContent value="sync" className="space-y-4">
                            {accounts.map((account) => (
                                <SyncCard key={account.id} account={account} />
                            ))}

                            {accounts.length === 0 && (
                                <Card>
                                    <CardContent className="py-6 text-center text-muted-foreground">
                                        Connect a Gmail account to manage sync settings
                                    </CardContent>
                                </Card>
                            )}
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

                            <Card>
                                <CardHeader>
                                    <CardTitle>Notification Email</CardTitle>
                                    <CardDescription>
                                        Where to send important notifications
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="notification-email">Notification Email</Label>
                                        <Input
                                            id="notification-email"
                                            type="email"
                                            defaultValue={user?.email || ''}
                                            placeholder="notifications@example.com"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Email notifications</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Receive sync status updates
                                            </p>
                                        </div>
                                        <Switch />
                                    </div>
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
        } catch (error) {
            toast.error('Failed to disconnect account');
        } finally {
            setIsDisconnecting(false);
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
                        {account.is_active ? (
                            <Badge variant="default" className="text-xs">Active</Badge>
                        ) : (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                        {account.last_sync_at && (
                            <span>Last synced: {format(new Date(account.last_sync_at), 'MMM d, h:mm a')}</span>
                        )}
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
                            Your emails will no longer sync.
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

interface SyncCardProps {
    account: GmailAccount;
}

function SyncCard({ account }: SyncCardProps) {
    const queryClient = useQueryClient();

    // Fetch sync logs
    const { data: logsData } = useQuery({
        queryKey: ['syncLogs', account.id],
        queryFn: async () => {
            const response = await syncApi.getLogs(account.id, 5);
            return response.data;
        },
    });

    // Toggle sync mutation
    const toggleSyncMutation = useMutation({
        mutationFn: (enabled: boolean) =>
            accountsApi.update(account.id, { sync_enabled: enabled }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            toast.success('Sync settings updated');
        },
    });

    // Trigger sync mutation
    const triggerSyncMutation = useMutation({
        mutationFn: () => syncApi.trigger(account.id, 'delta'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['syncLogs', account.id] });
            toast.success('Sync started');
        },
        onError: () => {
            toast.error('Failed to start sync');
        },
    });

    const logs: SyncLog[] = logsData?.logs || [];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">{account.email}</CardTitle>
                        <CardDescription>
                            {account.sync_enabled ? 'Sync enabled' : 'Sync disabled'}
                        </CardDescription>
                    </div>
                    <Switch
                        checked={account.sync_enabled}
                        onCheckedChange={(checked) => toggleSyncMutation.mutate(checked)}
                        disabled={toggleSyncMutation.isPending}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {account.last_sync_at
                            ? `Last synced: ${format(new Date(account.last_sync_at), 'MMM d, yyyy h:mm a')}`
                            : 'Never synced'}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerSyncMutation.mutate()}
                        disabled={triggerSyncMutation.isPending || !account.sync_enabled}
                    >
                        {triggerSyncMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Sync Now
                    </Button>
                </div>

                {logs.length > 0 && (
                    <>
                        <Separator />
                        <div>
                            <h4 className="text-sm font-medium mb-2">Recent Sync Activity</h4>
                            <div className="space-y-2">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            {log.status === 'success' && (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            )}
                                            {log.status === 'failed' && (
                                                <XCircle className="h-4 w-4 text-destructive" />
                                            )}
                                            {log.status === 'running' && (
                                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            )}
                                            <span className="capitalize">{log.sync_type} sync</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-muted-foreground">
                                            <span>{log.emails_synced} emails</span>
                                            <span>{format(new Date(log.started_at), 'h:mm a')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
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
