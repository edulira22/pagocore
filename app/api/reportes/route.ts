import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({
    where: { email: user.email! },
    include: { empresas: { include: { empresa: true } } },
  })
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const empresaIds = usuario.empresas.map((ue) => ue.empresaId)

  // Rango del mes actual
  const now = new Date()
  const primerDiaMes  = new Date(now.getFullYear(), now.getMonth(), 1)
  const ultimoDiaMes  = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Conteos por estado
  const [enviadas, autorizadas1, autorizadas2, pagadas, conciliadas, rechazadas, canceladas, borradores] =
    await Promise.all([
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "ENVIADA" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "AUTORIZADA_1" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "AUTORIZADA_2" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "PAGADA" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "CONCILIADA" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "RECHAZADA" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "CANCELADA" } }),
      prisma.ordenPago.count({ where: { empresaId: { in: empresaIds }, estado: "BORRADOR" } }),
    ])

  // Todos los pagos (para calcular en JS)
  const [pagadasMes, pendientesPago, todosPagados] = await Promise.all([
    prisma.ordenPago.findMany({
      where: {
        empresaId: { in: empresaIds },
        estado: { in: ["PAGADA", "CONCILIADA"] },
        fechaPago: { gte: primerDiaMes, lte: ultimoDiaMes },
      },
      select: { total: true, empresaId: true, proveedorNombre: true },
    }),
    prisma.ordenPago.findMany({
      where: { empresaId: { in: empresaIds }, estado: "AUTORIZADA_2" },
      select: { total: true, empresaId: true },
    }),
    prisma.ordenPago.findMany({
      where: { empresaId: { in: empresaIds }, estado: { in: ["PAGADA", "CONCILIADA"] } },
      select: { total: true, empresaId: true, proveedorNombre: true },
    }),
  ])

  // Desglose por empresa
  const porEmpresa = usuario.empresas.map(({ empresa: emp }) => {
    const pagosMes     = pagadasMes   .filter((p) => p.empresaId === emp.id).reduce((s, p) => s + Number(p.total), 0)
    const pendiente    = pendientesPago.filter((p) => p.empresaId === emp.id).reduce((s, p) => s + Number(p.total), 0)
    const totalHistorico = todosPagados.filter((p) => p.empresaId === emp.id).reduce((s, p) => s + Number(p.total), 0)
    return { id: emp.id, nombre: emp.nombreComercial, color: emp.colorPrimario, pagosMes, pendiente, totalHistorico }
  })

  // Top 5 proveedores por monto total pagado
  const grouped = todosPagados.reduce<Record<string, { nombre: string; total: number; cantidad: number }>>(
    (acc, o) => {
      const nombre = o.proveedorNombre ?? "Sin nombre"
      if (!acc[nombre]) acc[nombre] = { nombre, total: 0, cantidad: 0 }
      acc[nombre].total    += Number(o.total)
      acc[nombre].cantidad += 1
      return acc
    },
    {}
  )
  const topProveedores = Object.values(grouped)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return NextResponse.json({
    conteos:        { borradores, enviadas, autorizadas1, autorizadas2, pagadas, conciliadas, rechazadas, canceladas },
    totalesMes:     pagadasMes   .reduce((s, p) => s + Number(p.total), 0),
    totalPendiente: pendientesPago.reduce((s, p) => s + Number(p.total), 0),
    totalHistorico: todosPagados  .reduce((s, p) => s + Number(p.total), 0),
    porEmpresa,
    topProveedores,
    mes: now.toLocaleString("es-MX", { month: "long", year: "numeric" }),
  })
}
