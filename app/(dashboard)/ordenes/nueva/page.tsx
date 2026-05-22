"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useEmpresa } from "@/components/empresa-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CATEGORIAS } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2, ArrowLeft, Save, Send } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type Proveedor = {
  id: string
  nombreComercial: string
  razonSocial: string | null
  rfc: string | null
  contacto: string | null
  telefono: string | null
  domicilio: string | null
  referenciaServicio: string | null
  banco: string | null
  cuenta: string | null
  clabe: string | null
  formaPagoDefault: string | null
}

type LineaConcepto = {
  descripcion: string
  cantidad: number
  precioUnitario: number
  importe: number
}

const FORMAS_PAGO = ["EFECTIVO", "TRANSFERENCIA", "CHEQUE"]
const IVA_RATE = 0.16

export default function NuevaOrdenPage() {
  const router = useRouter()
  const { empresaActual } = useEmpresa()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [proveedorId, setProveedorId] = useState("")
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null)
  const [loading, setLoading] = useState(false)

  // Datos de la orden
  const [proyecto, setProyecto] = useState("")
  const [categoria, setCategoria] = useState("")
  const [areaSolicitante, setAreaSolicitante] = useState("")
  const [fechaPagoSolicitada, setFechaPagoSolicitada] = useState("")
  const [formaPago, setFormaPago] = useState("")
  const [nombreTitularPago, setNombreTitularPago] = useState("")
  const [bancoDestino, setBancoDestino] = useState("")
  const [cuentaDestino, setCuentaDestino] = useState("")
  const [clabeDestino, setClabeDestino] = useState("")
  const [datosBancariosTexto, setDatosBancariosTexto] = useState("")
  const [aplicaIva, setAplicaIva] = useState(false)

  // Conceptos
  const [conceptos, setConceptos] = useState<LineaConcepto[]>([
    { descripcion: "", cantidad: 1, precioUnitario: 0, importe: 0 },
  ])

  useEffect(() => {
    if (!empresaActual) return
    fetch(`/api/proveedores?empresaId=${empresaActual.id}`)
      .then((r) => r.json())
      .then(setProveedores)
  }, [empresaActual])

  function seleccionarProveedor(id: string) {
    setProveedorId(id)
    const prov = proveedores.find((p) => p.id === id) ?? null
    setProveedorSeleccionado(prov)
    if (prov) {
      setFormaPago(prov.formaPagoDefault ?? "")
      setNombreTitularPago(prov.nombreComercial)
      setBancoDestino(prov.banco ?? "")
      setCuentaDestino(prov.cuenta ?? "")
      setClabeDestino(prov.clabe ?? "")
    }
  }

  function actualizarConcepto(i: number, field: keyof LineaConcepto, value: string | number) {
    setConceptos((prev) => {
      const updated = [...prev]
      updated[i] = { ...updated[i], [field]: value }
      if (field === "cantidad" || field === "precioUnitario") {
        const c = Number(field === "cantidad" ? value : updated[i].cantidad)
        const p = Number(field === "precioUnitario" ? value : updated[i].precioUnitario)
        updated[i].importe = Math.round(c * p * 100) / 100
      }
      return updated
    })
  }

  function agregarConcepto() {
    setConceptos((prev) => [...prev, { descripcion: "", cantidad: 1, precioUnitario: 0, importe: 0 }])
  }

  function eliminarConcepto(i: number) {
    if (conceptos.length === 1) return
    setConceptos((prev) => prev.filter((_, idx) => idx !== i))
  }

  const subtotal = conceptos.reduce((s, c) => s + c.importe, 0)
  const iva = aplicaIva ? Math.round(subtotal * IVA_RATE * 100) / 100 : 0
  const total = subtotal + iva

  async function guardar(enviar: boolean) {
    if (!empresaActual) return
    if (!proveedorSeleccionado && !proveedorId) {
      toast.error("Selecciona un proveedor")
      return
    }
    if (conceptos.every((c) => !c.descripcion)) {
      toast.error("Agrega al menos un concepto")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: empresaActual.id,
          proveedorId: proveedorId || null,
          proveedorNombre: proveedorSeleccionado?.nombreComercial ?? nombreTitularPago,
          proveedorRazonSocial: proveedorSeleccionado?.razonSocial,
          proveedorRfc: proveedorSeleccionado?.rfc,
          proveedorContacto: proveedorSeleccionado?.contacto,
          proveedorTelefono: proveedorSeleccionado?.telefono,
          proveedorDomicilio: proveedorSeleccionado?.domicilio,
          referenciaServicio: proveedorSeleccionado?.referenciaServicio,
          proyecto, categoria, areaSolicitante,
          subtotal, iva, total,
          formaPago, nombreTitularPago,
          bancoDestino, cuentaDestino, clabeDestino, datosBancariosTexto,
          fechaPagoSolicitada: fechaPagoSolicitada || null,
          detalle: conceptos.filter((c) => c.descripcion),
        }),
      })

      if (!res.ok) throw new Error("Error al crear la orden")
      const orden = await res.json()

      if (enviar) {
        await fetch(`/api/ordenes/${orden.id}/estado`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "ENVIAR" }),
        })
        toast.success(`Orden ${orden.folio} enviada para autorización`)
      } else {
        toast.success(`Orden ${orden.folio} guardada como borrador`)
      }

      router.push("/ordenes")
    } catch {
      toast.error("Error al guardar la orden")
    } finally {
      setLoading(false)
    }
  }

  const color = empresaActual?.colorPrimario ?? "#E8700A"

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/ordenes">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nueva orden de pago</h1>
          <p className="text-sm text-muted-foreground">{empresaActual?.nombreComercial}</p>
        </div>
      </div>

      {/* Proveedor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Proveedor / Beneficiario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Seleccionar proveedor</Label>
            <select
              className="w-full h-8 rounded-lg border border-border bg-background px-3 text-sm"
              value={proveedorId}
              onChange={(e) => seleccionarProveedor(e.target.value)}
            >
              <option value="">— Seleccionar proveedor —</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombreComercial}</option>
              ))}
            </select>
          </div>

          {proveedorSeleccionado && (
            <div className="grid grid-cols-2 gap-3 text-sm bg-muted/40 rounded-lg p-3">
              {proveedorSeleccionado.razonSocial && (
                <div><span className="text-muted-foreground">Razón social:</span> {proveedorSeleccionado.razonSocial}</div>
              )}
              {proveedorSeleccionado.rfc && (
                <div><span className="text-muted-foreground">RFC:</span> {proveedorSeleccionado.rfc}</div>
              )}
              {proveedorSeleccionado.telefono && (
                <div><span className="text-muted-foreground">Tel:</span> {proveedorSeleccionado.telefono}</div>
              )}
              {proveedorSeleccionado.clabe && (
                <div className="col-span-2"><span className="text-muted-foreground">CLABE:</span> <span className="font-mono">{proveedorSeleccionado.clabe}</span></div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Datos generales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <select
              className="w-full h-8 rounded-lg border border-border bg-background px-3 text-sm"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Proyecto / Referencia</Label>
            <Input value={proyecto} onChange={(e) => setProyecto(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-1.5">
            <Label>Área solicitante</Label>
            <Input value={areaSolicitante} onChange={(e) => setAreaSolicitante(e.target.value)} placeholder="Ej. Administración" />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de pago solicitada</Label>
            <Input type="date" value={fechaPagoSolicitada} onChange={(e) => setFechaPagoSolicitada(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Conceptos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conceptos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1fr_80px_120px_100px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>Descripción</span>
            <span className="text-center">Cantidad</span>
            <span className="text-right">Precio unit.</span>
            <span className="text-right">Importe</span>
            <span />
          </div>

          {conceptos.map((concepto, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_120px_100px_40px] gap-2 items-center">
              <Input
                placeholder="Descripción del servicio o producto"
                value={concepto.descripcion}
                onChange={(e) => actualizarConcepto(i, "descripcion", e.target.value)}
              />
              <Input
                type="number"
                min="0"
                step="1"
                className="text-center"
                value={concepto.cantidad}
                onChange={(e) => actualizarConcepto(i, "cantidad", Number(e.target.value))}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                className="text-right font-mono"
                value={concepto.precioUnitario || ""}
                placeholder="0.00"
                onChange={(e) => actualizarConcepto(i, "precioUnitario", Number(e.target.value))}
              />
              <div className="text-right font-mono text-sm font-medium py-1.5 px-2 bg-muted/40 rounded-lg">
                {formatCurrency(concepto.importe)}
              </div>
              <button
                onClick={() => eliminarConcepto(i)}
                className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                disabled={conceptos.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            onClick={agregarConcepto}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1 px-2"
          >
            <Plus className="h-4 w-4" /> Agregar concepto
          </button>

          <Separator />

          {/* Totales */}
          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex gap-8 text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono w-28 text-right">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aplicaIva}
                  onChange={(e) => setAplicaIva(e.target.checked)}
                  className="rounded"
                />
                IVA (16%)
              </label>
              <span className="font-mono w-28 text-right">{formatCurrency(iva)}</span>
            </div>
            <div className="flex gap-8 font-semibold text-base border-t pt-1 mt-1">
              <span>Total</span>
              <span className="font-mono w-28 text-right" style={{ color }}>{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pago */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datos de pago</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Forma de pago</Label>
            <select
              className="w-full h-8 rounded-lg border border-border bg-background px-3 text-sm"
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Nombre del titular</Label>
            <Input value={nombreTitularPago} onChange={(e) => setNombreTitularPago(e.target.value)} />
          </div>
          {formaPago === "TRANSFERENCIA" && (
            <>
              <div className="space-y-1.5">
                <Label>Banco destino</Label>
                <Input value={bancoDestino} onChange={(e) => setBancoDestino(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cuenta</Label>
                <Input value={cuentaDestino} onChange={(e) => setCuentaDestino(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>CLABE interbancaria</Label>
                <Input value={clabeDestino} onChange={(e) => setClabeDestino(e.target.value)} className="font-mono" maxLength={18} />
              </div>
            </>
          )}
          <div className="space-y-1.5 md:col-span-2">
            <Label>Notas adicionales de pago</Label>
            <textarea
              className="w-full min-h-16 rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Referencias, instrucciones especiales..."
              value={datosBancariosTexto}
              onChange={(e) => setDatosBancariosTexto(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex gap-3 justify-end pb-8">
        <Link href="/ordenes">
          <Button variant="ghost">Cancelar</Button>
        </Link>
        <Button variant="outline" onClick={() => guardar(false)} disabled={loading} className="gap-2">
          <Save className="h-4 w-4" /> Guardar borrador
        </Button>
        <Button
          onClick={() => guardar(true)}
          disabled={loading}
          className="gap-2 text-white"
          style={{ backgroundColor: color }}
        >
          <Send className="h-4 w-4" /> Enviar para autorización
        </Button>
      </div>
    </div>
  )
}
