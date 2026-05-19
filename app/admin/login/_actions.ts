"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { LoginSchema } from "@/lib/validators";

const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 15 * 60_000 };

async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip") || "unknown";
}

function buildError(params: Record<string, string>): string {
  const qs = new URLSearchParams(params);
  return `/admin/login?${qs.toString()}`;
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/admin");

  const parsed = LoginSchema.safeParse({ email, password });
  if (!parsed.success) {
    redirect(
      buildError({
        error: "invalid",
        from,
      }),
    );
  }

  // Rate limit por IP
  const ip = await getClientIp();
  const rl = rateLimit(`login:${ip}`, LOGIN_RATE_LIMIT);
  if (!rl.ok) {
    redirect(
      buildError({
        error: "rate",
        resetAt: String(rl.resetAt),
        from,
      }),
    );
  }

  // Comprueba lockout en BD antes de pasar por NextAuth (mensaje más claro)
  try {
    const user = await db.adminUser.findUnique({
      where: { email: email.toLowerCase() },
      select: { isActive: true, lockedUntil: true },
    });
    if (user && !user.isActive) {
      redirect(buildError({ error: "disabled", from }));
    }
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      redirect(
        buildError({
          error: "locked",
          resetAt: String(user.lockedUntil.getTime()),
          from,
        }),
      );
    }
  } catch {
    // Si la BD falla devuelve "invalid" para no filtrar info; NextAuth lo gestionará
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: from,
    });
  } catch (error) {
    // NEXT_REDIRECT lanzado por signIn debe propagarse
    if (
      error instanceof Error &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    if (error instanceof AuthError || (error as { type?: string })?.type === "CredentialsSignin") {
      redirect(buildError({ error: "invalid", from }));
    }
    throw error;
  }
}
