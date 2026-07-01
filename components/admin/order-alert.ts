import * as React from "react";

/**
 * Utilidades compartidas del aviso de pedido nuevo:
 *  - un evento de window para difundir el nº de pedidos nuevos (así el NavList
 *    del sidebar muestra el punto rojo sin volver a sondear), y
 *  - la preferencia de sonido (permiso "poder sonar", en /admin/permisos) +
 *    la campana WebAudio, con un AudioContext singleton por pestaña.
 */

export const NEW_ORDERS_EVENT = "zs:new-orders";
export const SOUND_KEY = "zs_admin_new_order_sound";
export const SOUND_VARIANT_KEY = "zs_admin_new_order_sound_variant";

/** Difunde el nº de pedidos nuevos a cualquier componente que escuche. */
export function broadcastNewOrders(count: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NEW_ORDERS_EVENT, { detail: count }));
}

/** Suscribe al contador de pedidos nuevos difundido por NewOrderWatcher. */
export function useNewOrderCount(): number {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    const handler = (e: Event) => {
      const c = (e as CustomEvent<number>).detail;
      setCount(typeof c === "number" && c > 0 ? c : 0);
    };
    window.addEventListener(NEW_ORDERS_EVENT, handler);
    return () => window.removeEventListener(NEW_ORDERS_EVENT, handler);
  }, []);
  return count;
}

/** ¿Está permitido que suene el aviso? (permiso guardado; por defecto sí). */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* localStorage no disponible */
  }
}

// --- Variantes de sonido (sintetizadas por WebAudio; sin ficheros) -----------

type Note = { t: number; freq: number; dur: number; type?: OscillatorType; peak?: number };
export type SoundVariant = { id: string; label: string; notes: Note[] };

/** 6 sonidos a elegir. Cada uno es una "partitura" de tonos con caída suave. */
export const SOUND_VARIANTS: SoundVariant[] = [
  {
    id: "campana",
    label: "Campana",
    notes: [0, 0.38, 0.76].flatMap((t) => [
      { t, freq: 880, dur: 0.55, peak: 1 },
      { t, freq: 1320, dur: 0.55, peak: 0.45 },
    ]),
  },
  {
    id: "timbre",
    label: "Timbre (din-don)",
    notes: [
      { t: 0, freq: 660, dur: 0.5, peak: 0.9 },
      { t: 0.5, freq: 523, dur: 0.75, peak: 0.9 },
    ],
  },
  {
    id: "ping",
    label: "Ping",
    notes: [{ t: 0, freq: 1568, dur: 0.35, peak: 0.9 }],
  },
  {
    id: "alarma",
    label: "Alarma (urgente)",
    notes: [0, 0.18, 0.36, 0.54].map((t) => ({ t, freq: 1000, dur: 0.12, type: "square" as const, peak: 0.8 })),
  },
  {
    id: "positivo",
    label: "Positivo (ascendente)",
    notes: [
      { t: 0, freq: 523, dur: 0.25, type: "triangle", peak: 0.9 },
      { t: 0.12, freq: 659, dur: 0.25, type: "triangle", peak: 0.9 },
      { t: 0.24, freq: 784, dur: 0.35, type: "triangle", peak: 0.9 },
    ],
  },
  {
    id: "bipbip",
    label: "Bip-bip",
    notes: [
      { t: 0, freq: 1200, dur: 0.1, type: "square", peak: 0.8 },
      { t: 0.18, freq: 1200, dur: 0.1, type: "square", peak: 0.8 },
    ],
  },
];

const DEFAULT_VARIANT = "campana";

export function getSoundVariant(): string {
  if (typeof window === "undefined") return DEFAULT_VARIANT;
  try {
    const v = window.localStorage.getItem(SOUND_VARIANT_KEY);
    return v && SOUND_VARIANTS.some((s) => s.id === v) ? v : DEFAULT_VARIANT;
  } catch {
    return DEFAULT_VARIANT;
  }
}

export function setSoundVariant(id: string): void {
  try {
    window.localStorage.setItem(SOUND_VARIANT_KEY, id);
  } catch {
    /* localStorage no disponible */
  }
}

let _ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  _ctx = new Ctor();
  return _ctx;
}

/** Desbloquea el audio dentro de un gesto del usuario (política de autoplay). */
export function unlockAudio(): void {
  void getCtx()?.resume();
}

/**
 * Reproduce el sonido de aviso elegido (o `variantId`) al mayor volumen posible
 * por WebAudio. Respeta el permiso de sonido salvo `force` (el botón "Probar" de
 * /admin/permisos suena aunque el aviso esté desactivado).
 */
export function playAlertBell(force = false, variantId?: string): void {
  if (!force && !isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume();
  const variant =
    SOUND_VARIANTS.find((s) => s.id === (variantId ?? getSoundVariant())) ?? SOUND_VARIANTS[0]!;
  const t0 = ctx.currentTime;
  for (const n of variant.notes) {
    const t = t0 + n.t;
    const dur = n.dur;
    const peak = n.peak ?? 0.9;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}
