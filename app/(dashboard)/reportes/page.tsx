"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import { BarChart3, TrendingUp, Clock, CheckCircle, Plus, X, Check, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Periodo = "hoy" | "semana" | "mes" | "anio" | "custom"

function getRango(periodo: Periodo, custom: { desde: string; hasta: string }) {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  switch (periodo) {
    case "hoy":   return { desde: fmt(now), hasta: fmt(now) }
    case "semana": {
      const lun = new Date(now); lun.setDate(now.getDate() - now.getDay() + 1)
      return { desde: fmt(lun), hasta: fmt(now) }
    }
    case "mes":   return { desde: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), hasta: fmt(now) }
    case "anio":  return { desde: fmt(new Date(now.getFullYear(), 0, 1)), hasta: fmt(now) }
    case "custom": return custom
  }
}

type Reporte = {
  conteos: Record<string, number>
  totalesMes: number
  totalPendiente: number
  totalHistorico: number
  porEmpresa: { id: string; nombre: string; color: string; pagosMes: number; pendiente: number; totalHistorico: number }[]
  topProveedores: { nombre: string; total: number; cantidad: number }[]
  mes: string
}

type Saldo = {
  id: string
  empresaId: string
  saldoInicial: number
  fechaSaldo: string
  saldoDisponible: number
  totalPagado: number
  empresa: { nombreComercial: string; colorPrimario: string }
}

type EmpresaSimple = { id: string; nombreComercial: string; colorPrimario: string }

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "hoy",    label: "Hoy" },
  { key: "semana", label: "Esta semana" },
  { key: "mes",    label: "Este mes" },
  { key: "anio",   label: "Este año" },
  { key: "custom", label: "Personalizado" },
]

