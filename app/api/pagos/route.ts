import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({
    where: { email: user.email! },
    include: { empresas: true },
  })
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const empresaId   = searchParams.get("empresaId")
  const conciliada  = searchParams.get("conciliada") // "true" | "false" | null

  const empresaIds = usuario.empresas.map((ue) => ue.empresaId)

  const where: Record<string, any> = {
    empresaId: empresaId ? empresaId : { in: empresaIds },
    estado: { in: ["PAGADA", "CONCILIADA"] },
  }
  if (conciliada === "true")  where.conciliada = true
  if (conciliada === "false") where.conciliada = false

  const ordenes = await prisma.ordenPago.findMany({
    where,
    include: {
      empresa:          { select: { nombreComercial: true, colorPrimario: true } },
      creadoPor:        { select: { nombre: true } },
      pagoRegistradoPor: { select: { nombre: true } },
    },
    orderBy: { fechaPago: "desc" },
  })

  return NextResponse.json(ordenes)
}
