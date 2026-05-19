/**
 * POST /api/leads (público)
 *
 * - Valida con LeadSchema.
 * - Rate limit `lead:{ip}` 5/hour.
 * - Honeypot `website` lleno → 200 silencioso sin guardar.
 * - Crea Lead, envía 2 emails (admin + usuario) — los errores de email no
 *   tumban la respuesta.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { LeadSchema } from "@/lib/validators";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/resend";
import { leadReceivedAdminHtml } from "@/lib/email/templates/lead-received-admin";
import { leadConfirmationUserHtml } from "@/lib/email/templates/lead-confirmation-user";
import { absoluteUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(json);
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

  // Honeypot: si el bot rellenó el campo "website", devolvemos 200 sin guardar
  if (data.website && data.website.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`lead:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Inténtalo en una hora." },
      { status: 429 },
    );
  }

  let lead;
  try {
    lead = await db.lead.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        message: data.message,
        sourcePage: data.sourcePage || null,
        productId: data.productId || null,
        gdprConsent: data.gdprConsent,
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") ?? null,
      },
      select: { id: true, name: true, email: true, message: true },
    });
  } catch (err) {
    console.error("[api/leads] error creando lead", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo guardar tu mensaje. Inténtalo más tarde." },
      { status: 500 },
    );
  }

  // Emails — no bloquean la respuesta en caso de fallo
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const adminUrl = absoluteUrl(`/admin/leads/${lead.id}`);
  try {
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `[Zona Sport] Nuevo lead: ${lead.name}`,
        html: leadReceivedAdminHtml({
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: data.message,
          sourcePage: data.sourcePage,
          productId: data.productId,
          adminUrl,
        }),
        replyTo: data.email,
      });
    }
    await sendEmail({
      to: data.email,
      subject: "Hemos recibido tu mensaje · Zona Sport",
      html: leadConfirmationUserHtml({ name: data.name, message: data.message }),
    });
  } catch (err) {
    console.warn("[api/leads] fallo enviando emails (lead ya guardado)", err);
  }

  return NextResponse.json({ ok: true, id: lead.id });
}
