import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/usuarios
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const usuarios = await prisma.usuario.findMany({
    orderBy: { nombre: "asc" },
    include: {
      empresas: { include: { empresa: { select: { id: true, nombreComercial: true } } } },
    },
  })

  return NextResponse.json(usuarios)
}

// POST /api/usuarios — crea usuario en Prisma (Supabase Auth debe crearse por separado)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json()
  const { nombre, iniciales, email, rolGlobal, empresaIds = [] } = body

  if (!nombre || !email || !rolGlobal) {
    return NextResponse.json({ error: "nombre, email y rolGlobal son requeridos" }, { status: 400 })
  }

  // Verificar que el email no exista ya
  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })

  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      iniciales: iniciales || nombre.split(" ").map((n: string) => n[0]).join("").slice(0, 3).toUpperCase(),
      email,
      rolGlobal,
      empresas: {
        create: empresaIds.map((eid: string) => ({
          empresaId: eid,
          rolEnEmpresa: rolGlobal,
        })),
      },
    },
  })

  return NextResponse.json(usuario, { status: 201 })
}
