"use client"

import { useEffect, useState } from "react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { CheckCheck, Circle } from "lucide-react"

type Pago = {
  id: string
  folio: string
  proveedorNombre: string | null
  formaPago: string | null
  total: number
  fechaPago: string | null
  conciliada: boolean
  fechaConciliacion: string | null
  empresa: { nombreComercial: string; colorPrimario: string }
  pagoRegistradoPor: { nombre: string } | null
}

const FILTROS = [
  { key: "todos",       label: "Todos" },
  { key: "pendientes",  label: "Por conciliar" },
  { key: "conciliados", label: "Conciliados" },
]

export default function PagosPage() {
  const [pagos,     setPagos]     = useState<Pago[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filtro,    setFiltro]    = useState("todos")
  const [guardando, setGuardando] = useState<string | null>(null)

  useEffect(() => { cargar() }, [filtro])

  async function cargar() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtro === "pendientes")  params.set("conciliada", "false")
    if (filtro === "conciliados") params.set("conciliada", "true")
    const data = await fetch(`/api/pagos?${params}`).then((r) => r.json())
    setPagos(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function conciliar(id: string) {
    setGuardando(id)
    const res = await fetch(`/api/ordenes/${id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "CONCILIAR" }),
    })
    if (res.ok) {
      toast.success("Orden conciliada")
      cargar()
    } else {
      toast.error("Error al conciliar")
    }
    setGuardando(null)
  }

  const total = pagos.reduce((s, p) => s + Number(p.total), 0)
  const sinConciliar = pagos.filter((p) => !p.conciliada).length

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Historial de pagos registrados
          </p>
        </div>
        {sinConciliar > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <Circle className="h-2 w-2 fill-amber-500 text-amber-500" />
            {sinConciliar} sin conciliar
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-1 border-b">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filtro === f.key
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : pagos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <CheckCheck className="h-10 w-10 opacity-20" />
          <p className="text-sm">No hay pagos en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pagos.map((pago) => (
            <div
              key={pago.id}
              className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow"
            >
              {/* Indicador empresa */}
              <div
                className="w-1 self-stretch rounded-full flex-shrink-0"
                style={{ backgroundColor: pago.empresa.colorPrimario }}
              />

              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">{pago.folio}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{pago.empresa.nombreComercial}</span>
                </div>
                <p className="font-semibold text-sm truncate mt-0.5">
                  {pago.proveedorNombre ?? "Sin proveedor"}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {pago.fechaPago && (
                    <span>Pagado: {formatDate(pago.fechaPago)}</span>
                  )}
                  {pago.pagoRegistradoPor && (
                    <span>por {pago.pagoRegistradoPor.nombre.split(" ")[0]}</span>
                  )}
                  {pago.formaPago && (
                    <span className="px-1.5 py-0.5 bg-muted rounded text-[11px] font-medium">
                      {pago.formaPago}
                    </span>
                  )}
                </div>
              </div>

              {/* Monto */}
              <div className="text-right flex-shrink-0">
                <p className="font-bold font-mono">{formatCurrency(Number(pago.total))}</p>
                {pago.conciliada ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 mt-1">
                    <CheckCheck className="h-3 w-3" /> Conciliada
                  </span>
                ) : (
                  <button
                    onClick={() => conciliar(pago.id)}
                    disabled={guardando === pago.id}
                    className="mt-1 text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50 transition-colors"
                  >
                    {guardando === pago.id ? "Conciliando…" : "Conciliar →"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {!loading && pagos.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total ({pagos.length} pagos)</p>
            <p className="text-xl font-bold font-mono">{formatCurrency(total)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
