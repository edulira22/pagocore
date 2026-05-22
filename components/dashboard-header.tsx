"use client"

import { useEmpresa } from "@/components/empresa-context"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, LogOut, User, Building2 } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"

type Props = {
  userName: string
  userRole: string
}

const ROL_LABELS: Record<string, string> = {
  ADMIN_SISTEMA: "Admin Sistema",
  ADMINISTRADORA: "Administradora",
  DIRECTOR: "Director",
  PRESIDENTE: "Presidente",
}

export function DashboardHeader({ userName, userRole }: Props) {
  const { empresaActual, empresas, setEmpresaActual } = useEmpresa()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const color = empresaActual?.colorPrimario ?? "#E8700A"

  return (
    <header
      className="flex h-14 items-center gap-3 border-b px-4 print:hidden"
      style={{ borderBottomColor: `${color}22` }}
    >
      <SidebarTrigger className="-ml-1" />

      {/* Selector de empresa */}
      {empresas.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 h-8 text-sm font-medium transition-colors hover:bg-muted focus:outline-none"
            style={{ borderColor: color, color }}
          >
            <Building2 className="h-3.5 w-3.5" />
            {empresaActual?.nombreComercial ?? "Seleccionar empresa"}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Empresas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {empresas.map((emp) => (
                <DropdownMenuItem
                  key={emp.id}
                  onClick={() => setEmpresaActual(emp)}
                  className="gap-2"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: emp.colorPrimario }}
                  />
                  {emp.nombreComercial}
                  {empresaActual?.id === emp.id && (
                    <span className="ml-auto text-xs text-muted-foreground">activa</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg px-2 h-8 text-sm font-medium transition-colors hover:bg-muted focus:outline-none">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ backgroundColor: color }}
            >
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline">{userName.split(" ")[0]}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{ROL_LABELS[userRole] ?? userRole}</p>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                Mi perfil
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="gap-2"
              variant="destructive"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
