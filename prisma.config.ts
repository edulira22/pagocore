import dotenv from "dotenv"
import { defineConfig } from "prisma/config"

// Load .env.local first (real values), then .env (fallback placeholders)
dotenv.config({ path: ".env.local" })
dotenv.config()

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    // DIRECT_URL = Session Pooler (puerto 5432) — funciona para migraciones
    // DATABASE_URL = Transaction Pooler (puerto 6543) — para runtime
    url: process.env["DIRECT_URL"] as string,
  },
})
