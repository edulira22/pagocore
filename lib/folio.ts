import { prisma } from "@/lib/prisma"

const EMPRESA_CODIGOS: Record<string, string> = {
  "ALPHALIONS": "ALPHA",
  "PRIVATE EQUITY BAJA": "PEB",
  "PRIVATE EQUITY BURSÁTIL": "BUR",
}

export async function generarFolio(empresaId: string): Promise<string> {
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } })
  if (!empresa) throw new Error("Empresa no encontrada")

  const codigo = EMPRESA_CODIGOS[empresa.nombreComercial] ?? "OP"
  const año = new Date().getFullYear()
  const prefix = `OP-${codigo}-${año}-`

  // Contar órdenes de esta empresa en el año actual
  const count = await prisma.ordenPago.count({
    where: {
      empresaId,
      folio: { startsWith: prefix },
    },
  })

  const secuencia = String(count + 1).padStart(4, "0")
  return `${prefix}${secuencia}`
}
