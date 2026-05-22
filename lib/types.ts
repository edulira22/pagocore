export type RolGlobal = "ADMIN_SISTEMA" | "ADMINISTRADORA" | "DIRECTOR" | "PRESIDENTE"

export type EstadoOrden =
  | "BORRADOR"
  | "ENVIADA"
  | "AUTORIZADA_1"
  | "RECHAZADA"
  | "AUTORIZADA_2"
  | "PAGADA"
  | "CONCILIADA"
  | "CANCELADA"

export type TipoAdjunto =
  | "FACTURA"
  | "PEDIDO"
  | "COMPLEMENTO_PAGO"
  | "COMPROBANTE"
  | "ESCANEO_FIRMAS"
  | "OTRO"

export const EMPRESA_CODIGOS: Record<string, string> = {
  ALPHALIONS: "ALPHA",
  "PRIVATE EQUITY BAJA": "PEB",
  "PRIVATE EQUITY BURSÁTIL": "BUR",
}

export const CATEGORIAS = [
  "SERVICIOS",
  "NÓMINA",
  "ADMINISTRACIÓN",
  "COMISIONISTA",
  "IMPUESTOS",
  "ASESORÍA",
  "SOCIO",
  "IMSS",
  "HONORARIOS",
  "OTRO",
] as const

export const ESTADO_LABELS: Record<EstadoOrden, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  AUTORIZADA_1: "Aut. Director",
  RECHAZADA: "Rechazada",
  AUTORIZADA_2: "Autorizada",
  PAGADA: "Pagada",
  CONCILIADA: "Conciliada",
  CANCELADA: "Cancelada",
}

export const TIPO_ADJUNTO_LABELS: Record<TipoAdjunto, string> = {
  FACTURA:          "Factura",
  PEDIDO:           "Pedido",
  COMPLEMENTO_PAGO: "Complemento de pago",
  COMPROBANTE:      "Comprobante",
  ESCANEO_FIRMAS:   "Escaneo de firmas",
  OTRO:             "Otro",
}

export const ESTADO_COLORS: Record<EstadoOrden, string> = {
  BORRADOR: "bg-gray-100 text-gray-700",
  ENVIADA: "bg-blue-100 text-blue-700",
  AUTORIZADA_1: "bg-yellow-100 text-yellow-700",
  RECHAZADA: "bg-red-100 text-red-700",
  AUTORIZADA_2: "bg-emerald-100 text-emerald-700",
  PAGADA: "bg-green-100 text-green-700",
  CONCILIADA: "bg-purple-100 text-purple-700",
  CANCELADA: "bg-gray-100 text-gray-500",
}
