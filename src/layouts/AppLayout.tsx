import { Link, Outlet, useLocation } from 'react-router'
import { Blocks, Home } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { toolHref, tools } from '@/data/tools'
import type { Tool, ToolCategory } from '@/data/tools'

const CATEGORY_ORDER: readonly ToolCategory[] = [
  'Wallet',
  'Address',
  'Amount',
  'Crypto',
  'Encoding',
  'Contract',
  'Network',
] as const

function groupByCategory(items: readonly Tool[]): Array<[ToolCategory, Tool[]]> {
  const map = new Map<ToolCategory, Tool[]>()
  for (const tool of items) {
    const bucket = map.get(tool.category) ?? []
    bucket.push(tool)
    map.set(tool.category, bucket)
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => [c, map.get(c)!])
}

export function AppLayout() {
  return (
    <TooltipProvider delayDuration={150}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <TopBar />
          <div className="flex-1">
            <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
              <Outlet />
            </div>
          </div>
          <SiteFooter />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

function AppSidebar() {
  const { pathname } = useLocation()
  const grouped = groupByCategory(tools)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          to="/"
          className="flex items-center gap-2 px-2 py-1.5 text-sidebar-foreground"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Blocks className="size-4" />
          </span>
          <span className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Blockchain Dev Utils</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              developer toolbox · v0.1
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/'}
                  tooltip="Home"
                >
                  <Link to="/">
                    <Home className="size-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {grouped.map(([category, items]) => (
          <SidebarGroup key={category}>
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-wider">
              {category}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((tool) => {
                  const Icon = tool.icon
                  const href = toolHref(tool.slug)
                  return (
                    <SidebarMenuItem key={tool.slug}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === href}
                        tooltip={tool.name}
                      >
                        <Link to={href}>
                          <Icon className="size-4" />
                          <span className="truncate">{tool.name}</span>
                          {tool.status === 'soon' && (
                            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
                              soon
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center px-2 py-1 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <span className="font-mono">
            {tools.filter((t) => t.status === 'ready').length}/{tools.length} ready
          </span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function TopBar() {
  const { pathname } = useLocation()
  const crumb = buildCrumb(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link
          to="/"
          className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          /
        </Link>
        {crumb && (
          <>
            <span className="text-muted-foreground">›</span>
            <span className="font-medium">{crumb}</span>
          </>
        )}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <Badge
          variant="outline"
          className="hidden font-mono text-[10px] uppercase tracking-wider sm:inline-flex"
        >
          alpha
        </Badge>
      </div>
    </header>
  )
}

function buildCrumb(pathname: string): string | null {
  if (pathname === '/' || pathname === '') return null
  const match = pathname.match(/^\/tools\/([^/]+)/)
  if (!match) return pathname
  const slug = match[1]
  const tool = tools.find((t) => t.slug === slug)
  return tool ? tool.name : slug
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-2 px-4 py-6 font-mono text-[11px] uppercase tracking-wider text-muted-foreground sm:flex-row sm:items-center sm:px-6">
        <span>© {new Date().getFullYear()} blockchain dev utils</span>
        <span>react · vite · shadcn/ui</span>
      </div>
    </footer>
  )
}
