import { Check, ChevronDown, Mail, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountStore } from '@/stores/accountStore';

interface AccountSwitcherProps {
  isCollapsed?: boolean;
}

export default function AccountSwitcher({ isCollapsed = false }: AccountSwitcherProps) {
  const { accounts, connectGmail } = useAuth();
  const { selectedAccountId, setSelectedAccount } = useAccountStore();

  // Find selected account to display in trigger
  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);
  const displayText = selectedAccount ? selectedAccount.email : 'All Accounts';
  const displayInitial = displayText.charAt(0).toUpperCase();

  const dropdownContent = (
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
  );

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 w-10 rounded-full bg-sidebar-accent hover:bg-sidebar-accent/80"
              >
                {displayInitial}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            {displayText}
          </TooltipContent>
        </Tooltip>
        {dropdownContent}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 w-full bg-sidebar border-sidebar-border hover:bg-sidebar-accent">
          <Mail className="h-4 w-4" />
          <span className="flex-1 text-left truncate">{displayText}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      {dropdownContent}
    </DropdownMenu>
  );
}
