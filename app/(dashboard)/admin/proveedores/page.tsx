"use client"

import { useEffect, useState } from "react"
import { useEmpresa } from "@/components/empresa-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CATEGORIAS } from "@/lib/types"
import { Building2, ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { toast } from "sonner"

const FORMAS_PAGO = ["TRANSFERENCIA", "EFECTIVO", "CHEQUE", "TARJETA"]

type Proveedor = {
  id: string
  nombreComercial: string
  razonSocial: string | null
  rfc: string | null
  categoria: string | null
  telefono: string | null
  clabe: string | null
  cuenta: string | null
  banco: string | null
  formaPagoDefault: string | null
  datosBancariosTexto: string | null
  referenciaServicio: string | null
  domicilio: string | null
  activo: boolean
}

const EMPTY: Omit<Proveedor, "id" | "activo"> = {
  nombreComercial: "", razonSocial: "", rfc: "", categoria: "",
  telefono: "", clabe: "", cuenta: "", banco: "",
  formaPagoDefault: "", datosBancariosTexto: "", referenciaServicio: "", domicilio: "",
}

export default function ProveedoresPage() {
  const { empresaActual } = useEmpresa()
  const color = empresaActual?.colorPrimario ?? "#E8700A"

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading]   = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [form, setForm]         = useState<typeof EMPTY>(EMPTY)
  const [editId, setEditId]     = useState<string | null>(null) // null = nuevo
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    if (empresaActual) cargar()
  }, [empresaActual])

  async function cargar() {
    setLoading(true)
    const res = await fetch(`/api/proveedores?empresaId=${empresaActual!.id}&todos=1`)
    const data = await res.json()
    setProveedores(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function abrirNuevo() {
    setForm(EMPTY)
    setEditId(null)
    setShowForm(true)
    setExpandido(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function abrirEditar(p: Proveedor) {
    setForm({
      nombreComercial: p.nombreComercial, razonSocial: p.razonSocial ?? "",
      rfc: p.rfc ?? "", categoria: p.categoria ?? "",
      telefono: p.telefono ?? "", clabe: p.clabe ?? "",
      cuenta: p.cuenta ?? "", banco: p.banco ?? "",
      formaPagoDefault: p.formaPagoDefault ?? "",
      datosBancariosTexto: p.datosBancariosTexto ?? "",
      referenciaServicio: p.referenciaServicio ?? "",
      domicilio: p.domicilio ?? "",
    })
    setEditId(p.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function cerrarForm() { setShowForm(false); setEditId(null); setForm(EMPTY) }

  async function guardar() {
    if (!form.nombreComercial.trim()) { toast.error("El nombre es requerido"); return }
    setGuardando(true)

    const payload = {
      ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null])),
      ...(editId ? {} : { empresaId: empresaActual!.id }),
    }

    const res = await fetch(editId ? `/api/proveedores/${editId}` : "/api/proveedores", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      toast.success(editId ? "Proveedor actualizado" : "Proveedor creado")
      cerrarForm()
      await cargar()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Error al guardar")
    }
    setGuardando(false)
  }

  async function desactivar(id: string) {
    if (!confirm("¿Desactivar este proveedor?")) return
    const res = await fetch(`/api/proveedores/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Proveedor desactivado"); await cargar() }
    else toast.error("Error al desactivar")
  }

  async function reactivar(id: string) {
    const res = await fetch(`/api/proveedores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: true }),
    })
    if (res.ok) { toast.success("Proveedor reactivado"); await cargar() }
    else toast.error("Error al reactivar")
  }

  const filtrados = proveedores.filter((p) =>
    p.nombreComercial.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.razonSocial ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.rfc ?? "").toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Building2 className="h-3.5 w-3.5" /> {empresaActual?.nombreComercial ?? "—"}
            <span className="mx-1">·</span>{proveedores.filter(p => p.activo).length} activos
          </p>
        </div>
        {!showForm && (
          <button
            onClick={abrirNuevo}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: color }}
          >
            <Plus className="h-4 w-4" /> Nuevo proveedor
          </button>
        )}
      </div>

      {/* ── Formulario ── */}
      {showForm && (
        <Card className="border-2" style={{ borderColor: color + "40" }}>
          <CardContent className="pt-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{editId ? "Editar proveedor" : "Nuevo proveedor"}</h2>
              <button onClick={cerrarForm} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            {/* Identificación */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Identificación</legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Nombre comercial *</Label>
                  <Input value={form.nombreComercial} onChange={(v) => setForm(f => ({ ...f, nombreComercial: v }))} placeholder="Ej. Servicios ABC" />
                </div>
                <div className="col-span-2">
                  <Label>Razón social</Label>
                  <Input value={form.razonSocial ?? ""} onChange={(v) => setForm(f => ({ ...f, razonSocial: v }))} placeholder="Ej. Servicios ABC S.A. de C.V." />
                </div>
                <div>
                  <Label>RFC</Label>
                  <Input value={form.rfc ?? ""} onChange={(v) => setForm(f => ({ ...f, rfc: v.toUpperCase() }))} placeholder="XAXX010101000" />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <select className={selectCls} value={form.categoria ?? ""} onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    <option value="">Sin categoría</option>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Datos bancarios */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Datos bancarios</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Banco</Label>
                  <Input value={form.banco ?? ""} onChange={(v) => setForm(f => ({ ...f, banco: v }))} placeholder="BBVA, Santander…" />
                </div>
                <div>
                  <Label>Forma de pago</Label>
                  <select className={selectCls} value={form.formaPagoDefault ?? ""} onChange={(e) => setForm(f => ({ ...f, formaPagoDefault: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    {FORMAS_PAGO.map((fp) => <option key={fp} value={fp}>{fp}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>CLABE interbancaria</Label>
                  <Input value={form.clabe ?? ""} onChange={(v) => setForm(f => ({ ...f, clabe: v }))} placeholder="18 dígitos" maxLength={18} />
                </div>
                <div>
                  <Label>Número de cuenta</Label>
                  <Input value={form.cuenta ?? ""} onChange={(v) => setForm(f => ({ ...f, cuenta: v }))} placeholder="Opcional" />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={form.telefono ?? ""} onChange={(v) => setForm(f => ({ ...f, telefono: v }))} placeholder="664 000 0000" />
                </div>
                <div className="col-span-2">
                  <Label>Datos bancarios (texto libre)</Label>
                  <textarea
                    className={`${inputCls} resize-none`} rows={2}
                    value={form.datosBancariosTexto ?? ""}
                    onChange={(e) => setForm(f => ({ ...f, datosBancariosTexto: e.target.value }))}
                    placeholder="Notas adicionales de pago…"
                  />
                </div>
              </div>
            </fieldset>

            {/* Otras referencias */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Otras referencias</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Referencia de servicio</Label>
                  <Input value={form.referenciaServicio ?? ""} onChange={(v) => setForm(f => ({ ...f, referenciaServicio: v }))} placeholder="Contrato #, etc." />
                </div>
                <div>
                  <Label>Domicilio</Label>
                  <Input value={form.domicilio ?? ""} onChange={(v) => setForm(f => ({ ...f, domicilio: v }))} placeholder="Dirección" />
                </div>
              </div>
            </fieldset>

            {/* Acciones */}
            <div className="flex gap-3 pt-1">
              <button onClick={cerrarForm} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 h-10 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: color }}
              >
                {guardando ? "Guardando…" : editId ? "Guardar cambios" : "Crear proveedor"}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ "--tw-ring-color": color } as any}
          placeholder="Buscar por nombre, razón social o RFC…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-medium">Sin proveedores</p>
          <p className="text-sm mt-1">Crea el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((p) => {
            const abierto = expandido === p.id
            return (
              <Card key={p.id} className={p.activo ? "" : "opacity-50"}>
                <CardContent className="pt-3 pb-3">
                  {/* Fila principal */}
                  <div className="flex items-start justify-between gap-3">
                    <button className="flex-1 text-left min-w-0" onClick={() => setExpandido(abierto ? null : p.id)}>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{p.nombreComercial}</p>
                        {!p.activo && <Badge className="text-xs bg-gray-100 text-gray-500">Inactivo</Badge>}
                        {p.categoria && <Badge className="text-xs bg-muted text-muted-foreground">{p.categoria}</Badge>}
                      </div>
                      {p.razonSocial && <p className="text-xs text-muted-foreground truncate mt-0.5">{p.razonSocial}</p>}
                      {p.rfc && <p className="text-xs font-mono text-muted-foreground">RFC: {p.rfc}</p>}
                    </button>
                    <div className="flex gap-1 flex-shrink-0 items-center">
                      <button onClick={() => setExpandido(abierto ? null : p.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
                        {abierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => abrirEditar(p)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {p.activo ? (
                        <button onClick={() => desactivar(p.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600" title="Desactivar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => reactivar(p.id)} className="p-1.5 rounded hover:bg-green-50 text-muted-foreground hover:text-green-600 text-xs font-medium px-2">
                          Reactivar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detalle expandible */}
                  {abierto && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                      {p.banco && <InfoItem label="Banco" value={p.banco} />}
                      {p.formaPagoDefault && <InfoItem label="Forma de pago" value={p.formaPagoDefault} />}
                      {p.clabe && <InfoItem label="CLABE" value={p.clabe} mono />}
                      {p.cuenta && <InfoItem label="Cuenta" value={p.cuenta} mono />}
                      {p.telefono && <InfoItem label="Teléfono" value={p.telefono} />}
                      {p.referenciaServicio && <InfoItem label="Referencia" value={p.referenciaServicio} />}
                      {p.datosBancariosTexto && (
                        <div className="col-span-2"><InfoItem label="Notas bancarias" value={p.datosBancariosTexto} /></div>
                      )}
                      {p.domicilio && (
                        <div className="col-span-2"><InfoItem label="Domicilio" value={p.domicilio} /></div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Helpers de UI ── */
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mb-1">{children}</p>
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
const selectCls = `${inputCls} cursor-pointer`

function Input({ value, onChange, placeholder, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number
}) {
  return (
    <input
      className={inputCls} value={value} placeholder={placeholder} maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className={mono ? "font-mono" : "font-medium"}>{value}</span>
    </div>
  )
}
