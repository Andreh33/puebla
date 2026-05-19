import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Webhook, CreditCard, Key } from "lucide-react";

interface Props {
  missing: string[];
  envKeys: { secret: string; webhook: string; publishable: string };
  siteUrl: string;
}

/**
 * Pantalla que se muestra cuando STRIPE_SECRET_KEY no está definida.
 * Explica exactamente qué tres env vars añadir, qué hace cada una y qué
 * eventos de webhook hay que dar de alta en el dashboard Stripe.
 */
export function StripeNotConfigured({ missing, envKeys, siteUrl }: Props) {
  const webhookUrl = `${siteUrl.replace(/\/$/, "")}/api/stripe/webhook`;
  const events = [
    "checkout.session.completed",
    "charge.refunded",
    "payment_intent.payment_failed",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" aria-hidden />
            <CardTitle>TPV pendiente de activación</CardTitle>
          </div>
          <CardDescription>
            El módulo de pedidos está implementado y desplegado. Solo falta añadir
            las claves de Stripe en Vercel para activarlo. Cuando estén configuradas
            el sistema arrancará en el siguiente cold start — no hay que tocar
            código ni redeployar manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-zs-muted">
            Variables que faltan ahora mismo:
          </p>
          <div className="flex flex-wrap gap-2">
            {missing.length === 0 ? (
              <Badge variant="success">Ninguna — recarga la página</Badge>
            ) : (
              missing.map((v) => (
                <Badge key={v} variant="warning">
                  {v}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-zs-blue-700" aria-hidden />
              <CardTitle className="text-base">{envKeys.secret}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zs-muted">
              Clave secreta de la API server-side (formato{" "}
              <code className="rounded bg-zs-surface px-1 py-0.5 text-xs">
                sk_live_…
              </code>{" "}
              o{" "}
              <code className="rounded bg-zs-surface px-1 py-0.5 text-xs">
                sk_test_…
              </code>
              ). La saca del{" "}
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zs-blue-700 hover:underline"
              >
                dashboard Stripe → Developers → API keys
              </a>
              . Se usa para crear sesiones de Checkout y sincronizar productos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-zs-blue-700" aria-hidden />
              <CardTitle className="text-base">{envKeys.webhook}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zs-muted">
              Secreto de firma de webhooks (
              <code className="rounded bg-zs-surface px-1 py-0.5 text-xs">
                whsec_…
              </code>
              ). Se obtiene al crear un endpoint de webhook que apunte a:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-zs-surface p-2 text-xs">
              {webhookUrl}
            </pre>
            <p className="mt-2 text-xs text-zs-muted">
              Marca estos eventos al crear el endpoint:
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-zs-ink">
              {events.map((e) => (
                <li key={e}>
                  <code>{e}</code>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-zs-blue-700" aria-hidden />
              <CardTitle className="text-base">{envKeys.publishable}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zs-muted">
              Clave pública (
              <code className="rounded bg-zs-surface px-1 py-0.5 text-xs">
                pk_live_…
              </code>
              ) que se incrusta en el cliente para montar Elements o redirigir a
              Checkout. Es{" "}
              <strong>pública</strong> — puede salir en el HTML — pero debe
              corresponder al mismo modo (live/test) que la clave secreta.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pasos exactos para activar</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-zs-ink">
            <li>
              Crea cuenta en{" "}
              <a
                href="https://dashboard.stripe.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zs-blue-700 hover:underline"
              >
                stripe.com
              </a>{" "}
              y completa el alta de empresa (NIF, IBAN, datos fiscales).
            </li>
            <li>
              Saca <code>{envKeys.secret}</code> y <code>{envKeys.publishable}</code>{" "}
              de <em>Developers → API keys</em>.
            </li>
            <li>
              Crea un endpoint en <em>Developers → Webhooks → Add endpoint</em>{" "}
              con la URL <code>{webhookUrl}</code> y selecciona los 3 eventos
              listados arriba. Copia el <code>{envKeys.webhook}</code> revelado.
            </li>
            <li>
              En Vercel → Project Settings → Environment Variables, añade las 3
              variables a los entornos <em>Production</em> (y opcionalmente{" "}
              <em>Preview</em>).
            </li>
            <li>
              Redeploy (o espera al siguiente push). En el siguiente cold start
              esta pantalla desaparece y aparece la tabla de pedidos.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
