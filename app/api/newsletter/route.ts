/**
 * POST /api/newsletter (público)
 *
 * - Valida con NewsletterSchema.
 * - Rate limit por IP 5/hour.
 * - Crea NewsletterSubscriber (upsert por email).
 * - Envía welcome via Resend si está configurado.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { NewsletterSchema } from "@/lib/validators";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/resend";
import { newsletterWelcomeHtml } from "@/lib/email/templates/newsletter-welcome";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const parsed = NewsletterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Datos inválidos",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const ip = getClientIp(req);
  const rl = rateLimit(`newsletter:${ip}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Inténtalo más tarde." },
      { status: 429 },
    );
  }

  const email = data.email.toLowerCase();
  try {
    await db.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        source: data.source || null,
      },
      update: {
        source: data.source || undefined,
        unsubscribedAt: null,
      },
    });
  } catch (err) {
    console.error("[api/newsletter] error", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar tu suscripción." },
      { status: 500 },
    );
  }

  try {
    await sendEmail({
      to: email,
      subject: "Bienvenido/a a Zona Sport",
      html: newsletterWelcomeHtml({ email }),
    });
  } catch (err) {
    console.warn("[api/newsletter] fallo enviando bienvenida", err);
  }

  return NextResponse.json({ ok: true });
}
