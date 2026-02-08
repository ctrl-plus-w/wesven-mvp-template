'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import type { ReactNode } from 'react';

import { useMutation } from '@tanstack/react-query';
import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { Separator } from '@/element/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/element/sidebar';
import { TooltipProvider } from '@/element/tooltip';

import useUser from '@/hook/data/use-user';

import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import { logout } from '@/app/actions/auth';

const NAV_ITEMS = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Paramètres', href: '/dashboard/settings', icon: Settings },
];

const isRouteActive = (pathname: string, href: string): boolean => {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname.startsWith(href);
};

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const pathname = usePathname();
  const router = useRouter();

  const { data: user } = useUser();

  const { isPending, mutateAsync: logoutMutate } = useMutation({
    mutationFn: async () => await unwrapServerAction(logout()),
    onError: (err) => toast.error(getErrorMessage(err)),
    onSuccess: () => router.push('/login'),
  });

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          <SidebarContent className="mt-12">
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isRouteActive(pathname, item.href)} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarSeparator />

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                    {userInitial}
                  </div>
                  <div className="flex flex-col text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.name}</span>
                    <span className="text-muted-foreground truncate text-xs">{user?.email}</span>
                  </div>
                </div>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => logoutMutate()} disabled={isPending} tooltip="Se déconnecter">
                  <LogOut className="size-4" />
                  <span>Se déconnecter</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default DashboardLayout;
