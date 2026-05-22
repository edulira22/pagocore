"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowLeft, Printer } from "lucide-react"

/* ─────────────────────────────────────────────────────────
   Fuente de verdad de tamaños — ajustados para carta (10-11pt)
   ───────────────────────────────────────────────────────── */
const S = {
  tiny:        "10px",   // 7.5pt  — pie de página, etiquetas micro
  label:       "11px",   // 8.5pt  — labels de celda, section titles
  body:        "13px",   // 10pt   — texto corriente
  bodyBold:    "13px",
  table:       "13px",   // 10pt   — filas de tabla
  tableHeader: "11px",   // 8.5pt  — encabezado tabla
  totalLabel:  "13px",
  totalAmt:    "15px",
  grandLabel:  "15px",
  grandAmt:    "20px",
  folio:       "14px",
  title:       "26px",
  company:     "16px",
}

export default function ImprimirOrdenPage() {
  const params = useParams()
  const [orden, setOrden] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/ordenes/${params.id}`)
      .then((r) => r.json())
      .then((d) => { setOrden(d); setLoading(false) })
  }, [params.id])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Cargando documento...
    </div>
  )
  if (!orden?.id) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Orden no encontrada
    </div>
  )

  const color  = orden.empresa?.colorPrimario ?? "#E8700A"
  const empresa = orden.empresa

  const fechaDoc = orden.fechaAutorizacion2
    ? formatDate(orden.fechaAutorizacion2)
    : formatDate(orden.fechaSolicitud)

  return (
    <>
      {/* ── CSS de impresión ── */}
      <style>{`
        @media print {
          /* Ocultar barra de herramientas y chrome del dashboard */
          .print-toolbar { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }

          /* Documento ocupa la hoja completa */
          .print-page {
            box-shadow    : none !important;
            border-radius : 0 !important;
            max-width     : 100% !important;
            width         : 100% !important;
            margin        : 0 !important;
          }

          /* El browser NO agrega márgenes propios —
             el documento maneja su propio padding (≈ 15 mm) */
          @page { size: letter portrait; margin: 0; }
        }
      `}</style>

      {/* ── Barra de herramientas (se oculta al imprimir) ── */}
      <div className="print-toolbar flex items-center justify-between gap-4 mb-6 flex-wrap">
        <Link
          href={`/ordenes/${params.id}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la orden
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold shadow hover:opacity-90 transition-opacity"
          style={{ backgroundColor: color }}
        >
          <Printer className="h-4 w-4" />
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* ── Documento ──
          En pantalla: tarjeta centrada con sombra.
          Al imprimir: ocupa la hoja completa.
          El padding de 15mm (≈56px a 96 dpi) replica el margen de carta.
      ── */}
      <div
        className="print-page bg-white rounded-xl shadow-lg max-w-[780px] mx-auto"
        style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", color: "#1a1a1a" }}
      >
        {/* Barra de color empresa */}
        <div style={{ height: "8px", backgroundColor: color, borderRadius: "12px 12px 0 0" }} />

        {/* Padding que reemplaza los márgenes de página en impresión */}
        <div style={{ padding: "28px 36px 36px" }}>

          {/* ══ ENCABEZADO ══ */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
            {/* Identidad empresa */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              {empresa.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={empresa.logoUrl}
                  alt={empresa.nombreComercial}
                  style={{
                    height: "52px",
                    maxWidth: "200px",
                    objectFit: "contain",
                    flexShrink: 0,
                    // fondo de color para logos claros (ej. PE Bursátil blanco)
                    backgroundColor: empresa.logoUrl.includes("bursatil") ? color : "transparent",
                    borderRadius: empresa.logoUrl.includes("bursatil") ? "8px" : "0",
                    padding: empresa.logoUrl.includes("bursatil") ? "8px 12px" : "0",
                  }}
                />
              ) : (
                <div style={{
                  width: "60px", height: "60px", borderRadius: "12px", flexShrink: 0,
                  backgroundColor: color, display: "flex", alignItems: "center",
                  justifyContent: "center", color: "white", fontWeight: "800", fontSize: "22px",
                }}>
                  {empresa.nombreComercial?.charAt(0) ?? "E"}
                </div>
              )}
              <div>
                <p style={{ fontWeight: "700", fontSize: S.company, margin: "0 0 3px" }}>
                  {empresa.razonSocial ?? empresa.nombreComercial}
                </p>
                {empresa.rfc && (
                  <p style={{ fontSize: S.body, color: "#555", margin: 0 }}>RFC: {empresa.rfc}</p>
                )}
              </div>
            </div>

            {/* Título y folio */}
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "16px" }}>
              <p style={{ fontSize: S.title, fontWeight: "900", color, margin: "0 0 4px", letterSpacing: "-0.5px", lineHeight: 1, whiteSpace: "nowrap" }}>
                ORDEN DE PAGO
              </p>
              <p style={{ fontSize: S.folio, fontWeight: "700", color: "#222", margin: "0 0 3px", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                {orden.folio}
              </p>
              <p style={{ fontSize: S.body, color: "#555", margin: 0, whiteSpace: "nowrap" }}>Fecha: {fechaDoc}</p>
              {orden.fechaPagoSolicitada && (
                <p style={{ fontSize: S.body, color: "#555", margin: "2px 0 0", whiteSpace: "nowrap" }}>
                  Pago solicitado: {formatDate(orden.fechaPagoSolicitada)}
                </p>
              )}
            </div>
          </div>

          <Divider />

          {/* ══ DATOS DEL BENEFICIARIO ══ */}
          <SectionTitle color={color}>Datos del beneficiario</SectionTitle>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            border: "1px solid #d8d8d8", borderRadius: "6px", overflow: "hidden", marginBottom: "22px",
          }}>
            <DataCell label="Nombre / Razón Social" value={orden.proveedorRazonSocial ?? orden.proveedorNombre ?? "—"} />
            <DataCell label="RFC" value={orden.proveedorRfc ?? "—"} />
            <DataCell label="Banco destino" value={orden.bancoDestino ?? "—"} />
            <DataCell label="Forma de pago" value={orden.formaPago ?? "—"} />
            <DataCell label="CLABE / Cuenta" value={orden.clabeDestino ?? orden.cuentaDestino ?? "—"} />
            <DataCell label="Nombre del titular" value={orden.nombreTitularPago ?? orden.proveedorNombre ?? "—"} />
          </div>

          {/* ══ CONCEPTOS ══ */}
          <SectionTitle color={color}>Conceptos</SectionTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "22px" }}>
            <thead>
              <tr style={{ backgroundColor: color }}>
                <Th align="left"  width="52%">Descripción</Th>
                <Th align="center" width="10%">Cant.</Th>
                <Th align="right"  width="19%">P. Unitario</Th>
                <Th align="right"  width="19%">Importe</Th>
              </tr>
            </thead>
            <tbody>
              {orden.detalle?.map((d: any, i: number) => (
                <tr key={d.id} style={{ backgroundColor: i % 2 === 0 ? "#f8f8f8" : "white" }}>
                  <Td align="left">{d.descripcion}</Td>
                  <Td align="center">{d.cantidad}</Td>
                  <Td align="right">{formatCurrency(Number(d.precioUnitario))}</Td>
                  <Td align="right">{formatCurrency(Number(d.importe))}</Td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ══ TOTALES + INFO ══ */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "20px", alignItems: "start", marginBottom: "28px" }}>
            {/* Info adicional */}
            <div style={{ border: "1px solid #d8d8d8", borderRadius: "6px", overflow: "hidden" }}>
              {orden.areaSolicitante  && <InfoRow label="Área solicitante" value={orden.areaSolicitante} />}
              {orden.categoria        && <InfoRow label="Categoría"        value={orden.categoria} />}
              {orden.proyecto         && <InfoRow label="Proyecto"         value={orden.proyecto} />}
              {orden.referenciaServicio && <InfoRow label="Referencia"     value={orden.referenciaServicio} />}
              <InfoRow label="Elaborado por" value={orden.creadoPor?.nombre ?? "—"} last />
            </div>

            {/* Totales */}
            <div style={{ minWidth: "230px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", marginBottom: "2px" }}>
                <span style={{ fontSize: S.totalLabel, color: "#555" }}>Subtotal</span>
                <span style={{ fontSize: S.totalLabel, fontFamily: "monospace", fontWeight: "600" }}>
                  {formatCurrency(Number(orden.subtotal))}
                </span>
              </div>
              {Number(orden.iva) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", marginBottom: "2px" }}>
                  <span style={{ fontSize: S.totalLabel, color: "#555" }}>IVA (16%)</span>
                  <span style={{ fontSize: S.totalLabel, fontFamily: "monospace", fontWeight: "600" }}>
                    {formatCurrency(Number(orden.iva))}
                  </span>
                </div>
              )}
              {/* Total destacado */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginTop: "6px", padding: "10px 14px",
                backgroundColor: color + "18",
                border: `2px solid ${color}40`,
                borderRadius: "8px",
              }}>
                <span style={{ fontSize: S.grandLabel, fontWeight: "800", color: "#222" }}>TOTAL</span>
                <span style={{ fontSize: S.grandAmt, fontWeight: "900", fontFamily: "monospace", color }}>
                  {formatCurrency(Number(orden.total))}
                </span>
              </div>
            </div>
          </div>

          {/* ══ AUTORIZACIONES ══ */}
          <SectionTitle color={color}>Autorizaciones</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "28px" }}>
            <FirmaBox
              titulo="ELABORÓ"
              nombre={orden.creadoPor?.nombre ?? ""}
              fecha={formatDate(orden.fechaSolicitud)}
              color={color}
            />
            <FirmaBox
              titulo="AUTORIZÓ"
              subtitulo="1ª Autorización · Director"
              nombre={orden.autorizador1?.nombre ?? orden.empresa?.autorizador1?.nombre ?? ""}
              fecha={orden.fechaAutorizacion1 ? formatDate(orden.fechaAutorizacion1) : ""}
              comentario={orden.comentarioAutorizacion1}
              color={color}
            />
            <FirmaBox
              titulo="AUTORIZÓ"
              subtitulo="2ª Autorización · Presidente"
              nombre={orden.autorizador2?.nombre ?? orden.empresa?.autorizador2?.nombre ?? ""}
              fecha={orden.fechaAutorizacion2 ? formatDate(orden.fechaAutorizacion2) : ""}
              comentario={orden.comentarioAutorizacion2}
              color={color}
            />
          </div>

          {/* Pie de página */}
          <div style={{
            paddingTop: "10px", borderTop: "1px solid #eee",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <p style={{ fontSize: S.tiny, color: "#bbb", margin: 0 }}>
              Documento generado por PagoCore ·{" "}
              {new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
            <p style={{ fontSize: S.tiny, color: "#bbb", margin: 0, fontFamily: "monospace" }}>
              {orden.folio}
            </p>
          </div>

        </div>{/* /padding */}
      </div>{/* /print-page */}
    </>
  )
}

/* ══════════════════════════════
   Componentes auxiliares
══════════════════════════════ */

function Divider() {
  return <hr style={{ border: "none", borderTop: "1px solid #e8e8e8", margin: "0 0 18px" }} />
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
      <div style={{ width: "4px", height: "16px", backgroundColor: color, borderRadius: "2px", flexShrink: 0 }} />
      <p style={{ fontSize: S.label, fontWeight: "700", letterSpacing: "0.06em", color: "#444", textTransform: "uppercase", margin: 0 }}>
        {children}
      </p>
    </div>
  )
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "9px 14px", borderRight: "1px solid #d8d8d8", borderBottom: "1px solid #d8d8d8" }}>
      <p style={{ fontSize: S.label, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 3px", fontWeight: "600" }}>
        {label}
      </p>
      <p style={{ fontSize: S.body, fontWeight: "600", margin: 0 }}>{value}</p>
    </div>
  )
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: "flex", gap: "8px", padding: "7px 12px",
      borderBottom: last ? "none" : "1px solid #f0f0f0",
      fontSize: S.body,
    }}>
      <span style={{ color: "#888", flexShrink: 0, minWidth: "120px" }}>{label}:</span>
      <span style={{ fontWeight: "600" }}>{value}</span>
    </div>
  )
}

