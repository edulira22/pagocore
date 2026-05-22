import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, CheckCircle, XCircle, CreditCard } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const usuario = await prisma.usuario.findUnique({
    where: { email: user.email! },
    include: { empresas: { include: { empresa: true } } },
  })
  if (!usuario) redirect("/login")

  const empresaIds = usuario.empresas.map((ue) => ue.empresaId)

  const [borrador, enviadas, autorizadas1, autorizadas2, pagadas, rechazadas] =
    await Promise.all([
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "BORRADOR" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "ENVIADA" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "AUTORIZADA_1" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "AUTORIZADA_2" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "PAGADA" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "RECHAZADA" } }),
    ])

  const stats = [
    { label: "Borradores", value: borrador, icon: FileText, color: "text-gray-500" },
    { label: "Pendientes director", value: enviadas, icon: Clock, color: "text-blue-500" },
    { label: "Pendientes presidente", value: autorizadas1, icon: Clock, color: "text-yellow-500" },
    { label: "Listas para pago", value: autorizadas2, icon: CheckCircle, color: "text-emerald-500" },
    { label: "Pagadas", value: pagadas, icon: CreditCard, color: "text-green-500" },
    { label: "Rechazadas", value: rechazadas, icon: XCircle, color: "text-red-500" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bienvenido, {usuario.nombre.split(" ")[0]}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(enviadas > 0 || autorizadas1 > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acciones pendientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {enviadas > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Órdenes esperando autorización del director
                </span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {enviadas}
                </Badge>
              </div>
            )}
            {autorizadas1 > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Órdenes esperando autorización del presidente
                </span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                  {autorizadas1}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
