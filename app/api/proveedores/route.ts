import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/proveedores?empresaId=xxx&todos=1
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const empresaId = searchParams.get("empresaId")
  const todos = searchParams.get("todos") === "1"
  if (!empresaId) return NextResponse.json({ error: "empresaId requerido" }, { status: 400 })

  const proveedores = await prisma.proveedor.findMany({
    where: { empresaId, ...(todos ? {} : { activo: true }) },
    orderBy: { nombreComercial: "asc" },
  })

  return NextResponse.json(proveedores)
}

// POST /api/proveedores
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()
  const { empresaId, nombreComercial, ...rest } = body

  if (!empresaId || !nombreComercial) {
    return NextResponse.json({ error: "empresaId y nombreComercial son requeridos" }, { status: 400 })
  }

  const proveedor = await prisma.proveedor.create({
    data: { empresaId, nombreComercial, ...rest },
  })

  return NextResponse.json(proveedor, { status: 201 })
}
