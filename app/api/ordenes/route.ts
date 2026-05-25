import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { generarFolio } from "@/lib/folio"

// GET /api/ordenes?empresaId=xxx&estado=xxx
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const empresaId = searchParams.get("empresaId")
  const estado = searchParams.get("estado")
  const categoria = searchParams.get("categoria")

  const ESTADOS_VALIDOS = ["BORRADOR","ENVIADA","AUTORIZADA_1","RECHAZADA","AUTORIZADA_2","PAGADA","CONCILIADA","CANCELADA"]
  if (estado && !ESTADOS_VALIDOS.includes(estado))
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 })

  const ordenes = await prisma.ordenPago.findMany({
    where: {
      ...(empresaId ? { empresaId } : {}),
      ...(estado ? { estado: estado as any } : {}),
      ...(categoria ? { categoria } : {}),
    },
    include: {
      empresa: { select: { nombreComercial: true, colorPrimario: true } },
      creadoPor: { select: { nombre: true, iniciales: true } },
      autorizador1: { select: { nombre: true } },
      autorizador2: { select: { nombre: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(ordenes)
}

// POST /api/ordenes
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({ where: { email: user.email! } })
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

  const body = await request.json()
  const {
    empresaId, proveedorId, proyecto, categoria, moneda,
    subtotal, iva, total, nombreTitularPago, formaPago,
    bancoDestino, cuentaDestino, clabeDestino, datosBancariosTexto,
    areaSolicitante, fechaPagoSolicitada, detalle,
    // Snapshot proveedor
    proveedorNombre, proveedorRazonSocial, proveedorRfc,
    proveedorContacto, proveedorTelefono, proveedorDomicilio,
    referenciaServicio,
  } = body

  const folio = await generarFolio(empresaId)

  const orden = await prisma.ordenPago.create({
    data: {
      folio,
      empresaId,
      proveedorId: proveedorId || null,
      proveedorNombre,
      proveedorRazonSocial,
      proveedorRfc,
      proveedorContacto,
      proveedorTelefono,
      proveedorDomicilio,
      referenciaServicio,
      proyecto,
      categoria,
      moneda: moneda ?? "MXN",
      subtotal,
      iva,
      total,
      nombreTitularPago,
      formaPago,
      bancoDestino,
      cuentaDestino,
      clabeDestino,
      datosBancariosTexto,
      areaSolicitante,
      fechaPagoSolicitada: fechaPagoSolicitada ? new Date(fechaPagoSolicitada) : null,
      estado: "BORRADOR",
      creadoPorId: usuario.id,
      detalle: {
        create: (detalle ?? []).map((d: any, i: number) => ({
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          importe: d.importe,
          ordenLinea: i + 1,
        })),
      },
    },
    include: { detalle: true },
  })

  // Log
  await prisma.ordenLog.create({
    data: {
      ordenId: orden.id,
      usuarioId: usuario.id,
      accion: "CREADA",
      estadoNuevo: "BORRADOR",
    },
  })

  return NextResponse.json(orden, { status: 201 })
}
