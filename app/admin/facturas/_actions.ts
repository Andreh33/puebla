"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

type Ok<T = unknown> = { ok: true } & T;
type Err = { ok: false; error: string };

function parseAmount(raw: string): number | null {
  const n = Number(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0 || n > 9_999_999) return null;
  return Math.round(n * 100) / 100;
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

/** Fecha-solo (sin hora) a medianoche UTC, como el resto del proyecto. */
function dateOnly(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** Crea una factura vacía (fila nueva) para empezar a rellenarla. */
export async function createInvoiceAction(): Promise<Ok<{ id: string }> | Err> {
  await requireSession();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const inv = await db.supplierInvoice.create({
      data: { supplier: "", issueDate: dateOnly(today) },
      select: { id: true },
    });
    revalidatePath("/admin/facturas");
    return { ok: true, id: inv.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al crear la factura" };
  }
}

/** Edita un campo de cabecera de la factura (texto libre o fecha de emisión). */
export async function updateInvoiceFieldAction(
  id: string,
  field: string,
  value: string,
): Promise<Ok | Err> {
  await requireSession();
  let data: Prisma.SupplierInvoiceUpdateInput;
  switch (field) {
    case "supplier":
      data = { supplier: value.trim() };
      break;
    case "brandLabel":
      data = { brandLabel: value.trim() || null };
      break;
    case "invoiceNumber":
      data = { invoiceNumber: value.trim() || null };
      break;
    case "concept":
      data = { concept: value.trim() || null };
      break;
    case "notes":
      data = { notes: value.trim() || null };
      break;
    case "issueDate":
      if (!isYmd(value)) return { ok: false, error: "Fecha de factura inválida" };
      data = { issueDate: dateOnly(value) };
      break;
    default:
      return { ok: false, error: "Campo no editable" };
  }
  try {
    await db.supplierInvoice.update({ where: { id }, data });
    revalidatePath("/admin/facturas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar" };
  }
}

export async function deleteInvoiceAction(id: string): Promise<Ok | Err> {
  await requireSession();
  try {
    await db.supplierInvoice.delete({ where: { id } });
    revalidatePath("/admin/facturas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al borrar" };
  }
}

/** Añade un vencimiento (fecha + importe) a una factura. */
export async function addDueDateAction(
  invoiceId: string,
  dueDate: string,
  amountRaw: string,
): Promise<Ok<{ id: string }> | Err> {
  await requireSession();
  if (!isYmd(dueDate)) return { ok: false, error: "Fecha de vencimiento inválida" };
  const amount = parseAmount(amountRaw);
  if (amount === null) return { ok: false, error: "Importe inválido (número ≥ 0)" };
  try {
    const d = await db.supplierInvoiceDueDate.create({
      data: { invoiceId, dueDate: dateOnly(dueDate), amount: amount.toFixed(2) },
      select: { id: true },
    });
    revalidatePath("/admin/facturas");
    return { ok: true, id: d.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al añadir el vencimiento" };
  }
}

export async function updateDueDateAction(
  id: string,
  patch: { dueDate?: string; amount?: string },
): Promise<Ok | Err> {
  await requireSession();
  const data: Prisma.SupplierInvoiceDueDateUpdateInput = {};
  if (patch.dueDate !== undefined) {
    if (!isYmd(patch.dueDate)) return { ok: false, error: "Fecha de vencimiento inválida" };
    data.dueDate = dateOnly(patch.dueDate);
  }
  if (patch.amount !== undefined) {
    const amount = parseAmount(patch.amount);
    if (amount === null) return { ok: false, error: "Importe inválido (número ≥ 0)" };
    data.amount = amount.toFixed(2);
  }
  try {
    await db.supplierInvoiceDueDate.update({ where: { id }, data });
    revalidatePath("/admin/facturas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar el vencimiento" };
  }
}

/** Marca un vencimiento como pagado / pendiente (registra la fecha de pago). */
export async function setDueDatePaidAction(id: string, paid: boolean): Promise<Ok | Err> {
  await requireSession();
  try {
    await db.supplierInvoiceDueDate.update({
      where: { id },
      data: { paid, paidAt: paid ? new Date() : null },
    });
    revalidatePath("/admin/facturas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al actualizar el pago" };
  }
}

export async function deleteDueDateAction(id: string): Promise<Ok | Err> {
  await requireSession();
  try {
    await db.supplierInvoiceDueDate.delete({ where: { id } });
    revalidatePath("/admin/facturas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al borrar el vencimiento" };
  }
}
