/**
 * Tipos y etiquetas PUROS del cuadro de mando Balance. SIN "server-only": tanto
 * la query de servidor (balance-queries.ts) como el componente cliente
 * (BalanceClient.tsx) importan de aquí, evitando arrastrar el módulo server-only
 * al bundle del navegador.
 */

import type { PaymentMethodRow } from "./payment-breakdown";
export type { PaymentMethodRow } from "./payment-breakdown";

export type FamilyKey = "textil" | "calzado" | "complemento";
export type GenderKey = "HOMBRE" | "MUJER" | "NINO" | "NINA" | "BEBE" | "OTROS";
export type Period = "mes" | "ano" | "todo";

export type Metrics = {
  coste: number; // valor de inventario a coste (€)
  stock: number; // unidades en stock
  vendidas: number; // unidades vendidas en el periodo
  ventas: number; // ingresos en el periodo (€)
  beneficio: number; // margen en el periodo (€)
};

export type GenderRow = { gender: GenderKey; metrics: Metrics };
export type FamilyTable = { family: FamilyKey; rows: GenderRow[]; total: Metrics };

export type BalanceData = {
  period: Period;
  families: FamilyTable[];
  byGender: GenderRow[];
  grandTotal: Metrics;
  profitByMonth: Array<{ month: string; label: string; beneficio: number; ventas: number }>;
  /** Desglose de ventas por método de pago (Bizum/PayPal/Tarjeta/TPV/Online). */
  paymentMethods: PaymentMethodRow[];
};

export const FAMILY_LABELS: Record<FamilyKey, string> = {
  textil: "Textil",
  calzado: "Calzado",
  complemento: "Complementos",
};

export const GENDER_LABELS: Record<GenderKey, string> = {
  HOMBRE: "Hombre",
  MUJER: "Mujer",
  NINO: "Niño",
  NINA: "Niña",
  BEBE: "Bebé",
  OTROS: "Otros / unisex",
};

export const GENDER_ORDER: GenderKey[] = ["HOMBRE", "MUJER", "NINO", "NINA", "BEBE", "OTROS"];
export const FAMILY_ORDER: FamilyKey[] = ["textil", "calzado", "complemento"];
