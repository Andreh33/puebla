"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeCode } from "@/lib/promo/compute";

type Ok<T = unknown> = { ok: true } & T;
type Err = { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

export type PromoInput = {
  code: string;
  description?: string;
  discountType: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  startsAt?: string | null; // YYYY-MM-DD o null
  endsAt?: string | null;
  minSubtotal?: number | null;
  maxRedemptions?: number | null;
};

/** Normaliza y valida los campos comunes del formulario. */
function parse(input: PromoInput): { data: Record<string, unknown> } | Err {
  const code = normalizeCode(input.code ?? "");
  if (!code) return { ok: false, error: "El código no puede estar vacío." };
  if (!/^[A-Z0-9._-]{2,40}$/.test(code)) {
    return { ok: false, error: "El código solo admite letras, números y . _ - (2 a 40)." };
  }
  const type = input.discountType === "FIXED" ? "FIXED" : "PERCENT";
  const value = Number(input.value);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, error: "El valor del descuento debe ser mayor que 0." };
  if (type === "PERCENT" && value > 100) return { ok: false, error: "El porcentaje no puede superar 100." };

  const toDate = (s?: string | null) => (s && s.trim() ? new Date(`${s}T00:00:00`) : null);
  const min = input.minSubtotal != null && Number.isFinite(input.minSubtotal) && input.minSubtotal > 0 ? input.minSubtotal : null;
  const maxRed = input.maxRedemptions != null && Number.isFinite(input.maxRedemptions) && input.maxRedemptions > 0 ? Math.trunc(input.maxRedemptions) : null;

  return {
    data: {
      code,
      description: input.description?.trim() || null,
      discountType: type,
      value: value.toFixed(2),
      active: !!input.active,
      startsAt: toDate(input.startsAt),
      endsAt: toDate(input.endsAt),
      minSubtotal: min != null ? min.toFixed(2) : null,
      maxRedemptions: maxRed,
    },
  };
}

export async function createPromo(input: PromoInput): Promise<Ok<{ id: string }> | Err> {
  try {
    await requireSession();
    const parsed = parse(input);
    if ("ok" in parsed) return parsed;
    const exists = await db.promoCode.findUnique({ where: { code: parsed.data.code as string }, select: { id: true } });
    if (exists) return { ok: false, error: "Ya existe un código con ese nombre." };
    const p = await db.promoCode.create({ data: parsed.data as never, select: { id: true } });
    revalidatePath("/admin/promociones");
    return { ok: true, id: p.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updatePromo(id: string, input: PromoInput): Promise<Ok | Err> {
  try {
    await requireSession();
    const parsed = parse(input);
    if ("ok" in parsed) return parsed;
    const clash = await db.promoCode.findFirst({
      where: { code: parsed.data.code as string, NOT: { id } },
      select: { id: true },
    });
    if (clash) return { ok: false, error: "Ya existe otro código con ese nombre." };
    await db.promoCode.update({ where: { id }, data: parsed.data as never });
    revalidatePath("/admin/promociones");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function togglePromo(id: string, active: boolean): Promise<Ok | Err> {
  try {
    await requireSession();
    await db.promoCode.update({ where: { id }, data: { active } });
    revalidatePath("/admin/promociones");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deletePromo(id: string): Promise<Ok | Err> {
  try {
    await requireSession();
    await db.promoCode.delete({ where: { id } });
    revalidatePath("/admin/promociones");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
