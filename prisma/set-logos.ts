/**
 * Script para asignar logoUrl a cada empresa
 * Uso: npx ts-node --compiler-options {"module":"CommonJS"} prisma/set-logos.ts
 */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })
dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🖼️  Asignando logos...\n")

  const updates = [
    { id: "emp-alpha-0001", logo: "/logos/alphalions.png",               nombre: "ALPHALIONS" },
    { id: "emp-peb-0001",   logo: "/logos/private-equity-baja.png",      nombre: "PRIVATE EQUITY BAJA" },
    { id: "emp-bur-0001",   logo: "/logos/private-equity-bursatil.png",  nombre: "PRIVATE EQUITY BURSÁTIL" },
  ]

  for (const { id, logo, nombre } of updates) {
    await prisma.empresa.update({ where: { id }, data: { logoUrl: logo } })
    console.log(`✅ ${nombre} → ${logo}`)
  }

  console.log("\n🎉 Logos asignados.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
