import * as React from 'react'
import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Inbox,
  Send,
  Clock,
  File,
  Trash2,
  AlertCircle,
  Star,
  Archive,
  Mail,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAccountStore } from '@/stores/accountStore'
import { labelsApi } from '@/lib/api'
import type { Label } from '@/types'
import { NavUser } from './NavUser'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

const navItems = [
  { title: 'Inbox', url: '/inbox', icon: Inbox },
  { title: 'Starred', url: '/starred', icon: Star },
  { title: 'Snoozed', url: '/snoozed', icon: Clock },
  { title: 'Sent', url: '/sent', icon: Send },
  { title: 'Drafts', url: '/drafts', icon: File },
  { title: 'Spam', url: '/spam', icon: AlertCircle },
  { title: 'Trash', url: '/trash', icon: Trash2 },
  { title: 'All Mail', url: '/archived', icon: Archive },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navigate = useNavigate()
  const { setOpen } = useSidebar()
  const { accounts } = useAuth()
  const { selectedAccountId } = useAccountStore()

  const { data: labelsData, isLoading: labelsLoading } = useQuery({
    queryKey: ['labels', selectedAccountId, accounts.map((a) => a.id).join(',')],
    queryFn: async () => {
      if (selectedAccountId) {
        const response = await labelsApi.list(selectedAccountId)
        return { type: 'single' as const, data: response.data.labels }
      } else if (accounts.length > 0) {
        const labelPromises = accounts.map(async (acc) => {
          const response = await labelsApi.list(acc.id)
          return {
            accountId: acc.id,
            accountEmail: acc.email,
            labels: response.data.labels,
          }
        })
        return { type: 'multi' as const, data: await Promise.all(labelPromises) }
      }
      return { type: 'none' as const, data: [] }
    },
    enabled: accounts.length > 0,
  })

  const activeTitle =
    navItems.find((i) => location.pathname.startsWith(i.url))?.title || 'Mail'

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
      {...props}
    >
      {/* First sidebar: icon strip */}
      <Sidebar
        collapsible="none"
        className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Mail className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Gmail</span>
                    <span className="truncate text-xs">Client</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{ children: item.title, hidden: false }}
                      onClick={() => {
                        navigate(item.url)
                        setOpen(true)
                      }}
                      isActive={location.pathname.startsWith(item.url)}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* Second sidebar: content panel */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-base font-medium text-foreground">
              {activeTitle}
            </div>
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <NavLink to="/compose">
                <Plus className="h-4 w-4" />
              </NavLink>
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Labels</SidebarGroupLabel>
            <SidebarGroupContent>
              {labelsLoading && (
                <div className="px-2 py-2 space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              )}

              {/* Multi-account labels */}
              {labelsData?.type === 'multi' &&
                labelsData.data.map((accountLabels) => {
                  const userLabels = accountLabels.labels.filter(
                    (l: Label) => l.type === 'user' && l.is_visible
                  )
                  if (userLabels.length === 0) return null
                  return (
                    <div key={accountLabels.accountId} className="mb-2">
                      <div className="text-xs text-muted-foreground px-2 py-1 font-medium">
                        {accountLabels.accountEmail.split('@')[0]}
                      </div>
                      {userLabels.map((label: Label) => (
                        <LabelItem
                          key={`${accountLabels.accountId}-${label.id}`}
                          label={label}
                        />
                      ))}
                    </div>
                  )
                })}

              {/* Single-account labels */}
              {labelsData?.type === 'single' &&
                (() => {
                  const userLabels = labelsData.data.filter(
                    (l: Label) => l.type === 'user' && l.is_visible
                  )
                  return userLabels.length > 0 ? (
                    userLabels.map((label: Label) => (
                      <LabelItem key={label.id} label={label} />
                    ))
                  ) : (
                    <div className="px-2 py-2 text-sm text-muted-foreground">
                      No custom labels
                    </div>
                  )
                })()}

              {labelsData?.type === 'none' && (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  Connect a Gmail account
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}

function LabelItem({ label }: { label: Label }) {
  return (
    <NavLink
      to={`/label/${label.id}`}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        }`
      }
    >
      <div
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: label.color || '#6b7280' }}
      />
      <span className="truncate flex-1">{label.name}</span>
      {label.message_count > 0 && (
        <span className="text-xs text-muted-foreground">
          {label.message_count}
        </span>
      )}
    </NavLink>
  )
}
