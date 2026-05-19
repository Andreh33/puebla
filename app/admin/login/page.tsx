import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./_actions";

// Evita prerender estático (auth() requiere headers en request).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Iniciar sesión",
  robots: { index: false, follow: false },
};

function formatHourMinute(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildErrorMessage(
  error: string | undefined,
  resetAt: string | undefined,
): { variant: "error" | "warning"; message: string } | null {
  if (!error) return null;
  switch (error) {
    case "invalid":
      return {
        variant: "error",
        message:
          "Credenciales incorrectas. Si fallas 5 veces, tu cuenta se bloqueará durante 15 minutos.",
      };
    case "locked": {
      const at = resetAt ? Number(resetAt) : null;
      return {
        variant: "warning",
        message: at
          ? `Cuenta bloqueada hasta las ${formatHourMinute(at)}. Hemos detectado demasiados intentos.`
          : "Cuenta bloqueada por demasiados intentos. Vuelve a intentarlo en 15 minutos.",
      };
    }
    case "rate": {
      const at = resetAt ? Number(resetAt) : null;
      return {
        variant: "warning",
        message: at
          ? `Demasiados intentos desde tu IP. Inténtalo de nuevo a partir de las ${formatHourMinute(at)}.`
          : "Demasiados intentos desde tu IP. Espera 15 minutos.",
      };
    }
    case "disabled":
      return {
        variant: "warning",
        message:
          "Esta cuenta está deshabilitada. Contacta con el administrador del sistema.",
      };
    default:
      return {
        variant: "error",
        message: "Ha ocurrido un error inesperado. Vuelve a intentarlo.",
      };
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string; resetAt?: string }>;
}) {
  const sp = await searchParams;

  // Si ya hay sesión válida, redirigimos al panel (o al `from` original).
  // Tolerante a fallos de DB: si auth() lanza durante el bootstrap, mostramos
  // el formulario igualmente — el middleware ya protege /admin/**.
  // Evitamos bucles: si `from` apunta a /admin/login, lo descartamos.
  type LoginSession = { user?: { id: string; role: "OWNER" | "EDITOR" } };
  let session: LoginSession | null = null;
  try {
    session = (await auth()) as LoginSession | null;
  } catch (err) {
    console.warn("[login] auth() falló:", (err as Error).message);
  }

  if (session?.user) {
    const target =
      sp.from && !sp.from.startsWith("/admin/login") ? sp.from : "/admin";
    redirect(target);
  }

  const errorBox = buildErrorMessage(sp.error, sp.resetAt);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zs-surface p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.webp"
            alt="Zona Sport"
            width={270}
            height={186}
            priority
            className="h-16 w-auto"
          />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-zs-blue-900">
            Acceso administración
          </h1>
          <p className="mt-1 text-sm text-zs-muted">
            Introduce tus credenciales para continuar
          </p>
        </div>

        <div className="rounded-2xl border border-zs-border bg-white p-6 shadow-sm sm:p-8">
          {errorBox && (
            <div
              role="alert"
              aria-live="polite"
              className={
                errorBox.variant === "warning"
                  ? "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                  : "mb-4 rounded-lg border border-zs-red-200 bg-zs-red-50 p-3 text-sm text-zs-red-700"
              }
            >
              {errorBox.message}
            </div>
          )}
          <form action={loginAction} className="space-y-4" noValidate>
            <input type="hidden" name="from" value={sp.from ?? "/admin"} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                aria-describedby={errorBox ? "login-error" : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zs-muted">
          Acceso restringido. Los intentos quedan registrados.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TODO (fase 2): 2FA TOTP opcional para usuarios OWNER.
// Cuando se implemente, añadir a `AdminUser`:
//   totpSecret      String?
//   totpEnabledAt   DateTime?
//   totpRecoveryCodes Json?
// y un paso intermedio en `loginAction` que solicite el código de 6 dígitos
// tras validar la contraseña. Estado actual: NO implementado — la columna
// queda documentada para una futura migración.
// ---------------------------------------------------------------------------
