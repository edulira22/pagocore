"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Empresa = {
  id: string
  nombreComercial: string
  colorPrimario: string
}

type EmpresaContextValue = {
  empresaActual: Empresa | null
  empresas: Empresa[]
  setEmpresaActual: (empresa: Empresa) => void
}

const EmpresaContext = createContext<EmpresaContextValue>({
  empresaActual: null,
  empresas: [],
  setEmpresaActual: () => {},
})

export function EmpresaProvider({
  children,
  empresas,
}: {
  children: ReactNode
  empresas: Empresa[]
}) {
  const [empresaActual, setEmpresaActualState] = useState<Empresa | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("pagocore:empresa")
    if (saved) {
      const found = empresas.find((e) => e.id === saved)
      if (found) {
        setEmpresaActualState(found)
        return
      }
    }
    if (empresas.length > 0) setEmpresaActualState(empresas[0])
  }, [empresas])

  function setEmpresaActual(empresa: Empresa) {
    setEmpresaActualState(empresa)
    localStorage.setItem("pagocore:empresa", empresa.id)
  }

  return (
    <EmpresaContext.Provider value={{ empresaActual, empresas, setEmpresaActual }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  return useContext(EmpresaContext)
}
