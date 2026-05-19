"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addItem as storeAddItem,
  clear as storeClear,
  getCart,
  removeItem as storeRemoveItem,
  subscribe,
  totalItemsPure,
  totalPricePure,
  updateQty as storeUpdateQty,
  type CartItem,
} from "./store";

/**
 * Hook React para el carrito Phase-1.
 *
 * Hidratación SSR-safe: el estado inicial es siempre `[]` y `ready=false`. En
 * el primer effect (sólo cliente) leemos de localStorage y nos suscribimos a
 * cambios para sincronizar entre componentes y entre pestañas.
 */
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(getCart());
    setReady(true);
    const unsub = subscribe((next) => setItems(next));
    return () => {
      unsub();
    };
  }, []);

  const addItem = useCallback((item: CartItem) => {
    storeAddItem(item);
  }, []);

  const removeItem = useCallback((productId: string, size: string | null) => {
    storeRemoveItem(productId, size);
  }, []);

  const updateQty = useCallback(
    (productId: string, size: string | null, qty: number) => {
      storeUpdateQty(productId, size, qty);
    },
    [],
  );

  const clear = useCallback(() => {
    storeClear();
  }, []);

  return {
    items,
    /** True cuando ya leímos localStorage tras el primer render. */
    ready,
    count: totalItemsPure(items),
    total: totalPricePure(items),
    addItem,
    removeItem,
    updateQty,
    clear,
  };
}

export type { CartItem };
