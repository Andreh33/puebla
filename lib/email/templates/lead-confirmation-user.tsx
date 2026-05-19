/**
 * Email de confirmación al usuario que envió el formulario de contacto.
 */

export interface LeadConfirmationUserProps {
  name: string;
  message: string;
}

function escape(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function leadConfirmationUserHtml(p: LeadConfirmationUserProps): string {
  return `<!doctype html>
<html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6;padding:24px;background:#f8fafc">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
<h1 style="font-size:18px;margin:0 0 12px;color:#0c4a6e">¡Hola ${escape(p.name)}! Hemos recibido tu mensaje</h1>
<p style="margin:0 0 12px;font-size:14px">Gracias por contactar con <strong>Zona Sport</strong>. Te responderemos lo antes posible en horario comercial.</p>
<p style="margin:0 0 6px;font-size:13px;color:#64748b">Mensaje recibido:</p>
<div style="padding:12px;background:#f1f5f9;border-radius:8px;white-space:pre-wrap;font-size:14px">${escape(p.message)}</div>
<p style="margin-top:24px;font-size:14px">Si tu consulta es urgente, escríbenos por WhatsApp:<br/>
<a href="https://wa.me/34689110691" style="color:#0c4a6e;font-weight:600">+34 689 110 691</a></p>
<p style="margin-top:24px;font-size:12px;color:#94a3b8">Zona Sport — Puebla de la Calzada (Badajoz). Si no fuiste tú quien envió este mensaje, ignora este correo.</p>
</div>
</body></html>`;
}
