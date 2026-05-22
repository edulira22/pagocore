"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Componente interno — usa useSearchParams, requiere Suspense
function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const noAccess = searchParams.get("error") === "no-access"

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Correo o contraseña incorrectos")
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-lg">Iniciar sesión</CardTitle>
        <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@pagocore.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {noAccess && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              Este correo no tiene acceso al sistema. Contacta al administrador.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-[#E8700A] hover:bg-[#d4620a] text-white"
            disabled={loading}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// Página raíz — envuelve LoginForm en Suspense (requerido por useSearchParams en Next.js)
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / Marca */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#E8700A] text-white text-xl font-bold mb-2">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "Figtree, sans-serif" }}>
            PagoCore
          </h1>
          <p className="text-sm text-gray-500">Gestión de órdenes de pago</p>
        </div>

        <Suspense fallback={
          <Card className="border-0 shadow-lg">
            <CardContent className="py-10 flex justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-[#E8700A] border-t-transparent animate-spin" />
            </CardContent>
          </Card>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-gray-400">
          © 2026 PagoCore · ALPHALIONS · Private Equity
        </p>
      </div>
    </div>
  )
}
