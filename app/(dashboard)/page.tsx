import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ESTADO_LABELS, ESTADO_COLORS, type EstadoOrden } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  FileText, Clock, CheckCircle, XCircle, CreditCard,
  ChevronRight, AlertCircle, Building2, Wallet,
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const usuario = await prisma.usuario.findUnique({
    where: { email: user.email! },
    include: { empresas: { include: { empresa: true } } },
  })
  if (!usuario) redirect("/login")

  const empresaIds = usuario.empresas.map((ue) => ue.empresaId)

  // ── Conteos por estado ────────────────────────────────────────────────────
  const [borrador, enviadas, autorizadas1, autorizadas2, pagadas, rechazadas] =
    await Promise.all([
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "BORRADOR" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "ENVIADA" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "AUTORIZADA_1" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "AUTORIZADA_2" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: { in: ["PAGADA", "CONCILIADA"] } } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "RECHAZADA" } }),
    ])

  // ── Órdenes pendientes de acción ─────────────────────────────────────────
  const pendientes = await prisma.ordenPago.findMany({
    where: {
      empresaId: { in: empresaIds },
      estado: { in: ["ENVIADA", "AUTORIZADA_1", "AUTORIZADA_2"] },
    },
    include: {
      empresa: { select: { nombreComercial: true, colorPrimario: true } },
      creadoPor: { select: { nombre: true, iniciales: true } },
    },
    orderBy: { createdAt: "asc" }, // más antiguas primero (más urgentes)
    take: 10,
  })

  // ── Órdenes recientes (últimas 5 de cualquier estado) ────────────────────
  const recientes = await prisma.ordenPago.findMany({
    where: { empresaId: { in: empresaIds } },
    include: {
      empresa: { select: { nombreComercial: true, colorPrimario: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
  })

  // ── Saldos por empresa ───────────────────────────────────────────────────
  const saldosRaw = await Promise.all(
    empresaIds.map((eid) =>
      prisma.saldoEmpresa.findFirst({
        where: { empresaId: eid },
        orderBy: { fechaSaldo: "desc" },
        include: { empresa: { select: { nombreComercial: true, colorPrimario: true } } },
      })
    )
  )

  const saldos = await Promise.all(
    saldosRaw.filter(Boolean).map(async (s) => {
      const agg = await prisma.ordenPago.aggregate({
        where: {
          empresaId: s!.empresaId,
          estado: { in: ["PAGADA", "CONCILIADA"] },
          fechaPago: { gte: s!.fechaSaldo },
        },
        _sum: { total: true },
      })
      return {
        ...s!,
        saldoInicial:    Number(s!.saldoInicial),
        totalPagado:     Number(agg._sum.total ?? 0),
        saldoDisponible: Number(s!.saldoInicial) - Number(agg._sum.total ?? 0),
      }
    })
  )

  // ── Agrupación de pendientes por empresa ─────────────────────────────────
  const pendientesPorEmpresa = usuario.empresas.map(({ empresa: emp }) => ({
    empresa: emp,
    ordenes: pendientes.filter((o) => o.empresaId === emp.id),
  })).filter((g) => g.ordenes.length > 0)

  const stats = [
    { label: "Borradores",        value: borrador,    icon: FileText,     color: "text-gray-400" },
    { label: "Con director",      value: enviadas,    icon: Clock,        color: "text-blue-500" },
    { label: "Con presidente",    value: autorizadas1,icon: Clock,        color: "text-purple-500" },
    { label: "Listas para pagar", value: autorizadas2,icon: CheckCircle,  color: "text-emerald-500" },
    { label: "Pagadas",           value: pagadas,     icon: CreditCard,   color: "text-green-500" },
    { label: "Rechazadas",        value: rechazadas,  icon: XCircle,      color: "text-red-400" },
  ]

  const totalPendiente = pendientes.reduce((s, o) => s + Number(o.total), 0)

  return (
    <div className="space-y-6">
      {/* ── Encabezado ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bienvenido, {usuario.nombre.split(" ")[0]}
        </p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Columna izquierda: Pendientes ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Alerta si hay pendientes */}
          {pendientes.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm font-medium">
                {pendientes.length} orden{pendientes.length !== 1 ? "es" : ""} pendiente{pendientes.length !== 1 ? "s" : ""} ·{" "}
                {formatCurrency(totalPendiente)} en proceso
              </p>
            </div>
          )}

          {/* Pendientes por empresa */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Pendientes de acción</CardTitle>
                {pendientes.length === 0 && (
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Todo al día
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendientes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay órdenes pendientes de acción
                </p>
              ) : (
                <div>
                  {pendientesPorEmpresa.map(({ empresa: emp, ordenes }) => (
                    <div key={emp.id}>
                      {/* Sub-encabezado empresa */}
                      <div
                        className="flex items-center gap-2 px-4 py-2 border-y bg-muted/30"
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: emp.colorPrimario }} />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {emp.nombreComercial}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">{ordenes.length} orden{ordenes.length !== 1 ? "es" : ""}</span>
                      </div>
                      {ordenes.map((orden) => (
                        <Link
                          key={orden.id}
                          href={`/ordenes/${orden.id}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono text-xs text-muted-foreground">{orden.folio}</span>
                              <Badge className={`text-[10px] px-1.5 py-0 ${ESTADO_COLORS[orden.estado as EstadoOrden]}`}>
                                {ESTADO_LABELS[orden.estado as EstadoOrden]}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium truncate">
                              {orden.proveedorNombre ?? "Sin proveedor"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {orden.creadoPor.nombre.split(" ")[0]} · {formatDate(orden.fechaSolicitud)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-mono font-semibold text-sm">{formatCurrency(Number(orden.total))}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actividad reciente */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Actividad reciente</CardTitle>
                <Link href="/ordenes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Ver todas →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recientes.map((orden) => (
                <Link
                  key={orden.id}
                  href={`/ordenes/${orden.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b last:border-0"
                >
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: orden.empresa.colorPrimario }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{orden.proveedorNombre ?? "Sin proveedor"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs text-muted-foreground">{orden.folio}</span>
                      <span className="text-xs text-muted-foreground">· {orden.empresa.nombreComercial}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <p className="font-mono text-sm font-medium">{formatCurrency(Number(orden.total))}</p>
                    <Badge className={`text-[10px] px-1.5 py-0 ${ESTADO_COLORS[orden.estado as EstadoOrden]}`}>
                      {ESTADO_LABELS[orden.estado as EstadoOrden]}
                    </Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Columna derecha: Saldos + accesos rápidos ── */}
        <div className="space-y-4">

          {/* Saldos */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  Saldos disponibles
                </CardTitle>
                <Link href="/reportes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Detalle →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {saldos.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-muted-foreground">Sin saldos registrados</p>
                  <Link href="/reportes" className="text-xs text-blue-600 hover:underline mt-1 block">
                    Registrar en Reportes →
                  </Link>
                </div>
              ) : (
                saldos.map((s) => (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.empresa.colorPrimario }} />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {s.empresa.nombreComercial}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Disponible</span>
                      <span className={`font-mono font-bold text-sm ${s.saldoDisponible < 0 ? "text-red-600" : "text-foreground"}`}>
                        {formatCurrency(s.saldoDisponible)}
                      </span>
                    </div>
                    {/* Barra de progreso */}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          backgroundColor: s.empresa.colorPrimario,
                          width: `${Math.min(100, Math.max(0, (s.saldoDisponible / s.saldoInicial) * 100))}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-right">
                      Pagado: {formatCurrency(s.totalPagado)} de {formatCurrency(s.saldoInicial)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Accesos rápidos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Accesos rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {[
                { href: "/ordenes/nueva",   label: "Nueva orden de pago",   icon: FileText },
                { href: "/ordenes",         label: "Ver todas las órdenes", icon: Building2 },
                { href: "/pagos",           label: "Panel de pagos",        icon: CreditCard },
                { href: "/reportes",        label: "Reportes",             icon: CheckCircle },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </Link>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