export default function ReportesPage() {
  const [reporte,   setReporte]   = useState<Reporte | null>(null)
  const [saldos,    setSaldos]    = useState<Saldo[]>([])
  const [empresas,  setEmpresas]  = useState<EmpresaSimple[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form,      setForm]      = useState({ empresaId: "", saldoInicial: "", fechaSaldo: "" })
  const [guardando, setGuardando] = useState(false)

  // Período
  const [periodo,  setPeriodo]  = useState<Periodo>("mes")
  const [custom,   setCustom]   = useState({ desde: "", hasta: "" })

  useEffect(() => { cargar() }, [periodo, custom])

  async function cargar() {
    setLoading(true)
    const rango = getRango(periodo, custom)
    const params = new URLSearchParams()
    if (rango.desde) params.set("desde", rango.desde)
    if (rango.hasta) params.set("hasta", rango.hasta)

    const [rep, sal, emps] = await Promise.all([
      fetch(`/api/reportes?${params}`).then((r) => r.json()),
      fetch("/api/saldos").then((r)   => r.json()),
      fetch("/api/empresas").then((r) => r.json()),
    ])
    setReporte(rep)
    setSaldos(Array.isArray(sal)  ? sal  : [])
    setEmpresas(Array.isArray(emps) ? emps : [])
    setLoading(false)
  }

  async function registrarSaldo() {
    if (!form.empresaId || !form.saldoInicial) {
      toast.error("Empresa y saldo son requeridos"); return
    }
    setGuardando(true)
    const res = await fetch("/api/saldos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresaId:    form.empresaId,
        saldoInicial: Number(form.saldoInicial.replace(/,/g, "")),
        fechaSaldo:   form.fechaSaldo || new Date().toISOString(),
      }),
    })
    if (res.ok) {
      toast.success("Saldo registrado")
      setModalOpen(false)
      setForm({ empresaId: "", saldoInicial: "", fechaSaldo: "" })
      cargar()
    } else {
      toast.error("Error al registrar saldo")
    }
    setGuardando(false)
  }

  if (loading) return (
    <div className="space-y-4 max-w-4xl">
      {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
    </div>
  )

  if (!reporte) return null

  const flujo = [
    { label: "Borradores",   valor: reporte.conteos.borradores,   color: "bg-gray-100 text-gray-700" },
    { label: "Con director",  valor: reporte.conteos.enviadas,     color: "bg-blue-100 text-blue-700" },
    { label: "Con presidente",valor: reporte.conteos.autorizadas1, color: "bg-purple-100 text-purple-700" },
    { label: "Listas pagar",  valor: reporte.conteos.autorizadas2, color: "bg-emerald-100 text-emerald-700" },
    { label: "Pagadas",       valor: reporte.conteos.pagadas,      color: "bg-green-100 text-green-700" },
    { label: "Conciliadas",   valor: reporte.conteos.conciliadas,  color: "bg-teal-100 text-teal-700" },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Encabezado */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{reporte.mes}</p>
        </div>

        {/* Selector de período */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-1 flex-wrap">
            {PERIODOS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  periodo === p.key
                    ? "bg-foreground text-background"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                {p.key === "custom" && <Calendar className="h-3 w-3" />}
                {p.label}
              </button>
            ))}
          </div>
          {/* Inputs de rango personalizado */}
          {periodo === "custom" && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={custom.desde}
                onChange={(e) => setCustom((c) => ({ ...c, desde: e.target.value }))}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">a</span>
              <input
                type="date"
                value={custom.hasta}
                onChange={(e) => setCustom((c) => ({ ...c, hasta: e.target.value }))}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pagado este mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-2xl font-bold font-mono">{formatCurrency(reporte.totalesMes)}</p>
            <p className="text-xs text-muted-foreground mt-1">{reporte.conteos.pagadas + reporte.conteos.conciliadas} órdenes pagadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pendiente de pago</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-2xl font-bold font-mono">{formatCurrency(reporte.totalPendiente)}</p>
            <p className="text-xs text-muted-foreground mt-1">{reporte.conteos.autorizadas2} órdenes autorizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total histórico</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-2xl font-bold font-mono">{formatCurrency(reporte.totalHistorico)}</p>
            <p className="text-xs text-muted-foreground mt-1">Todas las órdenes pagadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Flujo de órdenes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Flujo de órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {flujo.map((f) => (
              <div key={f.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${f.color}`}>
                <span className="text-xl font-bold leading-none">{f.valor}</span>
                <span className="text-xs font-medium leading-tight">{f.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Por empresa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Desglose por empresa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Empresa</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Pagado mes</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Pendiente</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Histórico</th>
              </tr>
            </thead>
            <tbody>
              {reporte.porEmpresa.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                      <span className="font-medium">{emp.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(emp.pagosMes)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-amber-700">{formatCurrency(emp.pendiente)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-semibold">{formatCurrency(emp.totalHistorico)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Top proveedores */}
      {reporte.topProveedores.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top proveedores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reporte.topProveedores.map((prov, i) => {
              const maxTotal = reporte.topProveedores[0]?.total ?? 1
              const pct = Math.round((prov.total / maxTotal) * 100)
              return (
                <div key={prov.nombre} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                      <span className="font-medium">{prov.nombre}</span>
                      <span className="text-xs text-muted-foreground">({prov.cantidad} órdenes)</span>
                    </div>
                    <span className="font-mono font-semibold">{formatCurrency(prov.total)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-foreground/30 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Saldos por empresa */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Saldos disponibles</CardTitle>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Registrar saldo
          </button>
        </CardHeader>
        <CardContent>
          {saldos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay saldos registrados. Registra el saldo inicial de cada empresa.
            </p>
          ) : (
            <div className="space-y-3">
              {saldos.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.empresa.colorPrimario }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.empresa.nombreComercial}</p>
                    <p className="text-xs text-muted-foreground">Saldo inicial: {formatCurrency(s.saldoInicial)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono text-sm">{formatCurrency(s.saldoDisponible)}</p>
                    <p className="text-xs text-muted-foreground">disponible</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-red-600">-{formatCurrency(s.totalPagado)}</p>
                    <p className="text-xs text-muted-foreground">pagado</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal registrar saldo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Registrar saldo</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Empresa</label>
                <select
                  value={form.empresaId}
                  onChange={(e) => setForm((f) => ({ ...f, empresaId: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Selecciona una empresa</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nombreComercial}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Saldo disponible ($)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.saldoInicial}
                  onChange={(e) => setForm((f) => ({ ...f, saldoInicial: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fecha de corte</label>
                <input
                  type="date"
                  value={form.fechaSaldo}
                  onChange={(e) => setForm((f) => ({ ...f, fechaSaldo: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={registrarSaldo}
                disabled={guardando}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Check className="h-4 w-4" />
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
