import type { ReactNode } from 'react';

import { LayoutDashboard, Settings } from 'lucide-react';

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  label: string;
  href: string;
  /**
   * Rendered into `SideNavItem`'s icon slot, which sizes and colors it. Stored
   * as an element rather than a component so the icon set stays a detail of
   * this file — the layout never imports from lucide.
   */
  icon: ReactNode;
  shouldPrefetch?: boolean;
}

const iconProps = { size: '1em', 'aria-hidden': true } as const;

const SIDEBAR: SidebarGroup[] = [
  {
    label: 'Navigation',
    items: [
      {
        label: 'Tableau de bord',
        href: '/dashboard',
        icon: <LayoutDashboard {...iconProps} />,
        shouldPrefetch: true,
      },
      {
        label: 'Paramètres',
        href: '/dashboard/settings',
        icon: <Settings {...iconProps} />,
        shouldPrefetch: true,
      },
    ],
  },
];

export default SIDEBAR;
