'use client'

import { Navbar, NavbarSpacer } from '@/components/navbar'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from '@/components/sidebar'
import { SidebarLayout } from '@/components/sidebar-layout'
import {
  Cog6ToothIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  Square2StackIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/20/solid'
import { usePathname } from 'next/navigation'

export function ApplicationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let pathname = usePathname()

  return (
    <SidebarLayout
      navbar={
        <Navbar>
          <NavbarSpacer />
        </Navbar>
      }
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <SidebarItem>
              <BuildingStorefrontIcon />
              <SidebarLabel>Competitor Dashboard</SidebarLabel>
            </SidebarItem>
          </SidebarHeader>

          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/" current={pathname === '/'}>
                <HomeIcon />
                <SidebarLabel>Dashboard</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/competitors" current={pathname.startsWith('/competitors')}>
                <BuildingStorefrontIcon />
                <SidebarLabel>Competitors</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/comparison-items" current={pathname.startsWith('/comparison-items')}>
                <ClipboardDocumentListIcon />
                <SidebarLabel>Comparison Items</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/price-comparison" current={pathname.startsWith('/price-comparison')}>
                <Square2StackIcon />
                <SidebarLabel>Price Comparison</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/alerts" current={pathname.startsWith('/alerts')}>
                <ExclamationTriangleIcon />
                <SidebarLabel>Alerts</SidebarLabel>
              </SidebarItem>
            </SidebarSection>

            <SidebarSpacer />

            <SidebarSection>
              <SidebarItem href="/settings" current={pathname.startsWith('/settings')}>
                <Cog6ToothIcon />
                <SidebarLabel>Settings</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/help" current={pathname.startsWith('/help')}>
                <QuestionMarkCircleIcon />
                <SidebarLabel>Help & Support</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>
        </Sidebar>
      }
    >
      {children}
    </SidebarLayout>
  )
}
