"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveMarketplaceRemovalNotification } from "@/lib/marketplaces/removal-notifications";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function resolveMarketplaceNotificationAction(
  notificationId: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "No autorizado." };
  if (!notificationId || notificationId.length > 64) {
    return { ok: false, error: "Notificación no válida." };
  }

  try {
    const result = await db.$transaction((tx) =>
      resolveMarketplaceRemovalNotification(tx, notificationId, session.user.id),
    );
    revalidatePath("/admin/notificaciones");
    revalidatePath("/admin/productos");
    if (result.productId) revalidatePath(`/admin/productos/${result.productId}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo resolver la notificación.",
    };
  }
}
