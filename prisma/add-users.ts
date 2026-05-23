/**
 * Script para agregar usuarios reales a Supabase Auth + BD
 * Uso: npx ts-node --compiler-options {"module":"CommonJS"} prisma/add-users.ts
 */
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { createClient } from "@supabase/supabase-js"
import pg from "pg"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })
dotenv.config()

// ── Prisma ────────────────────────────────────────────────────────────────────
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ── Supabase Admin ────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ── Usuarios a agregar ────────────────────────────────────────────────────────
const USUARIOS = [
  {
    email:     "diaz.infante@integrasoluciones.mx",
    password:  "Neto12345",
    nombre:    "Ernesto Díaz Infante Gómez",
    iniciales: "E.D.",
    rolGlobal: "DIRECTOR" as const,
    empresaIds: ["emp-alpha-0001", "emp-peb-0001", "emp-bur-0001"],
  },
  {
    email:     "administracion@privateequitybaja.com",
    password:  "PEB0909*",
    nombre:    "Administración PE Baja",
    iniciales: "A.P.",
    rolGlobal: "ADMINISTRADORA" as const,
    empresaIds: ["emp-alpha-0001", "emp-peb-0001", "emp-bur-0001"],
  },
  {
    email:     "marco.santelices@pagocore.com",
    password:  "Marco@2026!",
    nombre:    "Marco Santelices",
    iniciales: "M.S.",
    rolGlobal: "PRESIDENTE" as const,
    empresaIds: ["emp-alpha-0001", "emp-peb-0001", "emp-bur-0001"],
  },
]

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("👤 Agregando usuarios...\n")

  for (const u of USUARIOS) {
    console.log(`→ ${u.email}`)

    // 1. Crear en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email:            u.email,
      password:         u.password,
      email_confirm:    true,   // confirmar email automáticamente
    })

    if (authError) {
      if (authError.message.includes("already been registered")) {
        console.log("   ⚠️  Ya existe en Supabase Auth — se omite creación de auth")
      } else {
        console.error("   ❌ Error Supabase Auth:", authError.message)
        continue
      }
    } else {
      console.log("   ✅ Auth creado:", authData.user?.id)
    }

    // 2. Crear/actualizar en BD
    const usuario = await prisma.usuario.upsert({
      where:  { email: u.email },
      update: { nombre: u.nombre, iniciales: u.iniciales, rolGlobal: u.rolGlobal },
      create: {
        nombre:    u.nombre,
        iniciales: u.iniciales,
        email:     u.email,
        rolGlobal: u.rolGlobal,
        activo:    true,
      },
    })
    console.log("   ✅ BD usuario:", usuario.id)

    // 3. Asignar empresas
    for (const empresaId of u.empresaIds) {
      await prisma.usuarioEmpresa.upsert({
        where:  { usuarioId_empresaId: { usuarioId: usuario.id, empresaId } },
        update: {},
        create: { usuarioId: usuario.id, empresaId, rolEnEmpresa: u.rolGlobal },
      })
    }
    console.log(`   ✅ Acceso a ${u.empresaIds.length} empresa(s)\n`)
  }

  console.log("🎉 Listo. Ya pueden iniciar sesión en pagocore.vercel.app")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
