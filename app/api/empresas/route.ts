import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/empresas
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const empresas = await prisma.empresa.findMany({
    where: { activo: true },
    orderBy: { nombreComercial: "asc" },
  })

  return NextResponse.json(empresas)
}
