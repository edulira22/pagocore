import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// GET /api/adjuntos/[adjuntoId] — devuelve URL firmada (60 min) para descarga
export async function GET(
  _: Request,
  { params }: { params: Promise<{ adjuntoId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { adjuntoId } = await params
  const adjunto = await prisma.ordenAdjunto.findUnique({ where: { id: adjuntoId } })
  if (!adjunto) return NextResponse.json({ error: "Adjunto no encontrado" }, { status: 404 })

  const adminClient = await createAdminClient()
  const { data, error } = await adminClient.storage
    .from("adjuntos")
    .createSignedUrl(adjunto.url, 3600) // válida 1 hora

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "No se pudo generar la URL de descarga" }, { status: 500 })
  }

  // Redirige directamente al archivo
  return NextResponse.redirect(data.signedUrl)
}

// DELETE /api/adjuntos/[adjuntoId] — elimina de Storage y de la DB
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ adjuntoId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { adjuntoId } = await params
  const adjunto = await prisma.ordenAdjunto.findUnique({ where: { id: adjuntoId } })
  if (!adjunto) return NextResponse.json({ error: "Adjunto no encontrado" }, { status: 404 })

  // Borrar del Storage
  const adminClient = await createAdminClient()
  const { error: storageError } = await adminClient.storage
    .from("adjuntos")
    .remove([adjunto.url])

  if (storageError) {
    console.error("Storage delete error:", storageError)
    // Continuamos igual — eliminamos el registro aunque falle el storage
  }

  await prisma.ordenAdjunto.delete({ where: { id: adjuntoId } })

  return NextResponse.json({ ok: true })
}
