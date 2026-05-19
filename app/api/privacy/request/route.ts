/**
 * POST /api/privacy/request
 *
 * Recibe peticiones RGPD (acceso / supresión) y crea un Lead con tag
 * `privacy-request:<type>` para que el admin las atienda manualmente desde
 * /admin/leads.
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const maxDuration = 30;

const RequestSchema = z.object({
  email: z.string().email("Email inválido"),
  type: z.enum(["access", "erasure", "rectification", "portability"]),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Datos inválidos" },
      { status: 400 },
    );
  }

  const ip = getClientIp(req);
  const rl = rateLimit(`privacy:${ip}`, { limit: 3, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes." },
      { status: 429 },
    );
  }

  const { email, type, notes } = parsed.data;

  try {
    const lead = await db.lead.create({
      data: {
        name: `Petición RGPD (${type})`,
        email: email.toLowerCase(),
        message:
          `Petición de ${type} bajo el RGPD.\n\n` +
          (notes ? `Notas del usuario:\n${notes}` : "Sin notas adicionales."),
        sourcePage: "/privacidad",
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") ?? null,
        gdprConsent: true,
        notes: `privacy-request:${type}`,
      },
    });

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `[Zona Sport] Petición RGPD (${type}) — ${email}`,
        html: `<p>Nueva petición RGPD: <strong>${type}</strong></p><p>De: ${email}</p><p>Notas: ${notes ?? "—"}</p><p>Lead ID: ${lead.id}</p>`,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/privacy/request] error", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo procesar la petición." },
      { status: 500 },
    );
  }
}
