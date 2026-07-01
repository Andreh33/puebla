"use client";

import * as React from "react";
import { Volume2, Play, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  isSoundEnabled,
  setSoundEnabled,
  getSoundVariant,
  setSoundVariant,
  playAlertBell,
  unlockAudio,
  SOUND_VARIANTS,
} from "@/components/admin/order-alert";

export function PermisosClient() {
  // Estado inicial coherente con SSR y ajustado al montar desde localStorage.
  const [sound, setSound] = React.useState(true);
  const [variant, setVariant] = React.useState("campana");
  React.useEffect(() => {
    setSound(isSoundEnabled());
    setVariant(getSoundVariant());
  }, []);

  function toggleSound(on: boolean) {
    setSound(on);
    setSoundEnabled(on);
    // Activar cuenta como gesto: desbloquea el audio y da un "din" de confirmación.
    if (on) {
      unlockAudio();
      playAlertBell(true);
    }
  }

  function chooseVariant(id: string) {
    setVariant(id);
    setSoundVariant(id);
    unlockAudio();
    playAlertBell(true, id); // preview del elegido (suena aunque esté en off)
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zs-blue-100 text-zs-blue-700">
                <Volume2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-zs-ink">Sonido de aviso de pedidos nuevos</p>
                <p className="mt-0.5 text-sm text-zs-muted">
                  Cuando entra un pedido por la web, suena el sonido elegido además del aviso rojo.
                  Desactívalo si prefieres solo el aviso visual.
                </p>
              </div>
            </div>
            <Switch checked={sound} onCheckedChange={toggleSound} aria-label="Permitir sonido" />
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
                      onClick={() => chooseVariant(v.id)}
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
                        playAlertBell(true, v.id);
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

          <p className="mt-3 text-xs text-zs-muted">
            Nota: por seguridad, los navegadores solo dejan sonar tras una primera interacción en la
            página, y el volumen depende del equipo. Ten el volumen del ordenador subido y la pestaña
            del panel abierta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
