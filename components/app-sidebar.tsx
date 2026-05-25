"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEmpresa } from "@/components/empresa-context"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  CreditCard,
  BarChart3,
  Building2,
  Users,
  Package,
  Plus,
} from "lucide-react"

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/",               icon: LayoutDashboard },
  { label: "Órdenes",       href: "/ordenes",        icon: FileText },
  { label: "Nueva orden",   href: "/ordenes/nueva",  icon: Plus },
  { label: "Autorizaciones",href: "/autorizaciones", icon: CheckSquare },
  { label: "Pagos",         href: "/pagos",          icon: CreditCard },
  { label: "Reportes",      href: "/reportes",       icon: BarChart3 },
]

const ADMIN_ITEMS: NavItem[] = [
  { label: "Empresas",    href: "/admin/empresas",    icon: Building2 },
  { label: "Usuarios",    href: "/admin/usuarios",    icon: Users },
  { label: "Proveedores", href: "/admin/proveedores", icon: Package },
]

type Props = {
  userRole: string
}

export function AppSidebar({ userRole: _ }: Props) {
  const pathname = usePathname()
  const { empresaActual } = useEmpresa()
  const color = empresaActual?.colorPrimario ?? "#E8700A"

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <Sidebar className="print:hidden">
      <SidebarHeader className="px-4 py-3 border-b">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            P
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none truncate">PagoCore</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {empresaActual?.nombreComercial ?? "—"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    style={isActive(item.href) ? { color, backgroundColor: `${color}15` } : {}}
                    render={<Link href={item.href} className="gap-2.5 flex items-center" />}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    style={isActive(item.href) ? { color, backgroundColor: `${color}15` } : {}}
                    render={<Link href={item.href} className="gap-2.5 flex items-center" />}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
