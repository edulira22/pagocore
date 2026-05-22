"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useEmpresa } from "@/components/empresa-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { ESTADO_LABELS, ESTADO_COLORS, type EstadoOrden } from "@/lib/types"
import { Plus, Search, FileText } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

type Orden = {
  id: string
  folio: string
  proveedorNombre: string | null
  categoria: string | null
  total: string
  estado: EstadoOrden
  fechaSolicitud: string
  empresa: { nombreComercial: string; colorPrimario: string }
  creadoPor: { nombre: string }
}

export default function OrdenesPage() {
  const { empresaActual } = useEmpresa()
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")

  useEffect(() => {
    if (!empresaActual) return
    setLoading(true)
    const params = new URLSearchParams({ empresaId: empresaActual.id })
    if (filtroEstado) params.set("estado", filtroEstado)
    fetch(`/api/ordenes?${params}`)
      .then((r) => r.json())
      .then((data) => { setOrdenes(data); setLoading(false) })
  }, [empresaActual, filtroEstado])

  const ordenesFiltradas = ordenes.filter((o) => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      o.folio.toLowerCase().includes(q) ||
      o.proveedorNombre?.toLowerCase().includes(q) ||
      o.categoria?.toLowerCase().includes(q)
    )
  })

  const color = empresaActual?.colorPrimario ?? "#E8700A"

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Órdenes de pago</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {empresaActual?.nombreComercial ?? "—"}
          </p>
        </div>
        <Link href="/ordenes/nueva">
          <Button style={{ backgroundColor: color }} className="gap-2 text-white">
            <Plus className="h-4 w-4" />
            Nueva orden
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar folio, proveedor..."
            className="pl-8"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <select
          className="h-8 rounded-lg border border-border bg-background px-3 text-sm"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Tabla / Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : ordenesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <FileText className="h-10 w-10 opacity-30" />
            <p className="font-medium">No hay órdenes</p>
            <p className="text-sm">Crea la primera orden de pago para {empresaActual?.nombreComercial}</p>
            <Link href="/ordenes/nueva">
              <Button size="sm" style={{ backgroundColor: color }} className="text-white mt-1">
                <Plus className="h-4 w-4 mr-1" /> Nueva orden
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Folio</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Categoría</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ordenesFiltradas.map((orden) => (
                <tr
                  key={orden.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/ordenes/${orden.id}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium">{orden.folio}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{orden.proveedorNombre ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {orden.categoria ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">
                    {formatCurrency(Number(orden.total))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${ESTADO_COLORS[orden.estado]}`}>
                      {ESTADO_LABELS[orden.estado]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                    {formatDate(orden.fechaSolicitud)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
