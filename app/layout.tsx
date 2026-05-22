import type { Metadata } from "next"
import { Figtree, DM_Mono } from "next/font/google"
import "./globals.css"

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
})

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "PagoCore",
  description: "Gestión de órdenes de pago · ALPHALIONS · Private Equity",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${figtree.variable} ${dmMono.variable} h-full antialiased`}>
      <body className="min-h-full font-[var(--font-figtree)]">{children}</body>
    </html>
  )
}