function FirmaBox({ titulo, subtitulo, nombre, fecha, comentario, color }: {
  titulo: string; subtitulo?: string; nombre: string; fecha: string
  comentario?: string | null; color: string
}) {
  return (
    <div style={{ border: "1px solid #d8d8d8", borderRadius: "8px", overflow: "hidden" }}>
      {/* Encabezado del bloque */}
      <div style={{ backgroundColor: color + "1A", padding: "7px 12px", borderBottom: "1px solid #d8d8d8" }}>
        <p style={{ fontSize: S.label, fontWeight: "800", color, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
          {titulo}
        </p>
        {subtitulo && (
          <p style={{ fontSize: "10px", color: "#888", margin: "2px 0 0" }}>{subtitulo}</p>
        )}
      </div>

      {/* Cuerpo: espacio para firma física + datos */}
      <div style={{ padding: "12px" }}>
        {/* Espacio en blanco para firma */}
        <div style={{ height: "60px", borderBottom: "1px solid #ccc", marginBottom: "8px" }} />

        {/* Nombre y fecha */}
        <div>
          <p style={{ fontSize: "10px", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px" }}>
            NOMBRE:
          </p>
          <p style={{ fontSize: S.body, fontWeight: "700", margin: "0 0 2px", minHeight: "18px" }}>
            {nombre}
          </p>
          {fecha && (
            <p style={{ fontSize: S.label, color: "#888", margin: 0 }}>
              Fecha: {fecha}
            </p>
          )}
          {comentario && (
            <p style={{ fontSize: S.label, color: "#999", margin: "4px 0 0", fontStyle: "italic" }}>
              "{comentario}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Celdas de tabla ── */
function Th({ children, align, width }: { children: React.ReactNode; align: "left" | "center" | "right"; width: string }) {
  return (
    <th style={{
      padding: "8px 12px", textAlign: align, width,
      fontSize: S.tableHeader, fontWeight: "700",
      color: "white", letterSpacing: "0.04em",
    }}>
      {children}
    </th>
  )
}

function Td({ children, align }: { children: React.ReactNode; align: "left" | "center" | "right" }) {
  return (
    <td style={{
      padding: "8px 12px", textAlign: align,
      fontSize: S.table, borderBottom: "1px solid #ebebeb",
      verticalAlign: "top",
    }}>
      {children}
    </td>
  )
}
