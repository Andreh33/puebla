/**
 * Cliente Resend con fallback no-op.
 *
 * Si `RESEND_API_KEY` no está configurada, no se lanza error: se devuelve un
 * cliente que loguea por consola y reporta `ok: false, skipped: true`. Así
 * los flujos críticos (creación de leads / newsletter) no se rompen en dev.
 */

import "server-only";
import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

const DEFAULT_FROM =
  process.env.RESEND_FROM || "Zona Sport <noreply@zonasport.es>";

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const client = getResend();
  if (!client) {
    console.warn("[email] RESEND_API_KEY no configurada — email no enviado:", {
      to: opts.to,
      subject: opts.subject,
    });
    return { ok: false, skipped: true };
  }
  try {
    const { data, error } = await client.emails.send({
      from: DEFAULT_FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
    });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] Resend exception:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
