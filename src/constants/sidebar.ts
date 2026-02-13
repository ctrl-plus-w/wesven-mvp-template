import type { FC } from 'react';

import { LayoutDashboard, Settings } from 'lucide-react';

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  label: string;
  href: string;
  icon: FC;
  shouldPrefetch?: boolean;
}

const SIDEBAR: SidebarGroup[] = [
  {
    label: 'Navigation',
    items: [
      { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard, shouldPrefetch: true },
      { label: 'Paramètres', href: '/dashboard/settings', icon: Settings, shouldPrefetch: true },
    ],
  },
];

export default SIDEBAR;
