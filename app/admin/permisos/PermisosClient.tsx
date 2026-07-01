"use client";

import * as React from "react";
import { Volume2, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { isSoundEnabled, setSoundEnabled, playAlertBell, unlockAudio } from "@/components/admin/order-alert";

export function PermisosClient() {
  // Estado inicial coherente con SSR (true) y ajustado al montar desde localStorage.
  const [sound, setSound] = React.useState(true);
  React.useEffect(() => setSound(isSoundEnabled()), []);

  function toggleSound(on: boolean) {
    setSound(on);
    setSoundEnabled(on);
    // Activar cuenta como gesto: desbloquea el audio y da un "din" de confirmación.
    if (on) {
      unlockAudio();
      playAlertBell(true);
    }
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
                  Cuando entra un pedido por la web, suena una campana además del aviso rojo.
                  Desactívalo si prefieres solo el aviso visual.
                </p>
              </div>
            </div>
            <Switch checked={sound} onCheckedChange={toggleSound} aria-label="Permitir sonido" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zs-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                unlockAudio();
                playAlertBell(true);
              }}
            >
              <Play className="mr-1 h-4 w-4" /> Probar sonido
            </Button>
            <span className="text-xs text-zs-muted">
              {sound ? "El sonido está activado." : "El sonido está desactivado (solo aviso visual)."}
            </span>
          </div>

          <p className="mt-3 text-xs text-zs-muted">
            Nota: por seguridad, los navegadores solo dejan sonar tras una primera interacción en la
            página, y el volumen depende del equipo. Ten el volumen del ordenador subido.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
