"use client"

import { useEffect, useState } from "react"
import { useEmpresa } from "@/components/empresa-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ESTADO_LABELS } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CheckCircle, XCircle, Building2, Clock } from "lucide-react"
import { toast } from "sonner"

type OrdenPendiente = {
  id: string
  folio: string
  proveedorNombre: string | null
  categoria: string | null
  total: string
  estado: string
  fechaSolicitud: string
  fechaPagoSolicitada: string | null
  empresa: { nombreComercial: string; colorPrimario: string }
  creadoPor: { nombre: string }
  detalle: { descripcion: string; importe: number }[]
}

export default function AutorizacionesPage() {
  const { empresas, empresaActual } = useEmpresa()
  const [ordenes, setOrdenes] = useState<OrdenPendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [comentarios, setComentarios] = useState<Record<string, string>>({})
  const [rechazando, setRechazando] = useState<string | null>(null)
  const [rolUsuario, setRolUsuario] = useState<string>("")

  useEffect(() => {
    cargarDatos()
  }, [empresaActual])

  async function cargarDatos() {
    setLoading(true)
    try {
      // Obtener rol del usuario actual
      const perfilRes = await fetch("/api/perfil")
      const perfil = perfilRes.ok ? await perfilRes.json() : null
      const rol = perfil?.rolGlobal ?? ""
      setRolUsuario(rol)

      // Cargar órdenes según rol
      const estado = rol === "DIRECTOR" ? "ENVIADA" : rol === "PRESIDENTE" ? "AUTORIZADA_1" : null
      if (!estado) { setLoading(false); return }

      const empresaIds = empresas.map((e) => e.id)
      const all: OrdenPendiente[] = []
      for (const eid of empresaIds) {
        const r = await fetch(`/api/ordenes?empresaId=${eid}&estado=${estado}`)
        const data = await r.json()
        if (Array.isArray(data)) all.push(...data)
      }
      setOrdenes(all)
    } finally {
      setLoading(false)
    }
  }

  async function autorizar(id: string) {
    setProcesando(id)
    const accion = rolUsuario === "DIRECTOR" ? "AUTORIZAR_1" : "AUTORIZAR_2"
    const res = await fetch(`/api/ordenes/${id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion }),
    })
    if (res.ok) {
      toast.success("Orden autorizada")
      setOrdenes((prev) => prev.filter((o) => o.id !== id))
    } else {
      toast.error("Error al autorizar")
    }
    setProcesando(null)
  }

  async function rechazar(id: string) {
    setProcesando(id)
    const res = await fetch(`/api/ordenes/${id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "RECHAZAR", comentario: comentarios[id] || null }),
    })
    if (res.ok) {
      toast.success("Orden rechazada")
      setOrdenes((prev) => prev.filter((o) => o.id !== id))
      setRechazando(null)
    } else {
      toast.error("Error al rechazar")
    }
    setProcesando(null)
  }

  const rolLabel = rolUsuario === "DIRECTOR" ? "Director" : rolUsuario === "PRESIDENTE" ? "Presidente" : ""

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Autorizaciones</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {rolLabel} · {ordenes.length} orden{ordenes.length !== 1 ? "es" : ""} pendiente{ordenes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {ordenes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <CheckCircle className="h-10 w-10 opacity-30" />
            <p className="font-medium">Todo al día</p>
            <p className="text-sm">No hay órdenes pendientes de autorización</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordenes.map((orden) => {
            const color = orden.empresa.colorPrimario
            const isRechazando = rechazando === orden.id
            return (
              <Card key={orden.id} className="overflow-hidden">
                <div className="h-1" style={{ backgroundColor: color }} />
                <CardContent className="pt-4 space-y-4">
                  {/* Header de la tarjeta */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">{orden.folio}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{orden.empresa.nombreComercial}
                        </span>
                      </div>
                      <p className="font-semibold mt-0.5">{orden.proveedorNombre ?? "Sin proveedor"}</p>
                      {orden.categoria && <p className="text-xs text-muted-foreground">{orden.categoria}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold font-mono" style={{ color }}>{formatCurrency(Number(orden.total))}</p>
                      {orden.fechaPagoSolicitada && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                          <Clock className="h-3 w-3" /> {formatDate(orden.fechaPagoSolicitada)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Conceptos resumidos */}
                  {orden.detalle?.length > 0 && (
                    <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs space-y-0.5">
                      {orden.detalle.slice(0, 3).map((d: any, i: number) => (
                        <div key={i} className="flex justify-between gap-4">
                          <span className="text-muted-foreground truncate">{d.descripcion}</span>
                          <span className="font-mono flex-shrink-0">{formatCurrency(Number(d.importe))}</span>
                        </div>
                      ))}
                      {orden.detalle.length > 3 && <p className="text-muted-foreground">+{orden.detalle.length - 3} más</p>}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">Solicitado por {orden.creadoPor?.nombre} · {formatDate(orden.fechaSolicitud)}</p>

                  {/* Panel de rechazo */}
                  {isRechazando && (
                    <div className="space-y-2">
                      <textarea
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none"
                        placeholder="¿Deseas agregar un motivo? (opcional)"
                        rows={2}
                        value={comentarios[orden.id] ?? ""}
                        onChange={(e) => setComentarios((prev) => ({ ...prev, [orden.id]: e.target.value }))}
                      />
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex gap-3">
                    {!isRechazando ? (
                      <>
                        <button
                          onClick={() => setRechazando(orden.id)}
                          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors text-sm"
                          disabled={!!procesando}
                        >
                          <XCircle className="h-5 w-5" /> Rechazar
                        </button>
                        <button
                          onClick={() => autorizar(orden.id)}
                          className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-white font-medium transition-opacity hover:opacity-90 text-sm"
                          style={{ backgroundColor: color }}
                          disabled={!!procesando}
                        >
                          <CheckCircle className="h-5 w-5" /> Autorizar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setRechazando(null)}
                          className="flex-1 h-12 rounded-xl border border-border font-medium hover:bg-muted transition-colors text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => rechazar(orden.id)}
                          className="flex-1 h-12 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors text-sm"
                          disabled={!!procesando}
                        >
                          Confirmar rechazo
                        </button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
