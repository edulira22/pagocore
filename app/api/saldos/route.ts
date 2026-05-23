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

  // Último saldo registrado por empresa
  const saldos = await Promise.all(
    empresaIds.map((eid) =>
      prisma.saldoEmpresa.findFirst({
        where: { empresaId: eid },
        orderBy: { fechaSaldo: "desc" },
        include: { empresa: { select: { nombreComercial: true, colorPrimario: true } } },
      })
    )
  )

  // Total pagado por empresa desde el último saldo
  const result = await Promise.all(
    saldos.map(async (saldo) => {
      if (!saldo) return null
      const totalPagado = await prisma.ordenPago.aggregate({
        where: {
          empresaId: saldo.empresaId,
          estado: { in: ["PAGADA", "CONCILIADA"] },
          fechaPago: { gte: saldo.fechaSaldo },
        },
        _sum: { total: true },
      })
      const pagado = Number(totalPagado._sum.total ?? 0)
      return {
        ...saldo,
        saldoInicial:   Number(saldo.saldoInicial),
        totalPagado:    pagado,
        saldoDisponible: Number(saldo.saldoInicial) - pagado,
      }
    })
  )

  return NextResponse.json(result.filter(Boolean))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({ where: { email: user.email! } })
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const body = await request.json()
  const { empresaId, saldoInicial, fechaSaldo } = body

  if (!empresaId || saldoInicial === undefined)
    return NextResponse.json({ error: "empresaId y saldoInicial son requeridos" }, { status: 400 })

  const nuevo = await prisma.saldoEmpresa.create({
    data: {
      empresaId,
      saldoInicial,
      fechaSaldo:      fechaSaldo ? new Date(fechaSaldo) : new Date(),
      registradoPorId: usuario.id,
    },
  })

  return NextResponse.json(nuevo)
}
