import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// PATCH /api/proveedores/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const proveedor = await prisma.proveedor.update({
    where: { id },
    data: body,
  })

  return NextResponse.json(proveedor)
}

// DELETE /api/proveedores/[id] — desactiva (soft delete)
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  await prisma.proveedor.update({ where: { id }, data: { activo: false } })

  return NextResponse.json({ ok: true })
}
