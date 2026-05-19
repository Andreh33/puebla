/**
 * Email para el administrador cuando llega un lead nuevo.
 *
 * Devolvemos HTML en string (Resend acepta html: string). No usamos JSX
 * server-rendered porque añadiría dependencia de @react-email/render; con
 * strings es más portable y suficiente para el volumen actual.
 */

export interface LeadReceivedAdminProps {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  sourcePage?: string | null;
  productId?: string | null;
  adminUrl: string;
}

function escape(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function leadReceivedAdminHtml(p: LeadReceivedAdminProps): string {
  return `<!doctype html>
<html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5;padding:24px;background:#f8fafc">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
<h1 style="font-size:18px;margin:0 0 12px;color:#0c4a6e">Nuevo lead recibido</h1>
<p style="margin:0 0 16px;color:#475569;font-size:14px">Llegó un nuevo contacto a través de la web.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:6px 0;color:#64748b;width:120px">Nombre</td><td><strong>${escape(p.name)}</strong></td></tr>
<tr><td style="padding:6px 0;color:#64748b">Email</td><td><a href="mailto:${escape(p.email)}">${escape(p.email)}</a></td></tr>
${p.phone ? `<tr><td style="padding:6px 0;color:#64748b">Teléfono</td><td>${escape(p.phone)}</td></tr>` : ""}
${p.sourcePage ? `<tr><td style="padding:6px 0;color:#64748b">Página</td><td>${escape(p.sourcePage)}</td></tr>` : ""}
${p.productId ? `<tr><td style="padding:6px 0;color:#64748b">Producto</td><td>${escape(p.productId)}</td></tr>` : ""}
</table>
<div style="margin-top:16px;padding:12px;background:#f1f5f9;border-radius:8px;white-space:pre-wrap;font-size:14px">${escape(p.message)}</div>
<p style="margin-top:24px"><a href="${escape(p.adminUrl)}" style="display:inline-block;background:#0c4a6e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Abrir en el panel admin</a></p>
<p style="margin-top:24px;font-size:12px;color:#94a3b8">Este correo se envió automáticamente desde zonasport.es.</p>
</div>
</body></html>`;
}
