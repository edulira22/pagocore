import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// PATCH /api/usuarios/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { empresaIds, ...data } = body

  const usuario = await prisma.usuario.update({
    where: { id },
    data,
  })

  // Si se mandan empresaIds, sincronizamos las membresías
  if (Array.isArray(empresaIds)) {
    await prisma.usuarioEmpresa.deleteMany({ where: { usuarioId: id } })
    if (empresaIds.length > 0) {
      await prisma.usuarioEmpresa.createMany({
        data: empresaIds.map((eid: string) => ({
          usuarioId: id,
          empresaId: eid,
          rolEnEmpresa: usuario.rolGlobal,
        })),
        skipDuplicates: true,
      })
    }
  }

  return NextResponse.json(usuario)
}
