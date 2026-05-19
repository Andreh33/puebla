/**
 * Email de bienvenida a la newsletter de Zona Sport.
 */

export interface NewsletterWelcomeProps {
  email: string;
  doiUrl?: string;
}

function escape(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function newsletterWelcomeHtml(p: NewsletterWelcomeProps): string {
  return `<!doctype html>
<html lang="es"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.6;padding:24px;background:#f8fafc">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
<h1 style="font-size:18px;margin:0 0 12px;color:#0c4a6e">¡Bienvenido/a a Zona Sport!</h1>
<p style="font-size:14px">Te has suscrito con el email <strong>${escape(p.email)}</strong>. Te enviaremos novedades, ofertas y consejos deportivos. Sin spam, prometido.</p>
${p.doiUrl ? `<p style="margin-top:16px;font-size:14px">Para terminar de confirmar tu suscripción, pulsa aquí:</p><p><a href="${escape(p.doiUrl)}" style="display:inline-block;background:#0c4a6e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Confirmar suscripción</a></p>` : ""}
<p style="margin-top:24px;font-size:12px;color:#94a3b8">Puedes darte de baja en cualquier momento desde cualquier correo nuestro.</p>
</div>
</body></html>`;
}
