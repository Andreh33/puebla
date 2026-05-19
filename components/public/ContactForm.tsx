"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadSchema, type LeadInput } from "@/lib/validators";

type Props = {
  sourcePage?: string;
};

export function ContactForm({ sourcePage }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadInput>({
    resolver: zodResolver(LeadSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      sourcePage: sourcePage ?? "/contacto",
      gdprConsent: false as unknown as true,
      website: "",
    },
  });

  const gdprValue = watch("gdprConsent");

  async function onSubmit(values: LeadInput) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        let detail = "No se pudo enviar el mensaje. Inténtalo de nuevo en un minuto.";
        try {
          const data = (await res.json()) as { error?: string; message?: string };
          detail = data.error || data.message || detail;
        } catch {
          /* no-op */
        }
        toast.error(detail);
        return;
      }

      toast.success("¡Mensaje enviado! Te contestamos en breve.");
      reset();
    } catch {
      toast.error("Error de conexión. Revisa tu red y vuelve a intentarlo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 rounded-2xl border border-zs-border bg-white p-6 shadow-sm sm:p-8"
    >
      {/* Honeypot anti-spam, invisible para humanos */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website-hp">No rellenes este campo</label>
        <input
          id="website-hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Nombre <span className="text-zs-red-600">*</span>
          </Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Tu nombre"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p role="alert" className="text-xs text-zs-red-600">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email <span className="text-zs-red-600">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tucorreo@ejemplo.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p role="alert" className="text-xs text-zs-red-600">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono (opcional)</Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+34 600 00 00 00"
          aria-invalid={!!errors.phone}
          {...register("phone")}
        />
        {errors.phone && (
          <p role="alert" className="text-xs text-zs-red-600">
            {errors.phone.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">
          Mensaje <span className="text-zs-red-600">*</span>
        </Label>
        <Textarea
          id="message"
          rows={5}
          placeholder="Cuéntanos en qué podemos ayudarte: producto, talla, horario, lo que necesites."
          aria-invalid={!!errors.message}
          {...register("message")}
        />
        {errors.message && (
          <p role="alert" className="text-xs text-zs-red-600">
            {errors.message.message}
          </p>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-zs-surface/60 p-3">
        <Checkbox
          id="gdpr"
          checked={!!gdprValue}
          onCheckedChange={(v) => setValue("gdprConsent", v === true ? true : (false as unknown as true), { shouldValidate: true })}
        />
        <Label htmlFor="gdpr" className="text-xs leading-relaxed text-zs-ink/85">
          He leído y acepto la{" "}
          <Link href="/politica-privacidad" className="underline hover:text-zs-blue-700">
            política de privacidad
          </Link>
          . Trataremos tus datos para responder a tu consulta. No te enviaremos publicidad
          salvo que tú lo solicites expresamente.
        </Label>
      </div>
      {errors.gdprConsent && (
        <p role="alert" className="-mt-3 text-xs text-zs-red-600">
          {errors.gdprConsent.message as string}
        </p>
      )}

      <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? "Enviando…" : "Enviar mensaje"}
      </Button>
    </form>
  );
}
