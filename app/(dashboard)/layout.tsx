import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { EmpresaProvider } from "@/components/empresa-context"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const usuario = await prisma.usuario.findUnique({
    where: { email: user.email! },
    include: {
      empresas: {
        include: { empresa: true },
        where: { empresa: { activo: true } },
      },
    },
  })

  if (!usuario) {
    // El email de Supabase Auth no existe en la tabla Usuario de Prisma
    // Cerramos sesión para evitar bucle de redirección
    await supabase.auth.signOut()
    redirect("/login?error=no-access")
  }

  const empresas = usuario.empresas.map((ue) => ({
    id: ue.empresa.id,
    nombreComercial: ue.empresa.nombreComercial,
    colorPrimario: ue.empresa.colorPrimario,
  }))

  return (
    <EmpresaProvider empresas={empresas}>
      <SidebarProvider>
        <AppSidebar userRole={usuario.rolGlobal} />
        <SidebarInset>
          <DashboardHeader userName={usuario.nombre} userRole={usuario.rolGlobal} />
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster richColors position="top-right" />
    </EmpresaProvider>
  )
}
