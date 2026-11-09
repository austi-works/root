import { Link, useMatchRoute } from '@tanstack/react-router';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@workspace/ui/components/ui/sidebar';
import { ClipboardCheck, LayoutDashboard, Megaphone, Sparkles } from 'lucide-react';

import type { NavItem } from '#/components/navigation/nav-types';
import { Route as BrandRoute } from '#/routes/_app.brand';
import { Route as CampaignsRoute } from '#/routes/_app.campaigns';
import { Route as IndexRoute } from '#/routes/_app.index';
import { Route as ReviewRoute } from '#/routes/_app.review';

const items: NavItem[] = [
  { title: 'Workspace', route: IndexRoute, icon: LayoutDashboard },
  { title: 'Brand', route: BrandRoute, icon: Sparkles },
  { title: 'Campaigns', route: CampaignsRoute, icon: Megaphone },
  { title: 'Review', route: ReviewRoute, icon: ClipboardCheck },
];

export function NavMain() {
  const matchRoute = useMatchRoute();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ title, route, matchRoutes = [route], icon: Icon }) => (
            <SidebarMenuItem key={title}>
              <SidebarMenuButton
                tooltip={title}
                isActive={matchRoutes.some(({ to }) => !!matchRoute({ to, fuzzy: to !== '/' }))}
                render={<Link to={route.to} onClick={() => setOpenMobile(false)} />}
              >
                <Icon />
                <span>{title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
