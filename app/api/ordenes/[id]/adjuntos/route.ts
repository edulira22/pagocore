import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// POST /api/ordenes/[id]/adjuntos — sube un archivo a Supabase Storage
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({ where: { email: user.email! } })
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  const { id } = await params
  const orden = await prisma.ordenPago.findUnique({
    where: { id },
    select: { id: true, empresaId: true },
  })
  if (!orden) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })

  // Leer FormData
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  const tipo = formData.get("tipo") as string | null

  const TIPOS_VALIDOS = ["FACTURA", "PEDIDO", "COMPLEMENTO_PAGO", "COMPROBANTE", "ESCANEO_FIRMAS", "OTRO"]
  if (!file || !tipo) {
    return NextResponse.json({ error: "Archivo y tipo son requeridos" }, { status: 400 })
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo de adjunto inválido" }, { status: 400 })
  }

  // Construir ruta en Storage: empresaId/ordenId/tipo-timestamp.ext
  const ext = file.name.split(".").pop() ?? "bin"
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `${orden.empresaId}/${orden.id}/${tipo}-${Date.now()}-${safeName}`

  // Subir a Supabase Storage con admin client (evita restricciones de RLS)
  const adminClient = await createAdminClient()
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await adminClient.storage
    .from("adjuntos")
    .upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) {
    console.error("Storage upload error:", uploadError)
    return NextResponse.json({ error: "Error al subir archivo: " + uploadError.message }, { status: 500 })
  }

  // Guardar registro en DB
  const adjunto = await prisma.ordenAdjunto.create({
    data: {
      ordenId: id,
      tipo: tipo as any,
      nombreArchivo: file.name,
      url: storagePath, // guardamos el path, no la URL pública
      subidoPorId: usuario.id,
    },
    include: {
      subidoPor: { select: { nombre: true, iniciales: true } },
    },
  })

  return NextResponse.json(adjunto, { status: 201 })
}
