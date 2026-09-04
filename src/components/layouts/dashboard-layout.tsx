'use client';

import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { type ReactNode, useEffect } from 'react';

import { AppShell } from '@astryxdesign/core/AppShell';
import { Avatar } from '@astryxdesign/core/Avatar';
import { HStack } from '@astryxdesign/core/HStack';
import { MobileNav } from '@astryxdesign/core/MobileNav';
import { SideNav, SideNavItem, SideNavRenderContext, SideNavSection } from '@astryxdesign/core/SideNav';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { VStack } from '@astryxdesign/core/VStack';
import { useMutation } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';

import useGetUser from '@/hook/data/use-user';

import { unwrapServerAction } from '@/util/server';
import { getErrorMessage } from '@/util/string';

import SIDEBAR from '@/constant/sidebar';

import { logout } from '@/app/actions/auth';

/**
 * `/dashboard` is the only exact match — every other entry owns its subtree,
 * so `/dashboard/settings` must not light up the dashboard link as well.
 */
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
  const showToast = useToast();

  const { data: user } = useGetUser();

  const { isPending, mutateAsync: logoutMutate } = useMutation({
    mutationFn: async () => await unwrapServerAction(logout()),
    onError: (err) => showToast({ type: 'error', body: getErrorMessage(err) }),
    onSuccess: () => router.push('/login'),
  });

  useEffect(() => {
    const prefetchItems = SIDEBAR.flatMap((group) => group.items).filter((item) => item.shouldPrefetch);
    for (const item of prefetchItems) router.prefetch(item.href);
  }, [router]);

  /**
   * Astryx's drawer footer positions itself with `margin-block-start: auto`,
   * which needs a flex parent — and `MobileNav`'s content area is a plain
   * block, so the footer lands directly under the last nav item instead of at
   * the bottom. Supplying the flex column here is what puts the user block and
   * the sign-out button where they sit on desktop.
   */
  const drawerFill = { display: 'flex', flexDirection: 'column', minHeight: '100%' } as const;

  const sideNav = (
    <SideNav
      footer={
        <VStack gap={1}>
          <HStack gap={2} align="center" paddingInline={2} paddingBlock={1}>
            <Avatar name={user?.name} size="sm" />
            <VStack gap={0}>
              <Text size="sm" weight="medium" maxLines={1}>
                {user?.name}
              </Text>
              <Text size="xsm" color="secondary" maxLines={1}>
                {user?.email}
              </Text>
            </VStack>
          </HStack>

          <SideNavItem
            label="Se déconnecter"
            icon={<LogOut size="1em" aria-hidden />}
            isDisabled={isPending}
            onClick={() => logoutMutate()}
          />
        </VStack>
      }
    >
      {SIDEBAR.map((group) => (
        <SideNavSection key={group.label} title={group.label}>
          {group.items.map((item) => (
            <SideNavItem
              key={item.href}
              as={NextLink}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isSelected={isRouteActive(pathname, item.href)}
            />
          ))}
        </SideNavSection>
      ))}
    </SideNav>
  );

  /**
   * The same `sideNav` element, re-rendered in `drawer-content` mode inside a
   * drawer this layout owns. Handing `AppShell` a `mobileNav` of our own is
   * what buys the wrapper above; the automatic drawer gives no way in.
   */
  const mobileNav = (
    <MobileNav>
      <div style={drawerFill}>
        <SideNavRenderContext value="drawer-content">{sideNav}</SideNavRenderContext>
      </div>
    </MobileNav>
  );

  return (
    <AppShell sideNav={sideNav} mobileNav={mobileNav} contentPadding={4}>
      <VStack gap={4}>{children}</VStack>
    </AppShell>
  );
};

export default DashboardLayout;
