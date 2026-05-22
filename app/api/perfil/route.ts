import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({
    where: { email: user.email! },
    select: { id: true, nombre: true, iniciales: true, rolGlobal: true },
  })

  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(usuario)
}
