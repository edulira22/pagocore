import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

// PATCH /api/ordenes/[id]/estado
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({ where: { email: user.email! } })
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  const { id } = await params
  const body = await request.json()
  const { accion, comentario } = body // accion: ENVIAR | AUTORIZAR_1 | AUTORIZAR_2 | RECHAZAR | CANCELAR | MARCAR_PAGADA

  const orden = await prisma.ordenPago.findUnique({ where: { id } })
  if (!orden) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })

  const estadoAnterior = orden.estado
  let updateData: Record<string, any> = {}
  let nuevoEstado = orden.estado
  let logAccion = accion

  switch (accion) {
    case "ENVIAR":
      if (orden.estado !== "BORRADOR")
        return NextResponse.json({ error: "Solo se pueden enviar órdenes en borrador" }, { status: 400 })
      nuevoEstado = "ENVIADA"
      updateData = { estado: "ENVIADA" }
      break

    case "AUTORIZAR_1":
      if (orden.estado !== "ENVIADA")
        return NextResponse.json({ error: "La orden debe estar en estado ENVIADA" }, { status: 400 })
      nuevoEstado = "AUTORIZADA_1"
      updateData = {
        estado: "AUTORIZADA_1",
        autorizador1Id: usuario.id,
        fechaAutorizacion1: new Date(),
        comentarioAutorizacion1: comentario ?? null,
      }
      break

    case "AUTORIZAR_2":
      if (orden.estado !== "AUTORIZADA_1")
        return NextResponse.json({ error: "La orden debe estar en estado AUTORIZADA_1" }, { status: 400 })
      nuevoEstado = "AUTORIZADA_2"
      updateData = {
        estado: "AUTORIZADA_2",
        autorizador2Id: usuario.id,
        fechaAutorizacion2: new Date(),
        comentarioAutorizacion2: comentario ?? null,
      }
      break

    case "RECHAZAR":
      if (!["ENVIADA", "AUTORIZADA_1"].includes(orden.estado))
        return NextResponse.json({ error: "Solo se pueden rechazar órdenes en revisión" }, { status: 400 })
      nuevoEstado = "RECHAZADA"
      updateData = {
        estado: "RECHAZADA",
        rechazadoPorId: usuario.id,
        fechaRechazo: new Date(),
        comentarioRechazo: comentario ?? null,
      }
      break

    case "PAGAR":
      if (orden.estado !== "AUTORIZADA_2")
        return NextResponse.json({ error: "Solo se pueden pagar órdenes autorizadas" }, { status: 400 })
      nuevoEstado = "PAGADA"
      updateData = {
        estado: "PAGADA",
        fechaPago: new Date(),
        pagoRegistradoPorId: usuario.id,
      }
      logAccion = "PAGO REGISTRADO"
      break

    case "CANCELAR":
      nuevoEstado = "CANCELADA"
      updateData = { estado: "CANCELADA" }
      break

    default:
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  }

  const ordenActualizada = await prisma.ordenPago.update({
    where: { id },
    data: updateData,
  })

  await prisma.ordenLog.create({
    data: {
      ordenId: id,
      usuarioId: usuario.id,
      accion: logAccion,
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      comentario: comentario ?? null,
    },
  })

  return NextResponse.json(ordenActualizada)
}
