import { Check, ChevronDown, Mail, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountStore } from '@/stores/accountStore';

export default function AccountSwitcher() {
  const { accounts, connectGmail } = useAuth();
  const { selectedAccountId, setSelectedAccount } = useAccountStore();

  // Find selected account to display in trigger
  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);
  const displayText = selectedAccount ? selectedAccount.email : 'All Accounts';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[180px]">
          <Mail className="h-4 w-4" />
          <span className="flex-1 text-left truncate">{displayText}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuItem
          onClick={() => setSelectedAccount(null)}
          className="flex items-center justify-between cursor-pointer"
        >
          <span>All Accounts</span>
          {selectedAccountId === null && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        {accounts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {accounts.map((account) => (
              <DropdownMenuItem
                key={account.id}
                onClick={() => setSelectedAccount(account.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="truncate">{account.email}</span>
                {selectedAccountId === account.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => connectGmail()} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Connect Another Gmail
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
