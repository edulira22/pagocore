"use client"

import { useEffect, useState } from "react"
import { useEmpresa } from "@/components/empresa-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { type RolGlobal } from "@/lib/types"
import { Pencil, Plus, UserCheck, UserX, X, AlertCircle } from "lucide-react"
import { toast } from "sonner"

const ROLES: { value: RolGlobal; label: string }[] = [
  { value: "ADMINISTRADORA", label: "Administradora" },
  { value: "DIRECTOR",       label: "Director" },
  { value: "PRESIDENTE",     label: "Presidente" },
  { value: "ADMIN_SISTEMA",  label: "Admin Sistema" },
]

const ROL_COLORS: Record<RolGlobal, string> = {
  ADMIN_SISTEMA:  "bg-purple-100 text-purple-700",
  ADMINISTRADORA: "bg-blue-100 text-blue-700",
  DIRECTOR:       "bg-yellow-100 text-yellow-700",
  PRESIDENTE:     "bg-emerald-100 text-emerald-700",
}

type Usuario = {
  id: string; nombre: string; iniciales: string; email: string
  rolGlobal: RolGlobal; activo: boolean
  empresas: { empresa: { id: string; nombreComercial: string } }[]
}

const EMPTY_FORM = { nombre: "", iniciales: "", email: "", rolGlobal: "ADMINISTRADORA" as RolGlobal, empresaIds: [] as string[] }

export default function UsuariosPage() {
  const { empresas } = useEmpresa()
  const color = "#E8700A"

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading,  setLoading]  = useState(true)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const data = await fetch("/api/usuarios").then((r) => r.json())
    setUsuarios(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  function abrirNuevo() {
    setForm({ ...EMPTY_FORM, empresaIds: empresas.map((e) => e.id) })
    setEditId(null)
    setShowForm(true)
  }

  function abrirEditar(u: Usuario) {
    setForm({
      nombre: u.nombre, iniciales: u.iniciales, email: u.email,
      rolGlobal: u.rolGlobal,
      empresaIds: u.empresas.map((ue) => ue.empresa.id),
    })
    setEditId(u.id)
    setShowForm(true)
  }

  function cerrarForm() { setShowForm(false); setEditId(null); setForm(EMPTY_FORM) }

  async function guardar() {
    if (!form.nombre.trim() || !form.email.trim()) { toast.error("Nombre y email son requeridos"); return }
    setGuardando(true)

    const url = editId ? `/api/usuarios/${editId}` : "/api/usuarios"
    const method = editId ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      toast.success(editId ? "Usuario actualizado" : "Usuario creado")
      cerrarForm()
      await cargar()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Error al guardar")
    }
    setGuardando(false)
  }

  async function toggleActivo(u: Usuario) {
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !u.activo }),
    })
    if (res.ok) { toast.success(u.activo ? "Usuario desactivado" : "Usuario activado"); await cargar() }
    else toast.error("Error al actualizar")
  }

  function toggleEmpresa(eid: string) {
    setForm((f) => ({
      ...f,
      empresaIds: f.empresaIds.includes(eid)
        ? f.empresaIds.filter((id) => id !== eid)
        : [...f.empresaIds, eid],
    }))
  }

  // Auto-iniciales
  function handleNombreChange(v: string) {
    const iniciales = v.trim().split(/\s+/).map((p) => p[0] ?? "").join("").slice(0, 3).toUpperCase()
    setForm((f) => ({ ...f, nombre: v, iniciales: f.iniciales === autoIniciales(f.nombre) ? iniciales : f.iniciales }))
  }
  function autoIniciales(nombre: string) {
    return nombre.trim().split(/\s+/).map((p) => p[0] ?? "").join("").slice(0, 3).toUpperCase()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{usuarios.filter((u) => u.activo).length} activos</p>
        </div>
        {!showForm && (
          <button onClick={abrirNuevo}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: color }}>
            <Plus className="h-4 w-4" /> Nuevo usuario
          </button>
        )}
      </div>

      {/* Aviso Supabase Auth */}
      {showForm && !editId && (
        <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>Después de crear el usuario aquí, también debes darlo de alta en <strong>Supabase → Authentication → Users</strong> con el mismo email para que pueda iniciar sesión.</p>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <Card className="border-2" style={{ borderColor: color + "40" }}>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{editId ? "Editar usuario" : "Nuevo usuario"}</h2>
              <button onClick={cerrarForm} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Nombre completo *</p>
                <input className={inputCls} value={form.nombre}
                  onChange={(e) => handleNombreChange(e.target.value)} placeholder="Ej. Ernesto García" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Iniciales (3 max.)</p>
                <input className={inputCls} value={form.iniciales} maxLength={3}
                  onChange={(e) => setForm((f) => ({ ...f, iniciales: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Rol *</p>
                <select className={`${inputCls} cursor-pointer`} value={form.rolGlobal}
                  onChange={(e) => setForm((f) => ({ ...f, rolGlobal: e.target.value as RolGlobal }))}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Email *{editId && " (no editable)"}</p>
                <input className={inputCls} value={form.email} disabled={!!editId}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value.toLowerCase() }))}
                  placeholder="usuario@empresa.com" type="email" />
              </div>
            </div>

            {/* Empresas */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Acceso a empresas</p>
              <div className="flex flex-wrap gap-2">
                {empresas.map((e) => {
                  const activo = form.empresaIds.includes(e.id)
                  return (
                    <button key={e.id} onClick={() => toggleEmpresa(e.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${activo ? "text-white border-transparent" : "border-border text-muted-foreground hover:bg-muted"}`}
                      style={activo ? { backgroundColor: e.colorPrimario } : {}}>
                      {e.nombreComercial}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={cerrarForm} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 h-10 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: color }}>
                {guardando ? "Guardando…" : editId ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <Card key={u.id} className={u.activo ? "" : "opacity-50"}>
              <CardContent className="py-3 flex items-center gap-3">
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: u.activo ? color : "#aaa" }}>
                  {u.iniciales}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{u.nombre}</p>
                    <Badge className={`text-xs ${ROL_COLORS[u.rolGlobal]}`}>{ROLES.find((r) => r.value === u.rolGlobal)?.label}</Badge>
                    {!u.activo && <Badge className="text-xs bg-gray-100 text-gray-500">Inactivo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  {u.empresas.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {u.empresas.map((ue) => ue.empresa.nombreComercial).join(" · ")}
                    </p>
                  )}
                </div>
                {/* Acciones */}
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => abrirEditar(u)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => toggleActivo(u)} className={`p-1.5 rounded transition-colors text-muted-foreground ${u.activo ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-green-50 hover:text-green-600"}`}
                    title={u.activo ? "Desactivar" : "Activar"}>
                    {u.activo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
