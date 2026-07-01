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
 * Toca una campana (tres "din" con dos armónicos y caída exponencial) al mayor
 * volumen posible por WebAudio. Respeta el permiso de sonido salvo `force`
 * (el botón "Probar" de /admin/permisos suena aunque esté desactivado).
 */
export function playAlertBell(force = false): void {
  if (!force && !isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume();
  const t0 = ctx.currentTime;
  [0, 0.38, 0.76].forEach((offset) => {
    const t = t0 + offset;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(i === 0 ? 1 : 0.45, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  });
}
