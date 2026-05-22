"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Pencil, X } from "lucide-react"
import { toast } from "sonner"

type Empresa = {
  id: string; nombreComercial: string; razonSocial: string
  rfc: string | null; colorPrimario: string
  banco: string | null; clabe: string | null; cuenta: string | null
}

export default function EmpresasPage() {
  const [empresas,  setEmpresas]  = useState<Empresa[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [form,      setForm]      = useState<Partial<Empresa>>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const data = await fetch("/api/empresas").then((r) => r.json())
    setEmpresas(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function abrirEditar(e: Empresa) {
    setEditId(e.id)
    setForm({ ...e })
  }

  function cancelar() { setEditId(null); setForm({}) }

  async function guardar() {
    if (!form.nombreComercial?.trim() || !form.razonSocial?.trim()) {
      toast.error("Nombre comercial y razón social son requeridos"); return
    }
    setGuardando(true)
    const { id, ...data } = form
    const res = await fetch(`/api/empresas/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      toast.success("Empresa actualizada")
      cancelar()
      await cargar()
    } else {
      toast.error("Error al guardar")
    }
    setGuardando(false)
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Empresas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{empresas.length} empresas activas</p>
      </div>

      {empresas.map((empresa) => {
        const editando = editId === empresa.id
        const color = empresa.colorPrimario
        return (
          <Card key={empresa.id} className="overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: color }} />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{empresa.nombreComercial}</CardTitle>
                {!editando ? (
                  <button onClick={() => abrirEditar(empresa)}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={cancelar} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
                    <button onClick={guardar} disabled={guardando}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-50"
                      style={{ backgroundColor: color }}>
                      <Check className="h-3.5 w-3.5" /> {guardando ? "Guardando…" : "Guardar"}
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editando ? (
                /* ── Formulario de edición ── */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Nombre comercial</Label>
                      <Input value={form.nombreComercial ?? ""} onChange={(v) => setForm((f) => ({ ...f, nombreComercial: v }))} />
                    </div>
                    <div className="col-span-2">
                      <Label>Razón social</Label>
                      <Input value={form.razonSocial ?? ""} onChange={(v) => setForm((f) => ({ ...f, razonSocial: v }))} />
                    </div>
                    <div>
                      <Label>RFC</Label>
                      <Input value={form.rfc ?? ""} onChange={(v) => setForm((f) => ({ ...f, rfc: v.toUpperCase() }))} />
                    </div>
                    <div>
                      <Label>Color primario</Label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={form.colorPrimario ?? "#E8700A"}
                          onChange={(e) => setForm((f) => ({ ...f, colorPrimario: e.target.value }))}
                          className="h-9 w-12 rounded cursor-pointer border border-border p-0.5" />
                        <input className={`${inputCls} flex-1`} value={form.colorPrimario ?? ""}
                          onChange={(e) => setForm((f) => ({ ...f, colorPrimario: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label>Banco</Label>
                      <Input value={form.banco ?? ""} onChange={(v) => setForm((f) => ({ ...f, banco: v }))} placeholder="BBVA, Santander…" />
                    </div>
                    <div>
                      <Label>CLABE</Label>
                      <Input value={form.clabe ?? ""} onChange={(v) => setForm((f) => ({ ...f, clabe: v }))} maxLength={18} />
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Vista de datos ── */
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                  <InfoRow label="Razón social"   value={empresa.razonSocial} />
                  <InfoRow label="RFC"            value={empresa.rfc ?? "—"} mono />
                  <InfoRow label="Banco"          value={empresa.banco ?? "—"} />
                  <InfoRow label="CLABE"          value={empresa.clabe ?? "—"} mono />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mb-1">{children}</p>
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className={mono ? "font-mono text-xs" : "font-medium"}>{value}</span>
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"

function Input({ value, onChange, placeholder, maxLength }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number
}) {
  return (
    <input className={inputCls} value={value} placeholder={placeholder} maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)} />
  )
}
