"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Ok = { ok: true };
type Err = { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

const STATUSES = new Set(["NEW", "CONTACTED", "DONE"]);

/** Cambia el estado de una reserva (NEW → CONTACTED → DONE). */
export async function updateReservationStatus(id: string, status: string): Promise<Ok | Err> {
  try {
    await requireSession();
    if (!STATUSES.has(status)) return { ok: false, error: "Estado no válido" };
    await db.whatsappReservation.update({ where: { id }, data: { status } });
    revalidatePath("/admin/reservas");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo actualizar la reserva." };
  }
}

/** Borra una reserva del listado. */
export async function deleteReservation(id: string): Promise<Ok | Err> {
  try {
    await requireSession();
    await db.whatsappReservation.delete({ where: { id } });
    revalidatePath("/admin/reservas");
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo borrar la reserva." };
  }
}
