"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageCircle, Save, ShieldOff, Trash2, Ban } from "lucide-react";
import { toast } from "sonner";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";
import {
  updateLeadStatus,
  updateLeadNotes,
  markLeadAsSpam,
  anonymizeLead,
  deleteLead,
} from "../_actions";

type LeadDto = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: LeadStatus;
  notes: string;
  message: string;
  productName: string | null;
};

export function LeadDetailClient({ lead }: { lead: LeadDto }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<LeadStatus>(lead.status);
  const [notes, setNotes] = React.useState(lead.notes);
  const [saving, setSaving] = React.useState(false);

  async function handleStatusChange(next: LeadStatus) {
    setStatus(next);
    const res = await updateLeadStatus(lead.id, next);
    if (!res.ok) {
      toast.error(res.error);
      setStatus(lead.status);
    } else {
      toast.success(`Estado: ${next}`);
      router.refresh();
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    const res = await updateLeadNotes(lead.id, notes);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
    } else {
      toast.success("Notas guardadas");
    }
  }

  async function handleMarkSpam() {
    const res = await markLeadAsSpam(lead.id);
    if (res.ok) {
      toast.success("Marcado como spam");
      router.push("/admin/leads");
    } else toast.error(res.error);
  }

  async function handleAnonymize() {
    const res = await anonymizeLead(lead.id);
    if (res.ok) {
      toast.success("Lead anonimizado");
      router.push("/admin/leads");
    } else toast.error(res.error);
  }

  async function handleDelete() {
    const res = await deleteLead(lead.id);
    if (res.ok) {
      toast.success("Lead eliminado");
      router.push("/admin/leads");
    } else toast.error(res.error);
  }

  const wpMessage = lead.productName
    ? WhatsAppMessages.product(lead.productName)
    : `Hola ${lead.name}, te contactamos desde Zona Sport en respuesta a tu mensaje.`;

  const wpHref = lead.phone
    ? whatsappUrl(wpMessage, lead.phone)
    : whatsappUrl(wpMessage);

  return (
    <div className="space-y-4 rounded-lg border border-zs-border bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zs-muted">
          Estado
        </label>
        <Select value={status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NEW">Nuevo</SelectItem>
            <SelectItem value="CONTACTED">Contactado</SelectItem>
            <SelectItem value="CLOSED">Cerrado</SelectItem>
            <SelectItem value="SPAM">Spam</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zs-muted">
          Notas internas
        </label>
        <Textarea
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          className="mt-2"
          size="sm"
          onClick={handleSaveNotes}
          disabled={saving}
          type="button"
        >
          <Save className="mr-2 h-4 w-4" />
          Guardar notas
        </Button>
      </div>

      <div className="space-y-2">
        <a
          href={wpHref}
          target="_blank"
          rel="noopener"
          className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Responder por WhatsApp
        </a>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleMarkSpam}
          type="button"
        >
          <Ban className="mr-2 h-4 w-4" /> Marcar como spam
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full" type="button">
              <ShieldOff className="mr-2 h-4 w-4" /> Anonimizar (RGPD)
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Anonimizar este lead?</AlertDialogTitle>
              <AlertDialogDescription>
                Se sustituirán nombre, email y teléfono por placeholders. El lead se
                marcará como CERRADO. Esta acción es irreversible y se usa para
                cumplir peticiones RGPD.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAnonymize}>
                Sí, anonimizar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full text-red-700" type="button">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar lead
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar lead?</AlertDialogTitle>
              <AlertDialogDescription>
                Borra completamente el registro de la base de datos. Si solo quieres
                ocultar PII, usa &quot;Anonimizar&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
