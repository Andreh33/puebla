"use client";

import * as React from "react";
import { Volume2, Play, Check, ShoppingCart, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  isSoundEnabled,
  setSoundEnabled,
  getSoundVariant,
  setSoundVariant,
  isResSoundEnabled,
  setResSoundEnabled,
  getResSoundVariant,
  setResSoundVariant,
  playVariant,
  unlockAudio,
  SOUND_VARIANTS,
} from "@/components/admin/order-alert";

type Channel = {
  title: string;
  desc: string;
  icon: React.ReactNode;
  isEnabled: () => boolean;
  setEnabled: (on: boolean) => void;
  getVariant: () => string;
  setVariant: (id: string) => void;
};

function SoundSection({ channel }: { channel: Channel }) {
  const [sound, setSound] = React.useState(true);
  const [variant, setVariantState] = React.useState("campana");
  React.useEffect(() => {
    setSound(channel.isEnabled());
    setVariantState(channel.getVariant());
  }, [channel]);

  function toggle(on: boolean) {
    setSound(on);
    channel.setEnabled(on);
    if (on) {
      unlockAudio();
      playVariant(channel.getVariant());
    }
  }

  function choose(id: string) {
    setVariantState(id);
    channel.setVariant(id);
    unlockAudio();
    playVariant(id);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zs-blue-100 text-zs-blue-700">
              {channel.icon}
            </span>
            <div>
              <p className="font-medium text-zs-ink">{channel.title}</p>
              <p className="mt-0.5 text-sm text-zs-muted">{channel.desc}</p>
            </div>
          </div>
          <Switch checked={sound} onCheckedChange={toggle} aria-label={`Permitir sonido: ${channel.title}`} />
        </div>

        <div className="mt-4 border-t border-zs-border pt-4">
          <p className="mb-2 text-sm font-semibold text-zs-ink">Elige el sonido</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SOUND_VARIANTS.map((v) => {
              const selected = variant === v.id;
              return (
                <div
                  key={v.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                    selected ? "border-zs-blue-500 bg-zs-blue-50" : "border-zs-border bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => choose(v.id)}
                    className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-zs-ink"
                  >
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                        selected ? "border-zs-blue-600 bg-zs-blue-600 text-white" : "border-zs-border text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {v.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      unlockAudio();
                      playVariant(v.id);
                    }}
                    aria-label={`Probar ${v.label}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zs-muted hover:bg-zs-surface hover:text-zs-blue-700"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PermisosClient() {
  const orders: Channel = {
    title: "Sonido de aviso de pedidos nuevos",
    desc: "Cuando entra un pedido por la web, suena el sonido elegido además del aviso rojo.",
    icon: <ShoppingCart className="h-5 w-5" />,
    isEnabled: isSoundEnabled,
    setEnabled: setSoundEnabled,
    getVariant: getSoundVariant,
    setVariant: setSoundVariant,
  };
  const reservations: Channel = {
    title: "Sonido de aviso de reservas por WhatsApp",
    desc: "Cuando alguien reserva por WhatsApp, suena este sonido además del aviso verde.",
    icon: <MessageCircle className="h-5 w-5" />,
    isEnabled: isResSoundEnabled,
    setEnabled: setResSoundEnabled,
    getVariant: getResSoundVariant,
    setVariant: setResSoundVariant,
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2 text-sm text-zs-muted">
        <Volume2 className="h-4 w-4" /> Avisos sonoros del panel
      </div>
      <SoundSection channel={orders} />
      <SoundSection channel={reservations} />
      <p className="text-xs text-zs-muted">
        Nota: por seguridad, los navegadores solo dejan sonar tras una primera interacción en la
        página, y el volumen depende del equipo. Ten el volumen del ordenador subido y la pestaña
        del panel abierta.
      </p>
    </div>
  );
}
