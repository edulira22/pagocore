import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })
dotenv.config()

// Usar DIRECT_URL (Session Pooler) para evitar problemas con prepared statements
const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Iniciando seed...")

  // ── Empresas ──────────────────────────────────────────────────────────────
  const alphalions = await prisma.empresa.upsert({
    where: { id: "emp-alpha-0001" },
    update: {},
    create: {
      id: "emp-alpha-0001",
      nombreComercial: "ALPHALIONS",
      razonSocial: "ALPHALIONS SAPI DE CV SOFOM ENR",
      colorPrimario: "#E8700A",
      activo: true,
    },
  })

  const peBaja = await prisma.empresa.upsert({
    where: { id: "emp-peb-0001" },
    update: {},
    create: {
      id: "emp-peb-0001",
      nombreComercial: "PRIVATE EQUITY BAJA",
      razonSocial: "PRIVATE EQUITY BAJA, SAPI DE CV",
      colorPrimario: "#C9A84C",
      activo: true,
    },
  })

  const peBursatil = await prisma.empresa.upsert({
    where: { id: "emp-bur-0001" },
    update: {},
    create: {
      id: "emp-bur-0001",
      nombreComercial: "PRIVATE EQUITY BURSÁTIL",
      razonSocial: "PRIVATE EQUITY BURSÁTIL, SA DE CV",
      colorPrimario: "#C9A84C",
      activo: true,
    },
  })

  console.log("✅ Empresas creadas")

  // ── Usuarios ──────────────────────────────────────────────────────────────
  const yuri = await prisma.usuario.upsert({
    where: { email: "yuri@pagocore.com" },
    update: {},
    create: {
      id: "usr-yuri-0001",
      nombre: "Yuri Camacho",
      iniciales: "Y.C.",
      email: "yuri@pagocore.com",
      rolGlobal: "ADMINISTRADORA",
      activo: true,
    },
  })

  const ernesto = await prisma.usuario.upsert({
    where: { email: "ernesto@pagocore.com" },
    update: {},
    create: {
      id: "usr-ernesto-0001",
      nombre: "Ernesto Díaz Infante Gómez",
      iniciales: "E.D.",
      email: "ernesto@pagocore.com",
      rolGlobal: "DIRECTOR",
      activo: true,
    },
  })

  const marco = await prisma.usuario.upsert({
    where: { email: "marco@pagocore.com" },
    update: {},
    create: {
      id: "usr-marco-0001",
      nombre: "Marco Santelices",
      iniciales: "M.S.",
      email: "marco@pagocore.com",
      rolGlobal: "PRESIDENTE",
      activo: true,
    },
  })

  console.log("✅ Usuarios creados")

  // ── UsuarioEmpresa ────────────────────────────────────────────────────────
  const empresas = [alphalions, peBaja, peBursatil]
  for (const empresa of empresas) {
    await prisma.usuarioEmpresa.upsert({
      where: { usuarioId_empresaId: { usuarioId: yuri.id, empresaId: empresa.id } },
      update: {},
      create: { usuarioId: yuri.id, empresaId: empresa.id, rolEnEmpresa: "ADMINISTRADORA" },
    })
    await prisma.usuarioEmpresa.upsert({
      where: { usuarioId_empresaId: { usuarioId: ernesto.id, empresaId: empresa.id } },
      update: {},
      create: { usuarioId: ernesto.id, empresaId: empresa.id, rolEnEmpresa: "DIRECTOR" },
    })
    await prisma.usuarioEmpresa.upsert({
      where: { usuarioId_empresaId: { usuarioId: marco.id, empresaId: empresa.id } },
      update: {},
      create: { usuarioId: marco.id, empresaId: empresa.id, rolEnEmpresa: "PRESIDENTE" },
    })
  }

  // Autorizadores por empresa
  await prisma.empresa.update({
    where: { id: alphalions.id },
    data: { autorizador1Id: ernesto.id, autorizador2Id: marco.id },
  })
  await prisma.empresa.update({
    where: { id: peBaja.id },
    data: { autorizador1Id: ernesto.id, autorizador2Id: marco.id },
  })
  await prisma.empresa.update({
    where: { id: peBursatil.id },
    data: { autorizador1Id: ernesto.id, autorizador2Id: marco.id },
  })

  console.log("✅ Relaciones usuario-empresa creadas")

  // ── Proveedores ALPHALIONS ────────────────────────────────────────────────
  const proveedoresAlpha = [
    {
      nombreComercial: "TELNOR",
      razonSocial: "Teléfonos del Noroeste SA de CV",
      formaPagoDefault: "EFECTIVO",
    },
    {
      nombreComercial: "CNBV",
      formaPagoDefault: "TRANSFERENCIA",
    },
    {
      nombreComercial: "INTEGRADMIN SPINDOLA",
      razonSocial: "Integradmin Spindola",
      contacto: "Yared Eloisa Ceballos",
      telefono: "662 174 5942",
      formaPagoDefault: "TRANSFERENCIA",
      clabe: "646180401200007000",
    },
  ]

  for (const prov of proveedoresAlpha) {
    await prisma.proveedor.upsert({
      where: {
        id: `prov-alpha-${prov.nombreComercial.toLowerCase().replace(/\s+/g, "-").substring(0, 20)}`,
      },
      update: {},
      create: {
        id: `prov-alpha-${prov.nombreComercial.toLowerCase().replace(/\s+/g, "-").substring(0, 20)}`,
        empresaId: alphalions.id,
        ...prov,
        activo: true,
      },
    })
  }

  // ── Proveedores PRIVATE EQUITY BAJA ───────────────────────────────────────
  const proveedoresPEB = [
    {
      nombreComercial: "CFE",
      razonSocial: "CFE",
      referenciaServicio: "NÚM SERV 001230801432",
      formaPagoDefault: "EFECTIVO",
    },
    {
      nombreComercial: "TELNOR",
      razonSocial: "Teléfonos del Noroeste SA de CV",
      formaPagoDefault: "EFECTIVO",
    },
    {
      nombreComercial: "MARIBEL RUIZ",
      telefono: "664 502 2931",
      categoria: "LIMPIEZA",
      formaPagoDefault: "EFECTIVO",
    },
    {
      nombreComercial: "YURIDIA CAMACHO FLORES",
      telefono: "664 499 0418",
      categoria: "ADMINISTRACIÓN",
      formaPagoDefault: "EFECTIVO",
    },
    {
      nombreComercial: "GOB DEL EDO DE BC",
      categoria: "IMPUESTOS",
      formaPagoDefault: "EFECTIVO",
    },
    {
      nombreComercial: "ERNESTO DÍAZ INFANTE GÓMEZ",
      telefono: "664 172 2581",
      categoria: "SOCIO",
      formaPagoDefault: "EFECTIVO",
    },
    {
      nombreComercial: "IMSS",
      razonSocial: "Instituto Mexicano del Seguro Social",
      telefono: "664 212 2677",
      formaPagoDefault: "TRANSFERENCIA",
      categoria: "IMSS",
    },
    {
      nombreComercial: "ZABEL ARTURO SOLIS RUIZ",
      categoria: "ASESORÍA",
      formaPagoDefault: "TRANSFERENCIA",
      banco: "BBVA",
      clabe: "012180015612900475",
    },
  ]

  for (const prov of proveedoresPEB) {
    const id = `prov-peb-${prov.nombreComercial.toLowerCase().replace(/\s+/g, "-").substring(0, 20)}`
    await prisma.proveedor.upsert({
      where: { id },
      update: {},
      create: { id, empresaId: peBaja.id, ...prov, activo: true },
    })
  }

  // ── Proveedores PRIVATE EQUITY BURSÁTIL ───────────────────────────────────
  const proveedoresBUR = [
    {
      nombreComercial: "TELNOR",
      razonSocial: "Teléfonos del Noroeste SA de CV",
      formaPagoDefault: "EFECTIVO",
    },
    {
      nombreComercial: "YURIDIA CAMACHO FLORES",
      telefono: "664 499 0418",
      formaPagoDefault: "EFECTIVO",
    },
    {
      nombreComercial: "MARCO SAMUEL ORDAZ CONTRERAS",
      telefono: "664 370 6779",
      categoria: "COMISIONISTA",
      formaPagoDefault: "TRANSFERENCIA",
      banco: "HSBC",
      cuenta: "6538542650",
      clabe: "021028065385426509",
    },
    {
      nombreComercial: "RICARDO BROWN SILLER",
      telefono: "662 290 0181",
      categoria: "COMISIONISTA",
      formaPagoDefault: "EFECTIVO",
    },
    {
      nombreComercial: "OCTAVIO RODRÍGUEZ",
      telefono: "664 212 2677",
      categoria: "NÓMINA",
      formaPagoDefault: "EFECTIVO",
    },
  ]

  for (const prov of proveedoresBUR) {
    const id = `prov-bur-${prov.nombreComercial.toLowerCase().replace(/\s+/g, "-").substring(0, 20)}`
    await prisma.proveedor.upsert({
      where: { id },
      update: {},
      create: { id, empresaId: peBursatil.id, ...prov, activo: true },
    })
  }

  console.log("✅ Proveedores creados")
  console.log("")
  console.log("🎉 Seed completado.")
  console.log("")
  console.log("📌 IMPORTANTE: Los usuarios deben crearse también en Supabase Auth.")
  console.log("   Ve a tu proyecto Supabase → Authentication → Users y crea:")
  console.log("   • yuri@pagocore.com     / PagoCore2026!")
  console.log("   • ernesto@pagocore.com  / PagoCore2026!")
  console.log("   • marco@pagocore.com    / PagoCore2026!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
