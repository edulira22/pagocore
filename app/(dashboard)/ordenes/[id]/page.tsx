"use client"

import { useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ESTADO_LABELS, ESTADO_COLORS, TIPO_ADJUNTO_LABELS, type EstadoOrden, type TipoAdjunto } from "@/lib/types"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { ArrowLeft, Send, CheckCircle, XCircle, Printer, Paperclip, Download, Trash2, Upload, BanknoteIcon } from "lucide-react"
import { toast } from "sonner"

const TIPOS_ADJUNTO: TipoAdjunto[] = [
  "FACTURA", "PEDIDO", "COMPLEMENTO_PAGO", "COMPROBANTE", "ESCANEO_FIRMAS", "OTRO",
]

export default function OrdenDetallePage() {
  const params = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [orden, setOrden] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accionLoading, setAccionLoading] = useState(false)
  const [comentario, setComentario] = useState("")
  const [showRechazo, setShowRechazo] = useState(false)

  // Adjuntos
  const [showUpload, setShowUpload] = useState(false)
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoAdjunto>("FACTURA")
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  useEffect(() => {
    cargarOrden()
  }, [params.id])

  async function cargarOrden() {
    const d = await fetch(`/api/ordenes/${params.id}`).then((r) => r.json())
    setOrden(d)
    setLoading(false)
  }

  async function cambiarEstado(accion: string) {
    setAccionLoading(true)
    const res = await fetch(`/api/ordenes/${params.id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, comentario: comentario || null }),
    })
    if (res.ok) {
      toast.success(accion === "PAGAR" ? "Pago registrado" : "Estado actualizado")
      await cargarOrden()
      setShowRechazo(false)
      setComentario("")
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Error al actualizar estado")
    }
    setAccionLoading(false)
  }

  async function subirAdjunto() {
    if (!archivoSeleccionado) return
    setSubiendo(true)
    const form = new FormData()
    form.append("file", archivoSeleccionado)
    form.append("tipo", tipoSeleccionado)

    const res = await fetch(`/api/ordenes/${params.id}/adjuntos`, {
      method: "POST",
      body: form,
    })
    if (res.ok) {
      toast.success("Archivo subido")
      setShowUpload(false)
      setArchivoSeleccionado(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      await cargarOrden()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Error al subir archivo")
    }
    setSubiendo(false)
  }

  async function eliminarAdjunto(adjuntoId: string) {
    setEliminando(adjuntoId)
    const res = await fetch(`/api/adjuntos/${adjuntoId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Archivo eliminado")
      await cargarOrden()
    } else {
      toast.error("Error al eliminar")
    }
    setEliminando(null)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>
  if (!orden?.id) return <div className="flex items-center justify-center h-64 text-muted-foreground">Orden no encontrada</div>

  const color = orden.empresa?.colorPrimario ?? "#E8700A"
  const estado: EstadoOrden = orden.estado
  const adjuntos: any[] = orden.adjuntos ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/ordenes">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-lg">{orden.folio}</span>
              <Badge className={`text-xs ${ESTADO_COLORS[estado]}`}>{ESTADO_LABELS[estado]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {orden.empresa?.nombreComercial} · {formatDateTime(orden.fechaSolicitud)}
            </p>
          </div>
        </div>

        {/* Acciones por estado */}
        <div className="flex gap-2 flex-wrap">
          {/* Imprimir — siempre disponible */}
          <Link href={`/ordenes/${params.id}/imprimir`}>
            <Button
              size="sm"
              variant={["AUTORIZADA_2", "PAGADA", "CONCILIADA"].includes(estado) ? "default" : "outline"}
              className={["AUTORIZADA_2", "PAGADA", "CONCILIADA"].includes(estado) ? "gap-2 text-white" : "gap-2"}
              style={["AUTORIZADA_2", "PAGADA", "CONCILIADA"].includes(estado) ? { backgroundColor: color } : {}}
            >
              <Printer className="h-4 w-4" />
              {["AUTORIZADA_2", "PAGADA", "CONCILIADA"].includes(estado) ? "Imprimir" : "Vista previa"}
            </Button>
          </Link>

          {estado === "BORRADOR" && (
            <>
              <Button size="sm" variant="outline"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                disabled={accionLoading}
                onClick={() => {
                  if (window.confirm("¿Cancelar esta orden? Esta acción no se puede deshacer.")) {
                    cambiarEstado("CANCELAR")
                  }
                }}>
                <XCircle className="h-4 w-4" /> Cancelar orden
              </Button>
              <Button size="sm" onClick={() => cambiarEstado("ENVIAR")} disabled={accionLoading}
                className="gap-2 text-white" style={{ backgroundColor: color }}>
                <Send className="h-4 w-4" /> Enviar para autorización
              </Button>
            </>
          )}

          {(estado === "ENVIADA" || estado === "AUTORIZADA_1") && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowRechazo(!showRechazo)}
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
              <Button size="sm" onClick={() => cambiarEstado(estado === "ENVIADA" ? "AUTORIZAR_1" : "AUTORIZAR_2")}
                disabled={accionLoading} className="gap-2 text-white" style={{ backgroundColor: color }}>
                <CheckCircle className="h-4 w-4" />
                {estado === "ENVIADA" ? "Autorizar" : "Autorización final"}
              </Button>
            </>
          )}

          {estado === "AUTORIZADA_2" && (
            <Button size="sm" onClick={() => cambiarEstado("PAGAR")} disabled={accionLoading}
              className="gap-2 text-white bg-green-600 hover:bg-green-700">
              <BanknoteIcon className="h-4 w-4" /> Registrar pago
            </Button>
          )}
        </div>
      </div>

      {/* Panel de rechazo */}
      {showRechazo && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-medium text-red-700">¿Deseas agregar un motivo de rechazo?</p>
            <textarea
              className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none"
              placeholder="Motivo (opcional)"
              rows={2}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowRechazo(false)}>Cancelar</Button>
              <Button size="sm" onClick={() => cambiarEstado("RECHAZAR")} disabled={accionLoading}
                className="bg-red-600 hover:bg-red-700 text-white">
                Confirmar rechazo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Grid principal ── */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* Columna izquierda */}
        <div className="md:col-span-2 space-y-5">
          {/* Proveedor */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Proveedor</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <p className="font-semibold">{orden.proveedorNombre ?? "—"}</p>
              {orden.proveedorRazonSocial && <p className="text-sm text-muted-foreground">{orden.proveedorRazonSocial}</p>}
              {orden.proveedorRfc && <p className="text-sm font-mono">RFC: {orden.proveedorRfc}</p>}
              {orden.proveedorTelefono && <p className="text-sm text-muted-foreground">Tel: {orden.proveedorTelefono}</p>}
            </CardContent>
          </Card>

          {/* Conceptos */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Conceptos</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground text-xs border-b">
                  <th className="text-left pb-2">Descripción</th>
                  <th className="text-center pb-2 w-16">Cant.</th>
                  <th className="text-right pb-2 w-24">P. Unit.</th>
                  <th className="text-right pb-2 w-24">Importe</th>
                </tr></thead>
                <tbody>
                  {orden.detalle?.map((d: any) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-2">{d.descripcion}</td>
                      <td className="py-2 text-center text-muted-foreground">{d.cantidad}</td>
                      <td className="py-2 text-right font-mono">{formatCurrency(Number(d.precioUnitario))}</td>
                      <td className="py-2 text-right font-mono font-medium">{formatCurrency(Number(d.importe))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Separator className="my-3" />
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8 text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono w-24 text-right">{formatCurrency(Number(orden.subtotal))}</span>
                </div>
                {Number(orden.iva) > 0 && (
                  <div className="flex gap-8 text-muted-foreground">
                    <span>IVA</span>
                    <span className="font-mono w-24 text-right">{formatCurrency(Number(orden.iva))}</span>
                  </div>
                )}
                <div className="flex gap-8 font-bold text-base">
                  <span>Total</span>
                  <span className="font-mono w-24 text-right" style={{ color }}>{formatCurrency(Number(orden.total))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha */}
        <div className="space-y-5">
          {/* Detalles */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Detalles</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {orden.categoria && <div><span className="text-muted-foreground">Categoría:</span> {orden.categoria}</div>}
              {orden.formaPago && <div><span className="text-muted-foreground">Forma de pago:</span> {orden.formaPago}</div>}
              {orden.fechaPagoSolicitada && (
                <div><span className="text-muted-foreground">Fecha solicitada:</span> {formatDateTime(orden.fechaPagoSolicitada)}</div>
              )}
              {orden.clabeDestino && (
                <div><span className="text-muted-foreground">CLABE:</span> <span className="font-mono text-xs">{orden.clabeDestino}</span></div>
              )}
              {orden.fechaPago && (
                <div className="flex items-center gap-1.5 text-green-700 font-medium">
                  <BanknoteIcon className="h-3.5 w-3.5" />
                  <span>Pagado: {formatDateTime(orden.fechaPago)}</span>
                </div>
              )}
              <div><span className="text-muted-foreground">Creada por:</span> {orden.creadoPor?.nombre}</div>
            </CardContent>
          </Card>

          {/* ── Adjuntos ── */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" /> Adjuntos
                  {adjuntos.length > 0 && (
                    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">{adjuntos.length}</span>
                  )}
                </CardTitle>
                {!showUpload && (
                  <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md hover:bg-muted transition-colors"
                    style={{ color }}
                  >
                    <Upload className="h-3 w-3" /> Subir
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">

              {/* Lista de adjuntos */}
              {adjuntos.length === 0 && !showUpload && (
                <p className="text-xs text-muted-foreground text-center py-3">Sin archivos adjuntos</p>
              )}
              {adjuntos.map((adj: any) => (
                <div key={adj.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{adj.nombreArchivo}</p>
                    <p className="text-xs text-muted-foreground">{TIPO_ADJUNTO_LABELS[adj.tipo as TipoAdjunto]}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <a
                      href={`/api/adjuntos/${adj.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Descargar"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => eliminarAdjunto(adj.id)}
                      disabled={eliminando === adj.id}
                      className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Panel de subida */}
              {showUpload && (
                <div className="rounded-lg border border-dashed p-3 space-y-3">
                  {/* Tipo */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tipo de documento</label>
                    <select
                      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none"
                      value={tipoSeleccionado}
                      onChange={(e) => setTipoSeleccionado(e.target.value as TipoAdjunto)}
                    >
                      {TIPOS_ADJUNTO.map((t) => (
                        <option key={t} value={t}>{TIPO_ADJUNTO_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Archivo */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Archivo (máx. 10 MB)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xml"
                      className="w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-medium"
                      onChange={(e) => setArchivoSeleccionado(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="flex-1"
                      onClick={() => { setShowUpload(false); setArchivoSeleccionado(null) }}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="flex-1 text-white gap-1.5" disabled={!archivoSeleccionado || subiendo}
                      style={{ backgroundColor: color }}
                      onClick={subirAdjunto}>
                      {subiendo ? "Subiendo…" : <><Upload className="h-3.5 w-3.5" /> Subir</>}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Historial</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orden.log?.map((entry: any) => (
                  <div key={entry.id} className="flex gap-2.5">
                    <div className="mt-1 h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="text-xs">
                      <p className="font-medium">{entry.accion}</p>
                      <p className="text-muted-foreground">{entry.usuario?.nombre} · {formatDateTime(entry.createdAt)}</p>
                      {entry.comentario && <p className="text-muted-foreground italic mt-0.5">"{entry.comentario}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
