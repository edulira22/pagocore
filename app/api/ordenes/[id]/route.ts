import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const orden = await prisma.ordenPago.findUnique({
    where: { id },
    include: {
      empresa: true,
      proveedor: true,
      creadoPor: { select: { nombre: true, iniciales: true } },
      autorizador1: { select: { nombre: true } },
      autorizador2: { select: { nombre: true } },
      rechazadoPor: { select: { nombre: true } },
      detalle: { orderBy: { ordenLinea: "asc" } },
      adjuntos: { include: { subidoPor: { select: { nombre: true } } } },
      log: {
        include: { usuario: { select: { nombre: true, iniciales: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!orden) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  return NextResponse.json(orden)
}
