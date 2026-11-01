"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Guard: solo OWNER puede mutar usuarios admin
// ---------------------------------------------------------------------------

async function requireOwner(): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    throw new Error("No autorizado");
  }
  return { id: session.user.id };
}

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const CreateSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(120),
  email: z.string().email("Email inválido"),
  role: z.enum(["OWNER", "EDITOR"]),
  password: z.string().min(10, "Mínimo 10 caracteres"),
});

export async function createAdminUser(formData: FormData): Promise<ActionResult> {
  try {
    await requireOwner();
  } catch {
    return { ok: false, error: "No autorizado" };
  }

  const parsed = CreateSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const exists = await db.adminUser.findUnique({ where: { email: parsed.data.email } });
  if (exists) {
    return { ok: false, error: "Ya existe un administrador con ese email" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.adminUser.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name,
      role: parsed.data.role,
      isActive: true,
    },
  });

  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Administrador creado correctamente" };
}

const ResetPasswordSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(10, "Mínimo 10 caracteres"),
});

export async function resetAdminPassword(formData: FormData): Promise<ActionResult> {
  try {
    await requireOwner();
  } catch {
    return { ok: false, error: "No autorizado" };
  }
  const parsed = ResetPasswordSchema.safeParse({
    id: formData.get("id"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.adminUser.update({
    where: { id: parsed.data.id },
    data: {
      passwordHash,
      failedLogins: 0,
      lockedUntil: null,
    },
  });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Contraseña restablecida" };
}

const ToggleSchema = z.object({
  id: z.string().min(1),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function toggleAdminActive(formData: FormData): Promise<ActionResult> {
  let me: { id: string };
  try {
    me = await requireOwner();
  } catch {
    return { ok: false, error: "No autorizado" };
  }
  const parsed = ToggleSchema.safeParse({
    id: formData.get("id"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }
  if (parsed.data.id === me.id && !parsed.data.isActive) {
    return { ok: false, error: "No puedes deshabilitar tu propia cuenta" };
  }
  await db.adminUser.update({
    where: { id: parsed.data.id },
    data: { isActive: parsed.data.isActive },
  });
  revalidatePath("/admin/usuarios");
  return {
    ok: true,
    message: parsed.data.isActive ? "Usuario reactivado" : "Usuario deshabilitado",
  };
}

const UnlockSchema = z.object({ id: z.string().min(1) });

export async function unlockAdminUser(formData: FormData): Promise<ActionResult> {
  try {
    await requireOwner();
  } catch {
    return { ok: false, error: "No autorizado" };
  }
  const parsed = UnlockSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  await db.adminUser.update({
    where: { id: parsed.data.id },
    data: { failedLogins: 0, lockedUntil: null },
  });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Cuenta desbloqueada" };
}
